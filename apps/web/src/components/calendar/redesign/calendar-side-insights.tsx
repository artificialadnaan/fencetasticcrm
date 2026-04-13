import { CalendarClock, CheckCircle2, MapPinned, Sparkles } from 'lucide-react';
import { endOfMonth, format, isWithinInterval, startOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import { DataSurface } from '@/components/ui/data-surface';
import { cn } from '@/lib/utils';
import type { CalendarEventView } from './calendar-types';

interface CalendarSideInsightsProps {
  monthEvents: CalendarEventView[];
  selectedDayEvents: CalendarEventView[];
  selectedDate: Date;
  currentDate: Date;
  isLoading: boolean;
  onOpenEvent: (event: CalendarEventView) => void;
  onCreateEvent: () => void;
}

export function CalendarSideInsights({
  monthEvents,
  selectedDayEvents,
  selectedDate,
  currentDate,
  isLoading,
  onOpenEvent,
  onCreateEvent,
}: CalendarSideInsightsProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const eventsInMonth = monthEvents.filter((event) =>
    isWithinInterval(new Date(`${event.start}T00:00:00`), { start: monthStart, end: monthEnd })
  );

  const installCount = eventsInMonth.filter((event) => event.type === 'install').length;
  const followUpCount = eventsInMonth.filter((event) => event.type === 'followup').length;
  const estimateCount = eventsInMonth.filter((event) => event.type === 'estimate').length;
  const customCount = eventsInMonth.filter((event) => !event.projectId).length;
  const total = Math.max(eventsInMonth.length, 1);

  return (
    <aside className="space-y-5">
      <DataSurface
        eyebrow="Selected day"
        title={format(selectedDate, 'EEEE, MMM d')}
        className="bg-[#11161d]"
        actions={(
          <Button
            type="button"
            onClick={onCreateEvent}
            className="rounded-2xl bg-[#f59e0b] px-4 text-[#11161d] hover:bg-[#f6b94d]"
          >
            Add event
          </Button>
        )}
      >
        <div className="space-y-3">
          {isLoading ? (
            [0, 1, 2].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-[24px] bg-white/5" />
            ))
          ) : selectedDayEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center">
              <Sparkles className="h-10 w-10 text-[#718096]" />
              <p className="mt-4 text-lg font-semibold text-[#f7f8fb]">No scheduled items</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[#93a0b4]">
                Use Add event to place a follow-up, install, or meeting on this day.
              </p>
            </div>
          ) : (
            selectedDayEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => onOpenEvent(event)}
                className="w-full rounded-[24px] border border-white/8 bg-[#151d27] px-4 py-4 text-left shadow-sm transition-colors hover:border-white/16 hover:bg-[#19222d]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: event.color }} />
                      <p className="truncate text-base font-semibold text-[#f7f8fb]">{event.title}</p>
                    </div>
                    <p className="mt-2 truncate text-sm text-[#93a0b4]">
                      {event.projectCustomer
                        ? `${event.projectCustomer}${event.projectAddress ? ` • ${event.projectAddress}` : ''}`
                        : 'Standalone calendar event'}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d7deea]">
                    {event.type}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[#9aa6bb]">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {format(new Date(`${event.start}T00:00:00`), 'EEE, MMM d')}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPinned className="h-3.5 w-3.5" />
                    {event.projectId ? 'Open project' : 'Edit event'}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </DataSurface>

      <DataSurface eyebrow="Month mix" title={`${format(currentDate, 'MMMM')} schedule load`}>
        <div className="space-y-3">
          {[
            { label: 'Install', value: installCount, color: 'bg-emerald-500' },
            { label: 'Follow-up', value: followUpCount, color: 'bg-amber-500' },
            { label: 'Estimate', value: estimateCount, color: 'bg-sky-500' },
            { label: 'Custom', value: customCount, color: 'bg-fuchsia-500' },
          ].map((item) => (
            <div key={item.label} className="rounded-[22px] border border-white/8 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-[#dbe2ee]">{item.label}</span>
                <span className="text-sm font-semibold text-[#f7f8fb]">{item.value}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/6">
                <div
                  className={cn('h-full rounded-full', item.color)}
                  style={{ width: `${Math.max((item.value / total) * 100, item.value > 0 ? 12 : 0)}%` }}
                />
              </div>
            </div>
          ))}

          <div className="rounded-[22px] border border-white/8 bg-[#151d27] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-[#dbe2ee]">Events this month</p>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {eventsInMonth.length} scheduled
              </span>
            </div>
          </div>
        </div>
      </DataSurface>
    </aside>
  );
}
