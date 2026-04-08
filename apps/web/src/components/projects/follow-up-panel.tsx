import { useEffect, useState } from 'react';
import {
  EstimateFollowUpLostReasonCode,
  EstimateFollowUpSequenceStatus,
  EstimateFollowUpTaskStatus,
  type EstimateFollowUpTask,
} from '@fencetastic/shared';
import { useFollowUpSequence } from '@/hooks/use-follow-up-sequence';
import { formatDate } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  useEffect(() => {
    if (summary) {
      setDrafts(buildDraftMap(summary.tasks));
      setCloseStatus(
        summary.sequence?.status === EstimateFollowUpSequenceStatus.ACTIVE
          ? EstimateFollowUpSequenceStatus.WON
          : EstimateFollowUpSequenceStatus.CLOSED
      );
      setClosedSummary(summary.sequence?.closedSummary ?? '');
      setLostReasonCode(summary.sequence?.lostReasonCode ?? '');
      setLostReasonNotes(summary.sequence?.lostReasonNotes ?? '');
      setValidationError(null);
    }
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
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          Loading follow-up workspace...
        </CardContent>
      </Card>
    );
  }

  if (error && !summary) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-8 text-sm text-destructive">{error}</CardContent>
      </Card>
    );
  }

  if (!summary || !sequence) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          No follow-up sequence is available for this project.
        </CardContent>
      </Card>
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sequence Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="font-semibold">{sequence.status}</div>
            <div className="text-muted-foreground">Started {formatDate(sequence.startedAt)}</div>
            {sequence.closedAt && (
              <div className="text-muted-foreground">Closed {formatDate(sequence.closedAt)}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Next Pending Task</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {nextPendingTask ? (
              <>
                <div className="font-semibold">{TASK_KIND_LABELS[nextPendingTask.kind] ?? nextPendingTask.kind}</div>
                <div>{formatDate(nextPendingTask.dueDate)}</div>
                <div className="text-muted-foreground">{nextPendingTask.status}</div>
              </>
            ) : (
              <div className="text-muted-foreground">No pending follow-up tasks remain.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Scheduled Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="font-semibold">{tasks.length}</div>
            <div className="text-muted-foreground">
              {tasks.map((task) => TASK_KIND_LABELS[task.kind] ?? task.kind).join(', ')}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scheduled Tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tasks.map((task) => {
            const draft = drafts[task.id] ?? {
              draftSubject: task.draftSubject,
              draftBody: task.draftBody,
              notes: task.notes ?? '',
            };
            const isTaskPending = task.status === EstimateFollowUpTaskStatus.PENDING;

            return (
              <div key={task.id} data-task-id={task.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">
                      {TASK_KIND_LABELS[task.kind] ?? task.kind}
                    </h3>
                    <p className="text-sm text-muted-foreground">Due {formatDate(task.dueDate)}</p>
                  </div>
                  <div className="text-sm font-medium">{task.status}</div>
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
                      onInput={(event) =>
                        handleDraftChange(
                          task.id,
                          'draftSubject',
                          (event.target as HTMLInputElement).value
                        )
                      }
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
                      onInput={(event) =>
                        handleDraftChange(
                          task.id,
                          'draftBody',
                          (event.target as HTMLTextAreaElement).value
                        )
                      }
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
                      onInput={(event) =>
                        handleDraftChange(
                          task.id,
                          'notes',
                          (event.target as HTMLTextAreaElement).value
                        )
                      }
                      disabled={isSequenceClosed}
                      rows={3}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSaveDraft(task.id)}
                      disabled={isSequenceClosed || savingTaskId === task.id}
                    >
                      {savingTaskId === task.id ? 'Saving...' : 'Save Draft'}
                    </Button>
                    <Button
                      type="button"
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Close Sequence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sequence.closedSummary && (
            <div className="rounded-md bg-muted px-4 py-3 text-sm">
              <div className="font-medium">Closed Summary</div>
              <div className="mt-1 text-muted-foreground">{sequence.closedSummary}</div>
            </div>
          )}

          {isSequenceClosed ? (
            <div className="space-y-1 text-sm text-muted-foreground">
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
                  onInput={(event) =>
                    setClosedSummary((event.target as HTMLTextAreaElement).value)
                  }
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
                      onInput={(event) =>
                        setLostReasonNotes((event.target as HTMLTextAreaElement).value)
                      }
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {validationError && (
                <div className="text-sm text-destructive">{validationError}</div>
              )}

              <Button type="button" onClick={handleCloseSequence} disabled={isClosingSequence}>
                {isClosingSequence ? 'Closing...' : 'Close Sequence'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
