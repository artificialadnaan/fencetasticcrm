import { CalendarClock, CheckCircle2, MapPinned, PencilLine, Sparkles } from 'lucide-react';
import { format, startOfDay, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CalendarEventView } from './calendar-types';

interface CalendarSideInsightsProps {
  events: CalendarEventView[];
  currentDate: Date;
  isLoading: boolean;
  onOpenEvent: (event: CalendarEventView) => void;
  onViewFullSchedule: () => void;
}

export function CalendarSideInsights({
  events,
  currentDate,
  isLoading,
  onOpenEvent,
  onViewFullSchedule,
}: CalendarSideInsightsProps) {
  const today = startOfDay(new Date());
  const next48h = addDays(today, 2);

  const upcoming = events
    .filter((event) => {
      const eventDate = new Date(`${event.start}T00:00:00`);
      return eventDate >= today && eventDate < next48h;
    })
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 4);

  const installCount = events.filter((event) => event.type === 'install').length;
  const followUpCount = events.filter((event) => event.type === 'followup').length;
  const estimateCount = events.filter((event) => event.type === 'estimate').length;
  const projectLinkedCount = events.filter((event) => event.projectId).length;

  const total = Math.max(events.length, 1);

  return (
    <aside className="space-y-5">
      <section className="shell-panel rounded-[32px] p-5 md:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-black/5 pb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Upcoming Next 48h
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-slate-950">
              {format(currentDate, 'MMMM d')}
            </h2>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
            {isLoading ? '...' : `${upcoming.length} due`}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {isLoading ? (
            [0, 1, 2].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-[24px] bg-slate-200/70" />
            ))
          ) : upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white/50 px-6 py-10 text-center">
              <Sparkles className="h-10 w-10 text-slate-400" />
              <p className="mt-4 text-lg font-semibold text-slate-900">No events due immediately</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                The next installs, estimates, and follow-ups will surface here automatically.
              </p>
            </div>
          ) : (
            upcoming.map((event) => {
              const eventDate = new Date(`${event.start}T00:00:00`);
              const isLinked = Boolean(event.projectId);
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onOpenEvent(event)}
                  className="w-full rounded-[24px] border border-black/5 bg-white/80 px-4 py-4 text-left shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-slate-950">{event.title}</p>
                      <p className="mt-1 truncate text-sm text-slate-600">
                        {event.projectCustomer
                          ? `${event.projectCustomer}${event.projectAddress ? ` • ${event.projectAddress}` : ''}`
                          : 'Standalone calendar event'}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {isLinked ? 'Project' : 'Custom'}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <CalendarClock className="h-4 w-4" />
                      {format(eventDate, 'EEE, MMM d')}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                      {isLinked ? <MapPinned className="h-3.5 w-3.5" /> : <PencilLine className="h-3.5 w-3.5" />}
                      {isLinked ? 'Open project' : 'Edit event'}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <Button
          type="button"
          onClick={onViewFullSchedule}
          variant="outline"
          className="mt-5 w-full rounded-2xl border-black/10 bg-white/70 px-4 shadow-sm"
        >
          <CheckCircle2 className="h-4 w-4" />
          View Full Schedule
        </Button>
      </section>

      <section className="shell-panel rounded-[32px] p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Event Mix
            </p>
            <h3 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-slate-950">
              Visible schedule load
            </h3>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            {events.length} events
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {[
            { label: 'Install', value: installCount, color: 'bg-emerald-500' },
            { label: 'Follow-up', value: followUpCount, color: 'bg-amber-500' },
            { label: 'Estimate', value: estimateCount, color: 'bg-sky-500' },
            { label: 'Project-linked', value: projectLinkedCount, color: 'bg-slate-900' },
          ].map((item) => (
            <div key={item.label} className="rounded-[22px] border border-black/5 bg-white/75 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-800">{item.label}</span>
                <span className="text-sm font-semibold text-slate-950">{item.value}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn('h-full rounded-full', item.color)}
                  style={{ width: `${Math.max((item.value / total) * 100, item.value > 0 ? 12 : 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
