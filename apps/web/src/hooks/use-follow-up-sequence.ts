import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  EstimateFollowUpTaskStatus,
  EstimateFollowUpSequenceStatus,
  type EstimateFollowUpLostReasonCode,
  type EstimateFollowUpTask,
  type ProjectFollowUpSummary,
} from '@fencetastic/shared';

interface UpdateFollowUpTaskInput {
  draftSubject?: string;
  draftBody?: string;
  notes?: string | null;
}

interface CloseFollowUpSequenceInput {
  status:
    | EstimateFollowUpSequenceStatus.WON
    | EstimateFollowUpSequenceStatus.LOST
    | EstimateFollowUpSequenceStatus.CLOSED;
  closedSummary?: string;
  lostReasonCode?: EstimateFollowUpLostReasonCode | null;
  lostReasonNotes?: string | null;
}

interface UseFollowUpSequenceReturn {
  summary: ProjectFollowUpSummary | null;
  isLoading: boolean;
  error: string | null;
  savingTaskId: string | null;
  completingTaskId: string | null;
  isClosingSequence: boolean;
  refetch: () => Promise<void>;
  saveTaskDraft: (taskId: string, input: UpdateFollowUpTaskInput) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  closeSequence: (sequenceId: string, input: CloseFollowUpSequenceInput) => Promise<void>;
}

function sortTasks(tasks: EstimateFollowUpTask[]) {
  return [...tasks].sort((left, right) => left.dueDate.localeCompare(right.dueDate));
}

function mergeTask(summary: ProjectFollowUpSummary | null, updatedTask: EstimateFollowUpTask) {
  if (!summary) {
    return summary;
  }

  const tasks = sortTasks(
    summary.tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task))
  );

  return {
    ...summary,
    tasks,
    nextPendingTask:
      tasks.find((task) => task.status === EstimateFollowUpTaskStatus.PENDING) ?? null,
  };
}

export function useFollowUpSequence(projectId: string | undefined): UseFollowUpSequenceReturn {
  const [summary, setSummary] = useState<ProjectFollowUpSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [isClosingSequence, setIsClosingSequence] = useState(false);

  const fetchSummary = useCallback(async () => {
    if (!projectId) {
      setSummary(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get(`/follow-ups/projects/${projectId}`);
      setSummary(response.data.data ?? null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load follow-up sequence';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const saveTaskDraft = useCallback(async (taskId: string, input: UpdateFollowUpTaskInput) => {
    try {
      setSavingTaskId(taskId);
      setError(null);
      const response = await api.patch(`/follow-ups/tasks/${taskId}`, input);
      setSummary((current) => mergeTask(current, response.data.data));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save follow-up draft';
      setError(message);
      throw err;
    } finally {
      setSavingTaskId(null);
    }
  }, []);

  const completeTask = useCallback(async (taskId: string) => {
    try {
      setCompletingTaskId(taskId);
      setError(null);
      const response = await api.post(`/follow-ups/tasks/${taskId}/complete`);
      setSummary((current) => mergeTask(current, response.data.data));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to complete follow-up task';
      setError(message);
      throw err;
    } finally {
      setCompletingTaskId(null);
    }
  }, []);

  const closeSequence = useCallback(
    async (sequenceId: string, input: CloseFollowUpSequenceInput) => {
      try {
        setIsClosingSequence(true);
        setError(null);
        const response = await api.post(`/follow-ups/sequences/${sequenceId}/close`, input);
        setSummary(response.data.data ?? null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to close follow-up sequence';
        setError(message);
        throw err;
      } finally {
        setIsClosingSequence(false);
      }
    },
    []
  );

  return {
    summary,
    isLoading,
    error,
    savingTaskId,
    completingTaskId,
    isClosingSequence,
    refetch: fetchSummary,
    saveTaskDraft,
    completeTask,
    closeSequence,
  };
}
