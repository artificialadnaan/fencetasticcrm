import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, dateFnsLocalizer, View, NavigateAction } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { useCalendarEvents, type CalendarEvent } from '@/hooks/use-calendar-events';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';

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

// --- Event types ---
const EVENT_TYPES = [
  { label: 'Estimate', value: 'estimate', color: '#3B82F6' },
  { label: 'Follow-Up', value: 'followup', color: '#F59E0B' },
  { label: 'Install', value: 'install', color: '#10B981' },
  { label: 'Project Start', value: 'project_start', color: '#8B5CF6' },
  { label: 'Project Finish', value: 'project_finish', color: '#6B7280' },
  { label: 'Meeting', value: 'meeting', color: '#EC4899' },
  { label: 'Site Visit', value: 'site_visit', color: '#F97316' },
  { label: 'Other', value: 'other', color: '#6366F1' },
];

const COLOR_OPTIONS = [
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Amber', value: '#F59E0B' },
  { label: 'Green', value: '#10B981' },
  { label: 'Purple', value: '#8B5CF6' },
  { label: 'Gray', value: '#6B7280' },
  { label: 'Pink', value: '#EC4899' },
  { label: 'Orange', value: '#F97316' },
  { label: 'Indigo', value: '#6366F1' },
  { label: 'Red', value: '#EF4444' },
];

// --- Legend (all event types) ---
const LEGEND = [
  { label: 'Estimate Given', color: '#3B82F6' },
  { label: 'Follow-Up Reminder', color: '#F59E0B' },
  { label: 'Scheduled Install', color: '#10B981' },
  { label: 'Project Start', color: '#8B5CF6' },
  { label: 'Project Finish', color: '#6B7280' },
  { label: 'Meeting', color: '#EC4899' },
  { label: 'Site Visit', color: '#F97316' },
  { label: 'Other', color: '#6366F1' },
];

interface ProjectOption {
  id: string;
  customer: string;
  address: string;
}

// Expand a YYYY-MM-DD string to a local midnight Date (avoids UTC off-by-one)
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

const EMPTY_FORM = {
  title: '',
  date: '',
  endDate: '',
  eventType: 'estimate',
  color: '#3B82F6',
  projectId: '',
  notes: '',
};

export default function CalendarPage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>('month');

  // Add Event dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Projects list for optional project link
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  const [projectSearch, setProjectSearch] = useState('');

  useEffect(() => {
    api.get('/projects?limit=500&sortBy=customer&sortDir=asc').then((res) => {
      const raw = res.data?.data ?? res.data ?? [];
      const arr = Array.isArray(raw) ? raw : [];
      setProjects(arr.map((p: { id: string; customer: string; address: string }) => ({
        id: p.id,
        customer: p.customer,
        address: p.address,
      })));
    }).catch((err) => {
      console.error('Failed to fetch projects for dropdown:', err);
    });
  }, []);

  // Compute the visible date range based on current month +/- 1 buffer
  const rangeStart = useMemo(() => startOfMonth(subMonths(currentDate, 1)), [currentDate]);
  const rangeEnd = useMemo(() => endOfMonth(addMonths(currentDate, 1)), [currentDate]);

  const { events, isLoading, error, refetch: refetchEvents } = useCalendarEvents(rangeStart, rangeEnd);

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

  // Click event → project detail (only for project-linked events)
  const handleSelectEvent = (event: RbcEvent) => {
    if (event.resource.projectId) {
      navigate(`/projects/${event.resource.projectId}`);
    }
  };

  // Open Add Event dialog with the clicked date pre-filled
  const openDialog = (dateStr?: string) => {
    setForm({
      ...EMPTY_FORM,
      date: dateStr ?? format(new Date(), 'yyyy-MM-dd'),
    });
    setSaveError(null);
    setDialogOpen(true);
  };

  const handleSelectSlot = (slot: { start: Date }) => {
    openDialog(format(slot.start, 'yyyy-MM-dd'));
  };

  const handleNavigate = (newDate: Date, _view: View, _action: NavigateAction) => {
    setCurrentDate(newDate);
  };

  const handleViewChange = (newView: View) => {
    setView(newView);
  };

  const handleEventTypeChange = (value: string) => {
    const et = EVENT_TYPES.find((t) => t.value === value);
    setForm((f) => ({ ...f, eventType: value, color: et?.color ?? f.color }));
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.date || !form.eventType) {
      setSaveError('Title, date, and event type are required.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await api.post('/calendar/events', {
        title: form.title.trim(),
        date: form.date,
        endDate: form.endDate || null,
        eventType: form.eventType,
        color: form.color,
        projectId: form.projectId || null,
        notes: form.notes || null,
      });
      setDialogOpen(false);
      refetchEvents();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save event';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground mt-1">
            Schedule installs, estimates, and follow-ups.
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-1" />Add Event
        </Button>
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

      {/* Add Event Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setSaveError(null); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add Calendar Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="event-title">Title</Label>
              <Input
                id="event-title"
                placeholder="Event title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            {/* Date + End Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="event-date">Date</Label>
                <Input
                  id="event-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="event-end-date">End Date (optional)</Label>
                <Input
                  id="event-end-date"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Event Type */}
            <div className="space-y-1.5">
              <Label>Event Type</Label>
              <Select value={form.eventType} onValueChange={handleEventTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Color */}
            <div className="space-y-1.5">
              <Label>Color</Label>
              <Select value={form.color} onValueChange={(v) => setForm((f) => ({ ...f, color: v }))}>
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: form.color }}
                      />
                      {COLOR_OPTIONS.find((c) => c.value === form.color)?.label ?? form.color}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: c.value }}
                        />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project link (optional, searchable) */}
            <div className="space-y-1.5">
              <Label>Link to Project (optional)</Label>
              {form.projectId ? (
                <div className="flex items-center gap-2 border rounded-md px-3 py-2 text-sm">
                  <span className="flex-1 truncate">
                    {projects.find((p) => p.id === form.projectId)?.customer ?? 'Selected project'} — {projects.find((p) => p.id === form.projectId)?.address ?? ''}
                  </span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground text-xs"
                    onClick={() => { setForm((f) => ({ ...f, projectId: '' })); setProjectSearch(''); }}
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    placeholder="Search by customer or address..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                  />
                  {projectSearch.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 border rounded-md bg-popover shadow-md max-h-48 overflow-y-auto">
                      {projects
                        .filter((p) => {
                          const q = projectSearch.toLowerCase();
                          return p.customer.toLowerCase().includes(q) || p.address.toLowerCase().includes(q);
                        })
                        .slice(0, 20)
                        .map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                            onClick={() => {
                              setForm((f) => ({ ...f, projectId: p.id }));
                              setProjectSearch('');
                            }}
                          >
                            <span className="font-medium">{p.customer}</span>
                            <span className="text-muted-foreground"> — {p.address}</span>
                          </button>
                        ))}
                      {projects.filter((p) => {
                        const q = projectSearch.toLowerCase();
                        return p.customer.toLowerCase().includes(q) || p.address.toLowerCase().includes(q);
                      }).length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No projects found</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="event-notes">Notes (optional)</Label>
              <Textarea
                id="event-notes"
                placeholder="Any additional notes..."
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            {saveError && (
              <p className="text-sm text-destructive">{saveError}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Event'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Calendar */}
      <div
        className="relative rounded-xl border bg-card shadow-sm overflow-hidden"
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
