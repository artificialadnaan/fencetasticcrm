import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addMonths,
  endOfMonth,
  format,
  isWithinInterval,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { Filter, Plus, Search, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useCalendarEvents } from '@/hooks/use-calendar-events';
import { usePageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CalendarMonthGrid } from '@/components/calendar/redesign/calendar-month-grid';
import { CalendarSideInsights } from '@/components/calendar/redesign/calendar-side-insights';
import type { CalendarEventView } from '@/components/calendar/redesign/calendar-types';

interface ProjectOption {
  id: string;
  customer: string;
  address: string;
}

const EVENT_TYPES = [
  { label: 'All Types', value: 'ALL' },
  { label: 'Estimate', value: 'estimate' },
  { label: 'Follow-Up', value: 'followup' },
  { label: 'Install', value: 'install' },
  { label: 'Project Start', value: 'project_start' },
  { label: 'Project Finish', value: 'project_finish' },
  { label: 'Meeting', value: 'meeting' },
  { label: 'Site Visit', value: 'site_visit' },
  { label: 'Other', value: 'other' },
] as const;

const LEGEND = [
  { label: 'Estimate Given', color: '#3B82F6' },
  { label: 'Follow-Up Reminder', color: '#F59E0B' },
  { label: 'Scheduled Install', color: '#10B981' },
  { label: 'Project Start', color: '#8B5CF6' },
  { label: 'Project Finish', color: '#6B7280' },
  { label: 'Meeting', color: '#EC4899' },
  { label: 'Site Visit', color: '#F97316' },
  { label: 'Other', color: '#6366F1' },
] as const;

const EVENT_COLORS: Record<string, string> = {
  estimate: '#3B82F6',
  followup: '#F59E0B',
  install: '#10B981',
  project_start: '#8B5CF6',
  project_finish: '#6B7280',
  meeting: '#EC4899',
  site_visit: '#F97316',
  other: '#6366F1',
};

const DEFAULT_FORM = {
  title: '',
  date: '',
  endDate: '',
  eventType: 'estimate',
  color: '#3B82F6',
  projectId: '',
  notes: '',
};

function toLocalDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getEventColor(eventType: string) {
  return EVENT_COLORS[eventType] ?? '#3B82F6';
}

function isDerivedProjectEvent(event: CalendarEventView) {
  return event.id.startsWith('estimate-')
    || event.id.startsWith('followup-')
    || event.id.startsWith('install-')
    || event.id.startsWith('completed-');
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | string>('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventView | null>(null);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectSearch, setProjectSearch] = useState('');
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);

  const deferredSearch = useDeferredValue(searchText.trim().toLowerCase());

  useEffect(() => {
    api.get('/projects?limit=500&sortBy=customer&sortDir=asc')
      .then((res) => {
        const raw = res.data?.data ?? res.data ?? [];
        const arr = Array.isArray(raw) ? raw : [];
        setProjects(
          arr.map((project: { id: string; customer: string; address: string }) => ({
            id: project.id,
            customer: project.customer,
            address: project.address,
          }))
        );
      })
      .catch((err) => {
        console.error('Failed to load projects for calendar lookup', err);
      });
  }, []);

  const projectLookup = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);

  const rangeStart = useMemo(() => startOfMonth(subMonths(currentDate, 1)), [currentDate]);
  const rangeEnd = useMemo(() => endOfMonth(addMonths(currentDate, 1)), [currentDate]);

  const { events, isLoading, error, refetch } = useCalendarEvents(rangeStart, rangeEnd);

  const calendarEvents = useMemo<CalendarEventView[]>(
    () =>
      events.map((event) => {
        const project = event.projectId ? projectLookup.get(event.projectId) : undefined;
        const customer = project?.customer ?? '';
        const address = project?.address ?? '';
        const searchTextValue = [event.title, event.type, customer, address].filter(Boolean).join(' ').toLowerCase();

        return {
          ...event,
          projectCustomer: customer,
          projectAddress: address,
          searchText: searchTextValue,
        };
      }),
    [events, projectLookup]
  );

  const filteredEvents = useMemo(() => {
    return calendarEvents.filter((event) => {
      const matchesType = typeFilter === 'ALL' || event.type === typeFilter;
      const matchesSearch = !deferredSearch || event.searchText.includes(deferredSearch);
      return matchesType && matchesSearch;
    });
  }, [calendarEvents, deferredSearch, typeFilter]);

  const monthEvents = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    return filteredEvents.filter((event) =>
      isWithinInterval(toLocalDate(event.start), { start: monthStart, end: monthEnd })
    );
  }, [currentDate, filteredEvents]);

  const openCreateDialog = useCallback((dateStr?: string) => {
    setEditingEvent(null);
    setForm({
      ...DEFAULT_FORM,
      date: dateStr ?? format(new Date(), 'yyyy-MM-dd'),
    });
    setProjectSearch('');
    setSaveError(null);
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((event: CalendarEventView) => {
    setEditingEvent(event);
    setForm({
      title: event.title,
      date: event.start,
      endDate: event.end && event.end !== event.start ? event.end : '',
      eventType: event.type,
      color: event.color,
      projectId: event.projectId,
      notes: event.notes ?? '',
    });
    setProjectSearch(event.projectCustomer ? `${event.projectCustomer}${event.projectAddress ? ` - ${event.projectAddress}` : ''}` : '');
    setSaveError(null);
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingEvent(null);
    setSaveError(null);
    setProjectDropdownOpen(false);
    setConfirmDelete(false);
  }, []);

  const handleEventClick = useCallback((event: CalendarEventView) => {
    if (event.projectId && isDerivedProjectEvent(event)) {
      navigate(`/projects/${event.projectId}`);
      return;
    }
    openEditDialog(event);
  }, [navigate, openEditDialog]);

  const handleSave = useCallback(async () => {
    if (!form.title.trim() || !form.date || !form.eventType) {
      setSaveError('Title, date, and event type are required.');
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const payload = {
        title: form.title.trim(),
        date: form.date,
        endDate: form.endDate || null,
        eventType: form.eventType,
        color: form.color,
        projectId: form.projectId || null,
        notes: form.notes || null,
      };

      if (editingEvent) {
        await api.patch(`/calendar/events/${editingEvent.id}`, payload);
      } else {
        await api.post('/calendar/events', payload);
      }

      await refetch();
      closeDialog();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setSaving(false);
    }
  }, [closeDialog, editingEvent, form, refetch]);

  const handleDelete = useCallback(async () => {
    if (!editingEvent) return;
    setSaving(true);
    setSaveError(null);

    try {
      await api.delete(`/calendar/events/${editingEvent.id}`);
      await refetch();
      closeDialog();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to delete event');
    } finally {
      setSaving(false);
    }
  }, [closeDialog, editingEvent, refetch]);

  const clearFilters = useCallback(() => {
    setSearchText('');
    setTypeFilter('ALL');
  }, []);

  const searchSlot = useMemo(() => {
    const hasFilters = Boolean(searchText.trim() || typeFilter !== 'ALL');

    return (
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:w-[300px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search events or projects..."
            className="h-10 rounded-2xl border-black/10 bg-white/80 pl-10 shadow-sm placeholder:text-slate-400"
          />
        </div>

        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value)}>
          <SelectTrigger className="h-10 w-full rounded-2xl border-black/10 bg-white/80 shadow-sm sm:w-[190px]">
            <Filter className="mr-2 h-4 w-4 text-slate-500" />
            <SelectValue placeholder="Filter View" />
          </SelectTrigger>
          <SelectContent>
            {EVENT_TYPES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            onClick={clearFilters}
            className="h-10 rounded-2xl border border-black/5 bg-white/60 px-4 text-slate-700 shadow-sm hover:bg-white"
          >
            <X className="h-4 w-4" />
            Reset
          </Button>
        )}
      </div>
    );
  }, [clearFilters, searchText, typeFilter]);

  usePageShell({
    eyebrow: 'Field Schedule',
    title: 'Calendar',
    subtitle: 'Schedule installs, estimates, and follow-ups with a live month view and direct project lookup.',
    searchSlot,
    primaryActions: (
      <Button
        type="button"
        onClick={() => openCreateDialog()}
        className="rounded-2xl bg-slate-950 px-4 text-white hover:bg-slate-800"
      >
        <Plus className="h-4 w-4" />
        Add Event
      </Button>
    ),
    secondaryActions: (
      <Button
        type="button"
        variant="outline"
        onClick={() => setCurrentDate(new Date())}
        className="rounded-2xl border-black/10 bg-white/70 px-4 shadow-sm"
      >
        Today
      </Button>
    ),
  });

  const visibleCount = monthEvents.length;
  const projectLinkedCount = monthEvents.filter((event) => event.projectId).length;
  const customCount = visibleCount - projectLinkedCount;

  const editDialogTitle = editingEvent ? 'Edit Calendar Event' : 'Add Calendar Event';

  return (
    <div className="space-y-6">
      <section className="shell-panel rounded-[32px] p-5 md:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Central Region Operations
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Month-by-month installs, estimate reminders, and custom schedule notes. Custom events can be created and edited directly from the calendar.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-black/5 bg-white/70 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Visible Events</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{visibleCount}</p>
            </div>
            <div className="rounded-[24px] border border-black/5 bg-white/70 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Project Linked</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{projectLinkedCount}</p>
            </div>
            <div className="rounded-[24px] border border-black/5 bg-slate-950 px-4 py-3 text-white">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">Custom Events</p>
              <p className="mt-2 text-lg font-semibold">{customCount}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {LEGEND.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>

        {error && (
          <div className="mt-5 rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Failed to load calendar events: {error}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.7fr)]">
        <CalendarMonthGrid
          currentDate={currentDate}
          events={monthEvents}
          isLoading={isLoading}
          onPrevMonth={() => setCurrentDate((value) => subMonths(value, 1))}
          onNextMonth={() => setCurrentDate((value) => addMonths(value, 1))}
          onToday={() => setCurrentDate(new Date())}
          onSelectDate={(date) => openCreateDialog(format(date, 'yyyy-MM-dd'))}
          onSelectEvent={handleEventClick}
          onCreateEvent={() => openCreateDialog()}
        />

        <CalendarSideInsights
          currentDate={currentDate}
          events={filteredEvents}
          isLoading={isLoading}
          onOpenEvent={handleEventClick}
          onViewFullSchedule={() => setCurrentDate(new Date())}
        />
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setSaveError(null);
            setEditingEvent(null);
            setProjectDropdownOpen(false);
          }
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[28px] border-black/5 bg-white p-0 shadow-2xl sm:max-w-[720px]">
          <div className="border-b border-black/5 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-2xl tracking-[-0.04em] text-slate-950">
                {editDialogTitle}
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.9fr)]">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="event-title">Title</Label>
                <Input
                  id="event-title"
                  placeholder="Event title"
                  value={form.title}
                  onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="event-date">Date</Label>
                  <Input
                    id="event-date"
                    type="date"
                    value={form.date}
                    onChange={(event) => setForm((value) => ({ ...value, date: event.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="event-end-date">End Date</Label>
                  <Input
                    id="event-end-date"
                    type="date"
                    value={form.endDate}
                    onChange={(event) => setForm((value) => ({ ...value, endDate: event.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Event Type</Label>
                <Select
                  value={form.eventType}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      eventType: value,
                      color: getEventColor(value),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.filter((item) => item.value !== 'ALL').map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Project Link</Label>
                {form.projectId ? (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-slate-50 px-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-950">
                        {projects.find((project) => project.id === form.projectId)?.customer ?? 'Selected project'}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {projects.find((project) => project.id === form.projectId)?.address ?? ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-medium text-slate-600 hover:text-slate-950"
                      onClick={() => {
                        setForm((value) => ({ ...value, projectId: '' }));
                        setProjectSearch('');
                      }}
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      placeholder="Search or select a project..."
                      value={projectSearch}
                      onChange={(event) => setProjectSearch(event.target.value)}
                      onFocus={() => setProjectDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setProjectDropdownOpen(false), 200)}
                    />
                    {projectDropdownOpen && (
                      <div className="absolute z-50 mt-2 max-h-52 w-full overflow-y-auto rounded-2xl border border-black/10 bg-white shadow-xl">
                        {(() => {
                          const query = projectSearch.trim().toLowerCase();
                          const filtered = query
                            ? projects.filter((project) =>
                                project.customer.toLowerCase().includes(query) ||
                                project.address.toLowerCase().includes(query)
                              )
                            : projects;
                          const visible = filtered.slice(0, 20);

                          if (visible.length === 0) {
                            return <div className="px-4 py-3 text-sm text-slate-500">No projects found</div>;
                          }

                          return visible.map((project) => (
                            <button
                              key={project.id}
                              type="button"
                              className="flex w-full flex-col items-start gap-1 px-4 py-3 text-left text-sm transition-colors hover:bg-slate-50"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setForm((value) => ({ ...value, projectId: project.id }));
                                setProjectSearch(`${project.customer} — ${project.address}`);
                                setProjectDropdownOpen(false);
                              }}
                            >
                              <span className="font-medium text-slate-950">{project.customer}</span>
                              <span className="text-xs text-slate-500">{project.address}</span>
                            </button>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="event-notes">Notes</Label>
                <Textarea
                  id="event-notes"
                  rows={4}
                  placeholder="Optional notes about the event."
                  value={form.notes}
                  onChange={(event) => setForm((value) => ({ ...value, notes: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[26px] border border-black/5 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Selected Date</p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                  {form.date ? format(toLocalDate(form.date), 'EEEE, MMM d') : 'No date selected'}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {editingEvent
                    ? 'Update this event directly from the calendar.'
                    : 'Create a new event and optionally link it to a project.'}
                </p>
              </div>

              <div className="rounded-[26px] border border-black/5 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Behavior Notes</p>
                <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
                  <li>Project-linked events still route to the project detail page when clicked in the month grid or side rail.</li>
                  <li>Standalone custom events can be edited and deleted directly from this dialog.</li>
                  <li>Search and filter operate on visible events using the current client-side project lookup.</li>
                </ul>
              </div>
            </div>
          </div>

          {saveError && (
            <div className="px-6 pb-4 text-sm text-rose-700">
              {saveError}
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-black/5 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
              {editingEvent ? 'Editing an existing event' : 'Creating a new event'}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {editingEvent && !confirmDelete && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmDelete(true)}
                  disabled={saving}
                  className="rounded-2xl border-rose-200 bg-rose-50 px-4 text-rose-700 hover:bg-rose-100"
                >
                  Delete Event
                </Button>
              )}
              {editingEvent && confirmDelete && (
                <>
                  <span className="text-sm text-slate-600">Are you sure?</span>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmDelete(false)}
                    disabled={saving}
                    className="rounded-2xl border-black/10 bg-white px-4 shadow-sm"
                  >
                    No, Keep It
                  </Button>
                  <Button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className="rounded-2xl bg-rose-600 px-4 text-white hover:bg-rose-700"
                  >
                    {saving ? 'Deleting...' : 'Yes, Delete'}
                  </Button>
                </>
              )}
              {!confirmDelete && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeDialog}
                    disabled={saving}
                    className="rounded-2xl border-black/10 bg-white px-4 shadow-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-2xl bg-slate-950 px-4 text-white hover:bg-slate-800"
                  >
                    {saving ? 'Saving...' : editingEvent ? 'Save Changes' : 'Save Event'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
