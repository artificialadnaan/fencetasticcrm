import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataSurface } from '@/components/ui/data-surface';
import { cn } from '@/lib/utils';
import type { CalendarEventView } from './calendar-types';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EVENT_PRIORITY: Record<string, number> = {
  install: 0,
  project_start: 1,
  project_finish: 2,
  estimate: 3,
  followup: 4,
  meeting: 5,
  site_visit: 6,
  other: 7,
};
const EVENT_LABELS: Record<string, string> = {
  install: 'Install',
  project_start: 'Start',
  project_finish: 'Finish',
  estimate: 'Estimate',
  followup: 'Follow-up',
  meeting: 'Meeting',
  site_visit: 'Site Visit',
  other: 'Custom',
};

function toDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getEventPrimaryLabel(event: CalendarEventView) {
  if (event.projectCustomer) return event.projectCustomer;
  const [headline] = event.title.split('—');
  return headline?.trim() || event.title;
}

function getEventSecondaryLabel(event: CalendarEventView) {
  return EVENT_LABELS[event.type] ?? event.type;
}

interface CalendarMonthGridProps {
  currentDate: Date;
  events: CalendarEventView[];
  isLoading: boolean;
  selectedDate: Date;
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
  selectedDate,
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
    <DataSurface
      eyebrow="Schedule board"
      title={format(currentDate, 'MMMM yyyy')}
      actions={(
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={onPrevMonth} className="rounded-2xl border-white/10 bg-white/[0.03] text-[#dce4f2] hover:bg-white/[0.08]">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={onToday} className="rounded-2xl border-white/10 bg-white/[0.03] text-[#dce4f2] hover:bg-white/[0.08]">
            Today
          </Button>
          <Button variant="outline" onClick={onNextMonth} className="rounded-2xl border-white/10 bg-white/[0.03] text-[#dce4f2] hover:bg-white/[0.08]">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button onClick={onCreateEvent} className="rounded-2xl bg-[#f59e0b] text-[#11161d] hover:bg-[#f6b94d]">
            <Plus className="h-4 w-4" />
            Add Event
          </Button>
        </div>
      )}
      contentClassName="px-4 py-4 md:px-6 md:py-5"
    >
      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs font-medium text-[#9aa6bb]">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-[#f59e0b]" />
          {events.length} visible events
        </span>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-emerald-300">
          Select a day to inspect and add schedule items
        </span>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-[28px] border border-white/8 bg-white/6">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="bg-[#131a22] px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8f9aae]"
          >
            {label}
          </div>
        ))}

        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayEvents = (eventsByDay.get(key) ?? []).slice().sort((a, b) => {
            const priorityDelta = (EVENT_PRIORITY[a.type] ?? 99) - (EVENT_PRIORITY[b.type] ?? 99);
            return priorityDelta === 0 ? a.title.localeCompare(b.title) : priorityDelta;
          });
          const visibleEvents = dayEvents.slice(0, 2);
          const hiddenCount = Math.max(dayEvents.length - visibleEvents.length, 0);
          const isSelected = isSameDay(day, selectedDate);

          return (
            <div
              key={key}
              className={cn(
                'min-h-[156px] border border-white/6 bg-[#0f141b] p-3 text-left transition',
                !isSameMonth(day, currentDate) && 'bg-[#0b1016] text-[#5f6d82]',
                isSelected && 'border-[#f59e0b] bg-[#141b23]',
                isToday(day) && 'ring-1 ring-inset ring-emerald-400/55',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectDate(day)}
                  className={cn('text-lg font-semibold', isSameMonth(day, currentDate) ? 'text-[#f7f8fb]' : 'text-[#69778c]')}
                >
                  {format(day, 'd')}
                </button>
                {isToday(day) ? (
                  <span className="rounded-full bg-[#143227] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8ef0c2]">
                    Today
                  </span>
                ) : null}
              </div>

              <div className="mt-3 space-y-2">
                {visibleEvents.length > 0 ? visibleEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={(triggerEvent) => {
                      triggerEvent.stopPropagation();
                      onSelectEvent(event);
                    }}
                    className="flex min-h-[78px] w-full items-start gap-2 rounded-2xl border border-white/8 bg-[#151d27] px-3 py-2.5 text-left transition hover:border-white/16 hover:bg-[#19222d]"
                  >
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: event.color }} />
                    <span className="min-w-0">
                      <span className="block line-clamp-2 text-sm font-semibold leading-5 text-[#f7f8fb]">
                        {getEventPrimaryLabel(event)}
                      </span>
                      <span className="mt-1 block text-xs font-medium uppercase tracking-[0.12em] text-[#aeb9cb]">
                        {getEventSecondaryLabel(event)}
                      </span>
                    </span>
                  </button>
                )) : (
                  <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.02] px-3 py-5 text-center text-[11px] leading-5 text-[#78859a]">
                    Quiet day
                  </div>
                )}

                {hiddenCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => onSelectDate(day)}
                    className="px-1 text-xs font-medium text-[#f6bf74]"
                  >
                    +{hiddenCount} more
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {isLoading ? (
        <div className="mt-5 rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] px-6 py-8 text-center text-sm text-[#93a0b4]">
          Loading calendar events...
        </div>
      ) : null}
    </DataSurface>
  );
}
