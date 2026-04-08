import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EstimateFollowUpLostReasonCode,
  EstimateFollowUpSequenceStatus,
  EstimateFollowUpTaskKind,
  EstimateFollowUpTaskStatus,
  type ProjectFollowUpSummary,
} from '@fencetastic/shared';
import { FollowUpPanel } from './follow-up-panel';

const apiGetMock = vi.fn();
const apiPatchMock = vi.fn();
const apiPostMock = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
    patch: (...args: unknown[]) => apiPatchMock(...args),
    post: (...args: unknown[]) => apiPostMock(...args),
  },
}));

function makeSummary(): ProjectFollowUpSummary {
  return {
    sequence: {
      id: 'sequence-1',
      projectId: 'project-1',
      status: EstimateFollowUpSequenceStatus.ACTIVE,
      startedAt: '2026-04-08T00:00:00.000Z',
      closedAt: null,
      closedSummary: null,
      lostReasonCode: null,
      lostReasonNotes: null,
      createdAt: '2026-04-08T00:00:00.000Z',
      updatedAt: '2026-04-08T00:00:00.000Z',
    },
    nextPendingTask: {
      id: 'task-1',
      sequenceId: 'sequence-1',
      projectId: 'project-1',
      kind: EstimateFollowUpTaskKind.DAY_1,
      dueDate: '2026-04-09',
      status: EstimateFollowUpTaskStatus.PENDING,
      draftSubject: 'Checking in on your fence estimate',
      draftBody: 'Wanted to follow up on the estimate.',
      completedAt: null,
      completedByUserId: null,
      notes: 'Call after lunch',
      createdAt: '2026-04-08T00:00:00.000Z',
      updatedAt: '2026-04-08T00:00:00.000Z',
    },
    tasks: [
      {
        id: 'task-1',
        sequenceId: 'sequence-1',
        projectId: 'project-1',
        kind: EstimateFollowUpTaskKind.DAY_1,
        dueDate: '2026-04-09',
        status: EstimateFollowUpTaskStatus.PENDING,
        draftSubject: 'Checking in on your fence estimate',
        draftBody: 'Wanted to follow up on the estimate.',
        completedAt: null,
        completedByUserId: null,
        notes: 'Call after lunch',
        createdAt: '2026-04-08T00:00:00.000Z',
        updatedAt: '2026-04-08T00:00:00.000Z',
      },
      {
        id: 'task-2',
        sequenceId: 'sequence-1',
        projectId: 'project-1',
        kind: EstimateFollowUpTaskKind.DAY_3,
        dueDate: '2026-04-11',
        status: EstimateFollowUpTaskStatus.PENDING,
        draftSubject: 'Second follow-up',
        draftBody: 'Wanted to check back in.',
        completedAt: null,
        completedByUserId: null,
        notes: null,
        createdAt: '2026-04-08T00:00:00.000Z',
        updatedAt: '2026-04-08T00:00:00.000Z',
      },
      {
        id: 'task-3',
        sequenceId: 'sequence-1',
        projectId: 'project-1',
        kind: EstimateFollowUpTaskKind.DAY_7,
        dueDate: '2026-04-15',
        status: EstimateFollowUpTaskStatus.SKIPPED,
        draftSubject: 'Third follow-up',
        draftBody: 'Checking again.',
        completedAt: null,
        completedByUserId: null,
        notes: null,
        createdAt: '2026-04-08T00:00:00.000Z',
        updatedAt: '2026-04-08T00:00:00.000Z',
      },
      {
        id: 'task-4',
        sequenceId: 'sequence-1',
        projectId: 'project-1',
        kind: EstimateFollowUpTaskKind.DAY_14,
        dueDate: '2026-04-22',
        status: EstimateFollowUpTaskStatus.COMPLETED,
        draftSubject: 'Final follow-up',
        draftBody: 'Final check-in.',
        completedAt: '2026-04-22T10:00:00.000Z',
        completedByUserId: 'user-1',
        notes: 'Customer replied',
        createdAt: '2026-04-08T00:00:00.000Z',
        updatedAt: '2026-04-22T10:00:00.000Z',
      },
    ],
  };
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('FollowUpPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    apiGetMock.mockReset();
    apiPatchMock.mockReset();
    apiPostMock.mockReset();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders sequence status, next task, and all scheduled tasks', async () => {
    apiGetMock.mockResolvedValue({ data: { data: makeSummary() } });

    await act(async () => {
      root.render(<FollowUpPanel projectId="project-1" />);
    });
    await flushEffects();

    expect(apiGetMock).toHaveBeenCalledWith('/follow-ups/projects/project-1');
    expect(container.textContent).toContain('Sequence Status');
    expect(container.textContent).toContain('ACTIVE');
    expect(container.textContent).toContain('Next Pending Task');
    expect(container.textContent).toContain('Day 1');
    expect(container.textContent).toContain('Apr 9, 2026');
    expect(container.textContent).toContain('Scheduled Tasks');
    expect(container.textContent).toContain('Day 3');
    expect(container.textContent).toContain('Day 7');
    expect(container.textContent).toContain('Day 14');
  });

  it('requires both lost reason code and notes before closing as LOST', async () => {
    apiGetMock.mockResolvedValue({ data: { data: makeSummary() } });
    apiPostMock.mockResolvedValue({
      data: {
        data: {
          ...makeSummary(),
          sequence: {
            ...makeSummary().sequence!,
            status: EstimateFollowUpSequenceStatus.LOST,
            closedAt: '2026-04-08T12:00:00.000Z',
            closedSummary: 'Customer chose another contractor',
            lostReasonCode: EstimateFollowUpLostReasonCode.CHOSE_COMPETITOR,
            lostReasonNotes: 'Went with a lower bid',
          },
        },
      },
    });

    await act(async () => {
      root.render(<FollowUpPanel projectId="project-1" />);
    });
    await flushEffects();

    const outcomeSelect = container.querySelector('select[name="closeStatus"]') as HTMLSelectElement | null;
    expect(outcomeSelect).not.toBeNull();

    await act(async () => {
      if (outcomeSelect) {
        outcomeSelect.value = EstimateFollowUpSequenceStatus.LOST;
        outcomeSelect.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      }
    });

    const summaryInput = container.querySelector('textarea[name="closedSummary"]') as HTMLTextAreaElement | null;
    const closeButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Close Sequence')
    );
    expect(summaryInput).not.toBeNull();
    expect(closeButton).not.toBeUndefined();

    await act(async () => {
      if (summaryInput) {
        summaryInput.value = 'Customer chose another contractor';
        summaryInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        summaryInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      }
    });
    await act(async () => {
      closeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    });

    expect(apiPostMock).not.toHaveBeenCalledWith(
      '/follow-ups/sequences/sequence-1/close',
      expect.anything()
    );
    expect(container.textContent).toContain('Lost reason code and notes are required.');

    const reasonSelect = container.querySelector('select[name="lostReasonCode"]') as HTMLSelectElement | null;
    const notesInput = container.querySelector('textarea[name="lostReasonNotes"]') as HTMLTextAreaElement | null;
    expect(reasonSelect).not.toBeNull();
    expect(notesInput).not.toBeNull();

    await act(async () => {
      if (reasonSelect) {
        reasonSelect.value = EstimateFollowUpLostReasonCode.CHOSE_COMPETITOR;
        reasonSelect.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      }
    });
    await act(async () => {
      if (notesInput) {
        notesInput.value = 'Went with a lower bid';
        notesInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        notesInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      }
    });
    await act(async () => {
      closeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    });
    await flushEffects();

    expect(apiPostMock).toHaveBeenCalledWith('/follow-ups/sequences/sequence-1/close', {
      status: EstimateFollowUpSequenceStatus.LOST,
      closedSummary: 'Customer chose another contractor',
      lostReasonCode: EstimateFollowUpLostReasonCode.CHOSE_COMPETITOR,
      lostReasonNotes: 'Went with a lower bid',
    });
  });

  it('saves draft edits and completes a task', async () => {
    apiGetMock.mockResolvedValue({ data: { data: makeSummary() } });
    apiPatchMock.mockResolvedValue({
      data: {
        data: {
          ...makeSummary().tasks[0],
          draftSubject: 'Updated subject',
          draftBody: 'Updated draft body',
          notes: 'Updated task notes',
        },
      },
    });
    apiPostMock.mockResolvedValue({
      data: {
        data: {
          ...makeSummary().tasks[0],
          status: EstimateFollowUpTaskStatus.COMPLETED,
          completedAt: '2026-04-08T13:00:00.000Z',
          completedByUserId: 'user-1',
        },
      },
    });

    await act(async () => {
      root.render(<FollowUpPanel projectId="project-1" />);
    });
    await flushEffects();

    const taskCard = container.querySelector('[data-task-id="task-1"]');
    expect(taskCard).not.toBeNull();

    const subjectInput = taskCard?.querySelector('input[name="draftSubject"]') as HTMLInputElement | null;
    const bodyInput = taskCard?.querySelector('textarea[name="draftBody"]') as HTMLTextAreaElement | null;
    const notesInput = taskCard?.querySelector('textarea[name="notes"]') as HTMLTextAreaElement | null;
    const saveButton = Array.from(taskCard?.querySelectorAll('button') ?? []).find((button) =>
      button.textContent?.includes('Save Draft')
    );
    const completeButton = Array.from(taskCard?.querySelectorAll('button') ?? []).find((button) =>
      button.textContent?.includes('Complete Task')
    );

    expect(subjectInput).not.toBeNull();
    expect(bodyInput).not.toBeNull();
    expect(notesInput).not.toBeNull();
    expect(saveButton).not.toBeUndefined();
    expect(completeButton).not.toBeUndefined();

    await act(async () => {
      if (subjectInput) {
        subjectInput.value = 'Updated subject';
        subjectInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        subjectInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      }
    });
    await act(async () => {
      if (bodyInput) {
        bodyInput.value = 'Updated draft body';
        bodyInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        bodyInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      }
    });
    await act(async () => {
      if (notesInput) {
        notesInput.value = 'Updated task notes';
        notesInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        notesInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      }
    });
    await act(async () => {
      saveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    });
    await flushEffects();

    expect(apiPatchMock).toHaveBeenCalledWith('/follow-ups/tasks/task-1', {
      draftSubject: 'Updated subject',
      draftBody: 'Updated draft body',
      notes: 'Updated task notes',
    });

    await act(async () => {
      completeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    });
    await flushEffects();

    expect(apiPostMock).toHaveBeenCalledWith('/follow-ups/tasks/task-1/complete');
    expect(taskCard?.textContent).toContain('COMPLETED');
  });
});
