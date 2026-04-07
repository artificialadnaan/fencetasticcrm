import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays, Clock3, Plus, CalendarRange } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import type { CalendarEventView } from './calendar-types';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

interface CalendarMonthGridProps {
  currentDate: Date;
  events: CalendarEventView[];
  isLoading: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onSelectDate: (date: Date) => void;
  onSelectEvent: (event: CalendarEventView) => void;
  onCreateEvent: () => void;
}

export function CalendarMonthGrid({
  currentDate,
  events,
  isLoading,
  onPrevMonth,
  onNextMonth,
  onToday,
  onSelectDate,
  onSelectEvent,
  onCreateEvent,
}: CalendarMonthGridProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const eventsByDay = new Map<string, CalendarEventView[]>();
  for (const event of events) {
    const eventStart = toDate(event.start);
    const eventEnd = toDate(event.end ?? event.start);
    for (const day of eachDayOfInterval({
      start: eventStart,
      end: eventEnd < eventStart ? eventStart : eventEnd,
    })) {
      const key = format(day, 'yyyy-MM-dd');
      const list = eventsByDay.get(key) ?? [];
      list.push(event);
      eventsByDay.set(key, list);
    }
  }

  return (
    <section className="shell-panel rounded-[32px] p-4 md:p-6">
      <div className="flex flex-col gap-4 border-b border-black/5 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Command Timeline
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Month view of installs, estimate follow-ups, and project events, with live search and client-side project lookup.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={onPrevMonth}
            className="rounded-2xl border-black/10 bg-white/70 px-4 shadow-sm"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={onToday}
            className="rounded-2xl border-black/10 bg-white/70 px-4 shadow-sm"
          >
            <CalendarRange className="h-4 w-4" />
            Today
          </Button>
          <Button
            variant="outline"
            onClick={onNextMonth}
            className="rounded-2xl border-black/10 bg-white/70 px-4 shadow-sm"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            onClick={onCreateEvent}
            className="rounded-2xl bg-slate-950 px-4 text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Add Event
          </Button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600">
        <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-sky-700">
          <CalendarDays className="h-3.5 w-3.5" />
          {events.length} visible events
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-slate-700">
          <Clock3 className="h-3.5 w-3.5" />
          Tap a day to add, tap a custom event to edit
        </span>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-px overflow-hidden rounded-[28px] border border-black/5 bg-slate-200/70">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="bg-white/90 px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            {label}
          </div>
        ))}

        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayEvents = (eventsByDay.get(key) ?? []).slice().sort((a, b) => a.title.localeCompare(b.title));
          const dayHasEvents = dayEvents.length > 0;

          return (
            <div
              key={key}
              className={cn(
                'min-h-[140px] bg-white px-3 py-3 transition-colors',
                isSameMonth(day, currentDate) ? 'text-slate-900' : 'bg-slate-50 text-slate-400'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  className={cn(
                    'inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-semibold transition-colors',
                    isToday(day)
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-slate-100'
                  )}
                  onClick={() => onSelectDate(day)}
                  aria-label={`Create event on ${formatDate(key)}`}
                >
                  {format(day, 'd')}
                </button>
                {isToday(day) && (
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Today
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-2">
                {dayHasEvents ? (
                  dayEvents.slice(0, 3).map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onSelectEvent(event)}
                      className="block w-full rounded-[18px] border border-black/5 bg-white px-3 py-2 text-left shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: event.color }}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-slate-950">
                            {event.title}
                          </p>
                          <p className="mt-1 truncate text-[11px] text-slate-500">
                            {event.projectCustomer
                              ? `${event.projectCustomer}${event.projectAddress ? ` • ${event.projectAddress}` : ''}`
                              : 'Standalone calendar event'}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-[18px] border border-dashed border-slate-300 bg-slate-50 px-3 py-5 text-center text-[11px] leading-5 text-slate-500">
                    Quiet day
                  </div>
                )}

                {dayEvents.length > 3 && (
                  <button
                    type="button"
                    className="w-full rounded-full bg-slate-100 px-3 py-2 text-center text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-200"
                    onClick={() => onSelectDate(day)}
                  >
                    +{dayEvents.length - 3} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isLoading && (
        <div className="mt-5 rounded-[28px] border border-dashed border-slate-300 bg-white/55 px-6 py-8 text-center text-sm text-slate-500">
          Loading calendar events...
        </div>
      )}
    </section>
  );
}
