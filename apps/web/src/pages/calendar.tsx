import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, dateFnsLocalizer, View, NavigateAction } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { useCalendarEvents, type CalendarEvent } from '@/hooks/use-calendar-events';

// --- date-fns localizer ---
const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

// --- Types for react-big-calendar ---
interface RbcEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: CalendarEvent;
}

// --- Legend ---
const LEGEND = [
  { label: 'Estimate Given', color: '#3B82F6' },
  { label: 'Follow-Up Reminder', color: '#F59E0B' },
  { label: 'Scheduled Install', color: '#10B981' },
  { label: 'Project Completed', color: '#6B7280' },
] as const;

// Expand a YYYY-MM-DD string to a local midnight Date (avoids UTC off-by-one)
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>('month');

  // Compute the visible date range based on current month +/- 1 buffer
  const rangeStart = useMemo(() => startOfMonth(subMonths(currentDate, 1)), [currentDate]);
  const rangeEnd = useMemo(() => endOfMonth(addMonths(currentDate, 1)), [currentDate]);

  const { events, isLoading, error } = useCalendarEvents(rangeStart, rangeEnd);

  // Transform API events to react-big-calendar format
  const rbcEvents: RbcEvent[] = useMemo(
    () =>
      events.map((e) => ({
        id: e.id,
        title: e.title,
        start: parseLocalDate(e.start),
        end: parseLocalDate(e.end),
        resource: e,
      })),
    [events]
  );

  // Color events by type
  const eventStyleGetter = (event: RbcEvent) => {
    const color = event.resource.color;
    return {
      style: {
        backgroundColor: color,
        borderColor: color,
        color: '#ffffff',
        borderRadius: '4px',
        border: 'none',
        fontSize: '0.75rem',
        padding: '1px 4px',
      },
    };
  };

  // Click event → project detail
  const handleSelectEvent = (event: RbcEvent) => {
    navigate(`/projects/${event.resource.projectId}`);
  };

  // Click empty slot → create new project
  const handleSelectSlot = ({ start }: { start: Date }) => {
    const dateStr = format(start, 'yyyy-MM-dd');
    navigate(`/projects/new?installDate=${dateStr}`);
  };

  // Navigate between months/weeks/days
  const handleNavigate = (newDate: Date, _view: View, _action: NavigateAction) => {
    setCurrentDate(newDate);
  };

  const handleViewChange = (newView: View) => {
    setView(newView);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground mt-1">
          Schedule installs, estimates, and follow-ups.
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {LEGEND.map(({ label, color }) => (
          <div key={label} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load calendar events: {error}
        </div>
      )}

      {/* Calendar */}
      <div
        className="rounded-xl border bg-card shadow-sm overflow-hidden"
        style={{ height: 680 }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/40 pointer-events-none">
            <span className="text-sm text-muted-foreground animate-pulse">Loading events…</span>
          </div>
        )}
        <div className="p-4 h-full [&_.rbc-calendar]:h-full [&_.rbc-toolbar]:mb-4 [&_.rbc-toolbar_button]:rounded-md [&_.rbc-toolbar_button]:px-3 [&_.rbc-toolbar_button]:py-1.5 [&_.rbc-toolbar_button]:text-sm [&_.rbc-toolbar_button]:border [&_.rbc-toolbar_button]:border-border [&_.rbc-toolbar_button:hover]:bg-accent [&_.rbc-toolbar_button.rbc-active]:bg-primary [&_.rbc-toolbar_button.rbc-active]:text-primary-foreground [&_.rbc-toolbar_button.rbc-active]:border-primary [&_.rbc-header]:py-2 [&_.rbc-header]:text-sm [&_.rbc-header]:font-medium [&_.rbc-today]:bg-primary/10 [&_.rbc-off-range-bg]:bg-muted/30 [&_.rbc-event]:cursor-pointer [&_.rbc-event:focus]:outline-none [&_.rbc-slot-selection]:bg-primary/20">
          <Calendar
            localizer={localizer}
            events={rbcEvents}
            startAccessor="start"
            endAccessor="end"
            view={view}
            date={currentDate}
            onNavigate={handleNavigate}
            onView={handleViewChange}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            eventPropGetter={eventStyleGetter}
            popup
            showMultiDayTimes
            formats={{
              monthHeaderFormat: (date: Date) => format(date, 'MMMM yyyy'),
              dayHeaderFormat: (date: Date) => format(date, 'EEEE, MMMM d'),
              dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
                `${format(start, 'MMMM d')} – ${format(end, 'MMMM d, yyyy')}`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
