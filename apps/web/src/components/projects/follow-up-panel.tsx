import { useEffect, useRef, useState } from 'react';
import {
  EstimateFollowUpLostReasonCode,
  EstimateFollowUpSequenceStatus,
  EstimateFollowUpTaskStatus,
  type EstimateFollowUpSequence,
  type EstimateFollowUpTask,
} from '@fencetastic/shared';
import { useFollowUpSequence } from '@/hooks/use-follow-up-sequence';
import { formatDate } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface FollowUpPanelProps {
  projectId: string;
}

interface TaskDraftState {
  draftSubject: string;
  draftBody: string;
  notes: string;
}

interface CloseFormState {
  closeStatus:
    | EstimateFollowUpSequenceStatus.WON
    | EstimateFollowUpSequenceStatus.LOST
    | EstimateFollowUpSequenceStatus.CLOSED;
  closedSummary: string;
  lostReasonCode: EstimateFollowUpLostReasonCode | '';
  lostReasonNotes: string;
}

const TASK_KIND_LABELS: Record<string, string> = {
  DAY_1: 'Day 1',
  DAY_3: 'Day 3',
  DAY_7: 'Day 7',
  DAY_14: 'Day 14',
};

const LOST_REASON_LABELS: Record<EstimateFollowUpLostReasonCode, string> = {
  [EstimateFollowUpLostReasonCode.PRICE]: 'Price',
  [EstimateFollowUpLostReasonCode.NO_RESPONSE]: 'No Response',
  [EstimateFollowUpLostReasonCode.CHOSE_COMPETITOR]: 'Chose Competitor',
  [EstimateFollowUpLostReasonCode.TIMING]: 'Timing',
  [EstimateFollowUpLostReasonCode.FINANCING]: 'Financing',
  [EstimateFollowUpLostReasonCode.SCOPE_MISMATCH]: 'Scope Mismatch',
  [EstimateFollowUpLostReasonCode.DUPLICATE_BAD_LEAD]: 'Duplicate / Bad Lead',
  [EstimateFollowUpLostReasonCode.OTHER]: 'Other',
};

function buildDraftMap(tasks: EstimateFollowUpTask[]) {
  return tasks.reduce<Record<string, TaskDraftState>>((drafts, task) => {
    drafts[task.id] = {
      draftSubject: task.draftSubject,
      draftBody: task.draftBody,
      notes: task.notes ?? '',
    };
    return drafts;
  }, {});
}

function buildCloseFormState(sequence: EstimateFollowUpSequence): CloseFormState {
  return {
    closeStatus:
      sequence.status === EstimateFollowUpSequenceStatus.ACTIVE
        ? EstimateFollowUpSequenceStatus.WON
        : sequence.status,
    closedSummary: sequence.closedSummary ?? '',
    lostReasonCode: sequence.lostReasonCode ?? '',
    lostReasonNotes: sequence.lostReasonNotes ?? '',
  };
}

function isDraftSynced(current: TaskDraftState, previousServer: TaskDraftState) {
  return (
    current.draftSubject === previousServer.draftSubject
    && current.draftBody === previousServer.draftBody
    && current.notes === previousServer.notes
  );
}

function reconcileDrafts(
  currentDrafts: Record<string, TaskDraftState>,
  previousServerDrafts: Record<string, TaskDraftState> | null,
  nextServerDrafts: Record<string, TaskDraftState>
) {
  if (!previousServerDrafts) {
    return nextServerDrafts;
  }

  return Object.fromEntries(
    Object.entries(nextServerDrafts).map(([taskId, nextServerDraft]) => {
      const currentDraft = currentDrafts[taskId];
      const previousServerDraft = previousServerDrafts[taskId];

      if (!currentDraft || !previousServerDraft) {
        return [taskId, nextServerDraft];
      }

      return [
        taskId,
        isDraftSynced(currentDraft, previousServerDraft) ? nextServerDraft : currentDraft,
      ];
    })
  );
}

function reconcileValue<T>(currentValue: T, previousServerValue: T | undefined, nextServerValue: T) {
  if (previousServerValue === undefined) {
    return nextServerValue;
  }

  return Object.is(currentValue, previousServerValue) ? nextServerValue : currentValue;
}

export function FollowUpPanel({ projectId }: FollowUpPanelProps) {
  const {
    summary,
    isLoading,
    error,
    savingTaskId,
    completingTaskId,
    isClosingSequence,
    saveTaskDraft,
    completeTask,
    closeSequence,
  } = useFollowUpSequence(projectId);
  const [drafts, setDrafts] = useState<Record<string, TaskDraftState>>({});
  const [closeStatus, setCloseStatus] = useState<EstimateFollowUpSequenceStatus.WON | EstimateFollowUpSequenceStatus.LOST | EstimateFollowUpSequenceStatus.CLOSED>(
    EstimateFollowUpSequenceStatus.WON
  );
  const [closedSummary, setClosedSummary] = useState('');
  const [lostReasonCode, setLostReasonCode] = useState<EstimateFollowUpLostReasonCode | ''>('');
  const [lostReasonNotes, setLostReasonNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const syncedDraftsRef = useRef<Record<string, TaskDraftState> | null>(null);
  const syncedCloseFormRef = useRef<CloseFormState | null>(null);
  const syncedSequenceIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!summary?.sequence) {
      return;
    }

    const nextServerDrafts = buildDraftMap(summary.tasks);
    setDrafts((currentDrafts) =>
      reconcileDrafts(currentDrafts, syncedDraftsRef.current, nextServerDrafts)
    );
    syncedDraftsRef.current = nextServerDrafts;

    const nextCloseFormState = buildCloseFormState(summary.sequence);
    const isNewSequence = syncedSequenceIdRef.current !== summary.sequence.id;

    setCloseStatus((currentValue) =>
      isNewSequence
        ? nextCloseFormState.closeStatus
        : reconcileValue(
            currentValue,
            syncedCloseFormRef.current?.closeStatus,
            nextCloseFormState.closeStatus
          )
    );
    setClosedSummary((currentValue) =>
      isNewSequence
        ? nextCloseFormState.closedSummary
        : reconcileValue(
            currentValue,
            syncedCloseFormRef.current?.closedSummary,
            nextCloseFormState.closedSummary
          )
    );
    setLostReasonCode((currentValue) =>
      isNewSequence
        ? nextCloseFormState.lostReasonCode
        : reconcileValue(
            currentValue,
            syncedCloseFormRef.current?.lostReasonCode,
            nextCloseFormState.lostReasonCode
          )
    );
    setLostReasonNotes((currentValue) =>
      isNewSequence
        ? nextCloseFormState.lostReasonNotes
        : reconcileValue(
            currentValue,
            syncedCloseFormRef.current?.lostReasonNotes,
            nextCloseFormState.lostReasonNotes
          )
    );

    if (isNewSequence) {
      setValidationError(null);
    }

    syncedCloseFormRef.current = nextCloseFormState;
    syncedSequenceIdRef.current = summary.sequence.id;
  }, [summary]);

  const sequence = summary?.sequence ?? null;
  const nextPendingTask = summary?.nextPendingTask ?? null;
  const tasks = summary?.tasks ?? [];
  const isSequenceClosed =
    sequence != null && sequence.status !== EstimateFollowUpSequenceStatus.ACTIVE;

  const handleDraftChange = (taskId: string, field: keyof TaskDraftState, value: string) => {
    setDrafts((current) => ({
      ...current,
      [taskId]: {
        draftSubject: current[taskId]?.draftSubject ?? '',
        draftBody: current[taskId]?.draftBody ?? '',
        notes: current[taskId]?.notes ?? '',
        [field]: value,
      },
    }));
  };

  const handleSaveDraft = async (taskId: string) => {
    const draft = drafts[taskId];
    if (!draft) {
      return;
    }

    await saveTaskDraft(taskId, {
      draftSubject: draft.draftSubject,
      draftBody: draft.draftBody,
      notes: draft.notes,
    });
  };

  const handleCloseSequence = async () => {
    if (!sequence) {
      return;
    }

    if (
      closeStatus === EstimateFollowUpSequenceStatus.LOST
      && (!lostReasonCode || lostReasonNotes.trim() === '')
    ) {
      setValidationError('Lost reason code and notes are required.');
      return;
    }

    setValidationError(null);
    await closeSequence(sequence.id, {
      status: closeStatus,
      closedSummary,
      lostReasonCode:
        closeStatus === EstimateFollowUpSequenceStatus.LOST ? lostReasonCode || null : null,
      lostReasonNotes:
        closeStatus === EstimateFollowUpSequenceStatus.LOST ? lostReasonNotes.trim() : null,
    });
  };

  if (isLoading && !summary) {
    return (
      <section className="shell-panel rounded-[28px] p-6 md:p-8">
        <p className="py-8 text-sm text-slate-500">Loading follow-up workspace...</p>
      </section>
    );
  }

  if (error && !summary) {
    return (
      <section className="shell-panel rounded-[28px] p-6 md:p-8 border-destructive">
        <p className="py-8 text-sm text-destructive">{error}</p>
      </section>
    );
  }

  if (!summary || !sequence) {
    return (
      <section className="shell-panel rounded-[28px] p-6 md:p-8">
        <p className="py-8 text-sm text-slate-500">
          No follow-up sequence is available for this project.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-black/5 bg-white/70 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sequence Status</p>
          <div className="mt-2 space-y-1 text-sm">
            <div className="font-semibold text-slate-950">{sequence.status}</div>
            <div className="text-slate-500">Started {formatDate(sequence.startedAt)}</div>
            {sequence.closedAt && (
              <div className="text-slate-500">Closed {formatDate(sequence.closedAt)}</div>
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-black/5 bg-white/70 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Next Pending Task</p>
          <div className="mt-2 space-y-1 text-sm">
            {nextPendingTask ? (
              <>
                <div className="font-semibold text-slate-950">{TASK_KIND_LABELS[nextPendingTask.kind] ?? nextPendingTask.kind}</div>
                <div className="text-slate-950">{formatDate(nextPendingTask.dueDate)}</div>
                <div className="text-slate-500">{nextPendingTask.status}</div>
              </>
            ) : (
              <div className="text-slate-500">No pending follow-up tasks remain.</div>
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-black/5 bg-white/70 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Scheduled Tasks</p>
          <div className="mt-2 space-y-1 text-sm">
            <div className="font-semibold text-slate-950">{tasks.length}</div>
            <div className="text-slate-500">
              {tasks.map((task) => TASK_KIND_LABELS[task.kind] ?? task.kind).join(', ')}
            </div>
          </div>
        </div>
      </div>

      <section className="shell-panel rounded-[28px] p-6 md:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Follow-up</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950">Scheduled Tasks</h2>

        <div className="mt-6 space-y-4">
          {tasks.map((task) => {
            const draft = drafts[task.id] ?? {
              draftSubject: task.draftSubject,
              draftBody: task.draftBody,
              notes: task.notes ?? '',
            };
            const isTaskPending = task.status === EstimateFollowUpTaskStatus.PENDING;

            return (
              <div key={task.id} data-task-id={task.id} className="rounded-[24px] border border-black/5 bg-white/70 p-5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">
                      {TASK_KIND_LABELS[task.kind] ?? task.kind}
                    </h3>
                    <p className="text-sm text-slate-500">Due {formatDate(task.dueDate)}</p>
                  </div>
                  <div className="text-sm font-medium text-slate-950">{task.status}</div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`draftSubject-${task.id}`}>
                      Draft Subject
                    </label>
                    <Input
                      id={`draftSubject-${task.id}`}
                      name="draftSubject"
                      value={draft.draftSubject}
                      onChange={(event) => handleDraftChange(task.id, 'draftSubject', event.target.value)}
                      disabled={isSequenceClosed}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`draftBody-${task.id}`}>
                      Draft Body
                    </label>
                    <Textarea
                      id={`draftBody-${task.id}`}
                      name="draftBody"
                      value={draft.draftBody}
                      onChange={(event) => handleDraftChange(task.id, 'draftBody', event.target.value)}
                      disabled={isSequenceClosed}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`notes-${task.id}`}>
                      Task Notes
                    </label>
                    <Textarea
                      id={`notes-${task.id}`}
                      name="notes"
                      value={draft.notes}
                      onChange={(event) => handleDraftChange(task.id, 'notes', event.target.value)}
                      disabled={isSequenceClosed}
                      rows={3}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="rounded-2xl border-black/10 bg-white/70"
                      variant="outline"
                      onClick={() => handleSaveDraft(task.id)}
                      disabled={isSequenceClosed || savingTaskId === task.id}
                    >
                      {savingTaskId === task.id ? 'Saving...' : 'Save Draft'}
                    </Button>
                    <Button
                      type="button"
                      className="rounded-2xl bg-slate-950 px-5 text-white hover:bg-slate-800"
                      onClick={() => completeTask(task.id)}
                      disabled={isSequenceClosed || !isTaskPending || completingTaskId === task.id}
                    >
                      {completingTaskId === task.id ? 'Completing...' : 'Complete Task'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="shell-panel rounded-[28px] p-6 md:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Outcome</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950">Close Sequence</h2>

        <div className="mt-6 space-y-4">
          {sequence.closedSummary && (
            <div className="rounded-[24px] border border-black/5 bg-slate-100 px-4 py-3 text-sm">
              <div className="font-medium text-slate-950">Closed Summary</div>
              <div className="mt-1 text-slate-500">{sequence.closedSummary}</div>
            </div>
          )}

          {isSequenceClosed ? (
            <div className="space-y-1 text-sm text-slate-500">
              <div>Outcome: {sequence.status}</div>
              {sequence.lostReasonCode && (
                <div>Lost reason: {LOST_REASON_LABELS[sequence.lostReasonCode]}</div>
              )}
              {sequence.lostReasonNotes && <div>Notes: {sequence.lostReasonNotes}</div>}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="closeStatus">
                  Outcome
                </label>
                <select
                  id="closeStatus"
                  name="closeStatus"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={closeStatus}
                  onChange={(event) =>
                    setCloseStatus(
                      event.target.value as
                        | EstimateFollowUpSequenceStatus.WON
                        | EstimateFollowUpSequenceStatus.LOST
                        | EstimateFollowUpSequenceStatus.CLOSED
                    )
                  }
                >
                  <option value={EstimateFollowUpSequenceStatus.WON}>WON</option>
                  <option value={EstimateFollowUpSequenceStatus.LOST}>LOST</option>
                  <option value={EstimateFollowUpSequenceStatus.CLOSED}>CLOSED</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="closedSummary">
                  Close Summary
                </label>
                <Textarea
                  id="closedSummary"
                  name="closedSummary"
                  value={closedSummary}
                  onChange={(event) => setClosedSummary(event.target.value)}
                  rows={3}
                />
              </div>

              {closeStatus === EstimateFollowUpSequenceStatus.LOST && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="lostReasonCode">
                      Lost Reason Code
                    </label>
                    <select
                      id="lostReasonCode"
                      name="lostReasonCode"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={lostReasonCode}
                      onChange={(event) =>
                        setLostReasonCode(event.target.value as EstimateFollowUpLostReasonCode | '')
                      }
                    >
                      <option value="">Select a reason</option>
                      {Object.values(EstimateFollowUpLostReasonCode).map((reasonCode) => (
                        <option key={reasonCode} value={reasonCode}>
                          {LOST_REASON_LABELS[reasonCode]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="lostReasonNotes">
                      Lost Reason Notes
                    </label>
                    <Textarea
                      id="lostReasonNotes"
                      name="lostReasonNotes"
                      value={lostReasonNotes}
                      onChange={(event) => setLostReasonNotes(event.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {validationError && (
                <div className="text-sm text-destructive">{validationError}</div>
              )}

              <Button
                type="button"
                className="rounded-2xl bg-slate-950 px-5 text-white hover:bg-slate-800"
                onClick={handleCloseSequence}
                disabled={isClosingSequence}
              >
                {isClosingSequence ? 'Closing...' : 'Close Sequence'}
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
