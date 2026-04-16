import { startTransition, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { DashboardWorkflowOverview } from '@fencetastic/shared';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/formatters';
import type { UserOption } from '@/hooks/use-user-options';

interface DashboardWorkflowPanelProps {
  overview: DashboardWorkflowOverview | null;
  isLoading: boolean;
  users?: UserOption[];
  isUsersLoading?: boolean;
  onCompleteTask?: (taskId: string) => Promise<void> | void;
  onAssignTask?: (taskId: string, userId: string | null) => Promise<void> | void;
  onRescheduleTask?: (taskId: string, dueDate: string) => Promise<void> | void;
}

type WorkflowFilter = 'ALL' | 'OVERDUE' | 'DUE_TODAY' | 'UNASSIGNED';

function SummaryPill({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

export function DashboardWorkflowPanel({
  overview,
  isLoading,
  users = [],
  isUsersLoading = false,
  onCompleteTask,
  onAssignTask,
  onRescheduleTask,
}: DashboardWorkflowPanelProps) {
  const [activeFilter, setActiveFilter] = useState<WorkflowFilter>('ALL');
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDrafts, setRescheduleDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setRescheduleDrafts((current) => {
      if (!overview) {
        return {};
      }

      const next: Record<string, string> = {};
      let changed = false;

      for (const task of overview.tasks) {
        const draft = current[task.id];
        if (draft && draft !== task.dueDate) {
          next[task.id] = draft;
        }
      }

      if (Object.keys(next).length !== Object.keys(current).length) {
        changed = true;
      } else {
        for (const [key, value] of Object.entries(next)) {
          if (current[key] !== value) {
            changed = true;
            break;
          }
        }
      }

      return changed ? next : current;
    });
  }, [overview]);

  const visibleTasks = useMemo(() => {
    if (!overview) return [];
    switch (activeFilter) {
      case 'OVERDUE':
        return overview.tasks.filter((task) => task.urgency === 'HIGH');
      case 'DUE_TODAY':
        return overview.tasks.filter((task) => task.urgency === 'MEDIUM');
      case 'UNASSIGNED':
        return overview.tasks.filter((task) => !task.assignedToName);
      default:
        return overview.tasks;
    }
  }, [activeFilter, overview]);

  return (
    <section className="shell-panel rounded-[32px] p-6">
      <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">Workflow Queue</p>
          <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-white">Owned and unassigned work</h2>
        </div>
        <Link
          to="/calendar"
          className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/16"
        >
          Open calendar
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-20 animate-pulse rounded-[24px] bg-white/10" />
          ))}
        </div>
      ) : !overview ? (
        <div className="mt-5 rounded-[24px] border border-dashed border-white/12 bg-white/6 px-5 py-8 text-sm text-slate-300">
          Workflow queue unavailable.
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryPill label="Overdue" value={overview.overdueCount} />
            <SummaryPill label="Due Today" value={overview.dueTodayCount} />
            <SummaryPill label="Upcoming" value={overview.upcomingCount} />
            <SummaryPill label="Unassigned" value={overview.unassignedCount} />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'OVERDUE', label: 'Overdue' },
              { id: 'DUE_TODAY', label: 'Due Today' },
              { id: 'UNASSIGNED', label: 'Unassigned' },
            ].map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => startTransition(() => setActiveFilter(filter.id as WorkflowFilter))}
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                  activeFilter === filter.id
                    ? 'border-white/20 bg-white text-slate-950'
                    : 'border-white/10 bg-white/8 text-slate-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {overview.ownerBreakdown.map((owner) => (
              <div key={owner.ownerName} className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200">
                {owner.ownerName} • {owner.count}
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {visibleTasks.map((task) => (
              (() => {
                const resolvedOwnerId =
                  task.assignedToUserId
                    ? users.some((user) => user.id === task.assignedToUserId)
                      ? task.assignedToUserId
                      : null
                    : users.find((user) => user.name === task.assignedToName)?.id ?? null;
                const unresolvedOwnerOptionValue = task.assignedToUserId
                  ? resolvedOwnerId === task.assignedToUserId
                    ? null
                    : task.assignedToUserId
                  : task.assignedToName
                    ? `current:${task.id}`
                    : null;
                const ownerValue = resolvedOwnerId ?? unresolvedOwnerOptionValue ?? 'unassigned';
                const dueDateDraft = rescheduleDrafts[task.id] ?? task.dueDate;

                return (
              <div
                key={task.id}
                className="rounded-[24px] border border-white/10 bg-white px-4 py-4 text-slate-950 shadow-[0_12px_32px_rgba(15,23,42,0.18)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-slate-950">{task.title}</p>
                    <p className="mt-1 truncate text-sm text-slate-600">{task.customer} • {task.address}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{task.urgency}</span>
                </div>
                <p className="mt-3 text-sm text-slate-700">
                  {formatDate(task.dueDate)}
                  {task.assignedToName ? ` • ${task.assignedToName}` : ' • Unassigned'}
                </p>
                {(onAssignTask || onRescheduleTask) ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                    {onAssignTask ? (
                      <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Owner
                        <select
                          aria-label={`Assign owner for ${task.title}`}
                          className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900"
                          value={ownerValue}
                          disabled={assigningId === task.id || isUsersLoading}
                          onChange={async (event) => {
                            setAssigningId(task.id);
                            try {
                              await onAssignTask?.(task.id, event.target.value === 'unassigned' ? null : event.target.value);
                            } finally {
                              setAssigningId(null);
                            }
                          }}
                        >
                          <option value="unassigned">Unassigned</option>
                          {unresolvedOwnerOptionValue && !resolvedOwnerId ? (
                            <option value={unresolvedOwnerOptionValue}>{task.assignedToName ?? 'Current owner'} (current)</option>
                          ) : null}
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    {onRescheduleTask ? (
                      <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Due date
                        <div className="flex gap-2">
                          <input
                            aria-label={`Reschedule ${task.title}`}
                            type="date"
                            className="h-10 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900"
                            value={dueDateDraft}
                            disabled={reschedulingId === task.id}
                            onChange={(event) => {
                              setRescheduleDrafts((current) => ({ ...current, [task.id]: event.target.value }));
                            }}
                            onInput={(event) => {
                              setRescheduleDrafts((current) => ({
                                ...current,
                                [task.id]: (event.target as HTMLInputElement).value,
                              }));
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            aria-label={`Save due date for ${task.title}`}
                            className="h-10 rounded-2xl border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-50"
                            disabled={reschedulingId === task.id || !dueDateDraft || dueDateDraft === task.dueDate}
                            onClick={async () => {
                              setReschedulingId(task.id);
                              try {
                                await onRescheduleTask?.(task.id, dueDateDraft);
                                setRescheduleDrafts((current) => {
                                  const next = { ...current };
                                  delete next[task.id];
                                  return next;
                                });
                              } finally {
                                setReschedulingId(null);
                              }
                            }}
                          >
                            Save
                          </Button>
                        </div>
                      </label>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to={task.href}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Open task
                  </Link>
                  {onCompleteTask ? (
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-2xl bg-emerald-600 text-white hover:bg-emerald-500"
                      disabled={completingId === task.id}
                      onClick={async () => {
                        setCompletingId(task.id);
                        try {
                          await onCompleteTask(task.id);
                        } finally {
                          setCompletingId(null);
                        }
                      }}
                    >
                      {completingId === task.id ? 'Completing...' : 'Complete'}
                    </Button>
                  ) : null}
                </div>
              </div>
                );
              })()
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
