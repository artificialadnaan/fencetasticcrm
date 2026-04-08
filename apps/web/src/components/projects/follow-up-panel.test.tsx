import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EstimateFollowUpLostReasonCode,
  EstimateFollowUpSequenceStatus,
  EstimateFollowUpTaskKind,
  EstimateFollowUpTaskStatus,
  type ProjectFollowUpSummary,
} from '@fencetastic/shared';
import ProjectDetailPage from '@/pages/project-detail';
import { CreateProjectDialog } from './create-project-dialog';
import { FollowUpPanel } from './follow-up-panel';

const apiGetMock = vi.fn();
const apiPatchMock = vi.fn();
const apiPostMock = vi.fn();
const navigateMock = vi.fn();
const useProjectMock = vi.fn();
const useSubcontractorsMock = vi.fn();
const useNotesMock = vi.fn();
const useAuthMock = vi.fn();
const useRateTemplatesMock = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
    patch: (...args: unknown[]) => apiPatchMock(...args),
    post: (...args: unknown[]) => apiPostMock(...args),
  },
}));

vi.mock('@/hooks/use-project', () => ({
  useProject: (...args: unknown[]) => useProjectMock(...args),
}));

vi.mock('@/hooks/use-subcontractors', () => ({
  useSubcontractors: (...args: unknown[]) => useSubcontractorsMock(...args),
}));

vi.mock('@/hooks/use-notes', () => ({
  useNotes: (...args: unknown[]) => useNotesMock(...args),
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: (...args: unknown[]) => useAuthMock(...args),
}));

vi.mock('@/hooks/use-rate-templates', () => ({
  useRateTemplates: (...args: unknown[]) => useRateTemplatesMock(...args),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ id: 'project-1' }),
  };
});

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

function changeField(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string
) {
  element.value = value;
  Simulate.change(element);
}

function makeProjectDetail() {
  return {
    id: 'project-1',
    customer: 'Acme Fence',
    address: '123 Oak St',
    description: 'Wood privacy fence',
    fenceType: 'WOOD',
    status: 'ESTIMATE',
    projectTotal: 5000,
    paymentMethod: 'CHECK',
    moneyReceived: 0,
    customerPaid: 0,
    forecastedExpenses: 2200,
    materialsCost: 1200,
    contractDate: '2026-04-01',
    installDate: '2026-04-15',
    completedDate: null,
    estimateDate: '2026-04-08',
    followUpDate: '2026-04-09',
    linearFeet: 120,
    rateTemplateId: null,
    subcontractor: null,
    notes: null,
    commissionOwed: null,
    commissionPaid: null,
    memesCommission: null,
    aimannsCommission: null,
    createdById: 'user-1',
    isDeleted: false,
    deletedAt: null,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-08T00:00:00.000Z',
    subcontractorPayments: [],
    projectNotes: [],
    commissionSnapshot: null,
    commissionPreview: {
      moneyReceived: 0,
      totalExpenses: 2200,
      adnaanCommission: 0,
      memeCommission: 0,
      grossProfit: 2800,
      aimannDeduction: 0,
      netProfit: 2800,
      profitPercent: 56,
    },
  } as const;
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
    navigateMock.mockReset();
    useProjectMock.mockReset();
    useSubcontractorsMock.mockReset();
    useNotesMock.mockReset();
    useAuthMock.mockReset();
    useRateTemplatesMock.mockReset();
    useSubcontractorsMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      addSub: vi.fn(),
      updateSub: vi.fn(),
      deleteSub: vi.fn(),
    });
    useNotesMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      createNote: vi.fn(),
      updateNote: vi.fn(),
      deleteNote: vi.fn(),
      uploadPhoto: vi.fn(),
    });
    useAuthMock.mockReturnValue({
      user: { id: 'user-1', name: 'Adnaan', email: 'adnaan@fencetastic.com' },
    });
    useRateTemplatesMock.mockReturnValue({ templates: [] });
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

  it('preserves unsaved draft edits and close inputs when another task save refreshes the summary', async () => {
    apiGetMock.mockResolvedValue({ data: { data: makeSummary() } });
    apiPatchMock.mockResolvedValue({
      data: {
        data: {
          ...makeSummary().tasks[1],
          draftSubject: 'Saved task 2 subject',
          draftBody: 'Saved task 2 body',
          notes: 'Saved task 2 notes',
        },
      },
    });

    await act(async () => {
      root.render(<FollowUpPanel projectId="project-1" />);
    });
    await flushEffects();

    const firstTaskCard = container.querySelector('[data-task-id="task-1"]');
    const secondTaskCard = container.querySelector('[data-task-id="task-2"]');
    const firstTaskSubject = firstTaskCard?.querySelector('input[name="draftSubject"]') as HTMLInputElement | null;
    const outcomeSelect = container.querySelector('select[name="closeStatus"]') as HTMLSelectElement | null;
    const summaryInput = container.querySelector('textarea[name="closedSummary"]') as HTMLTextAreaElement | null;

    expect(firstTaskCard).not.toBeNull();
    expect(secondTaskCard).not.toBeNull();
    expect(firstTaskSubject).not.toBeNull();
    expect(outcomeSelect).not.toBeNull();
    expect(summaryInput).not.toBeNull();

    await act(async () => {
      if (firstTaskSubject) {
        changeField(firstTaskSubject, 'Unsaved task 1 subject');
      }
      if (outcomeSelect) {
        changeField(outcomeSelect, EstimateFollowUpSequenceStatus.LOST);
      }
      if (summaryInput) {
        changeField(summaryInput, 'Customer requested more time');
      }
    });

    const reasonSelect = container.querySelector('select[name="lostReasonCode"]') as HTMLSelectElement | null;
    const lostNotesInput = container.querySelector('textarea[name="lostReasonNotes"]') as HTMLTextAreaElement | null;
    const secondTaskSaveButton = Array.from(secondTaskCard?.querySelectorAll('button') ?? []).find((button) =>
      button.textContent?.includes('Save Draft')
    );

    expect(reasonSelect).not.toBeNull();
    expect(lostNotesInput).not.toBeNull();
    expect(secondTaskSaveButton).not.toBeUndefined();

    await act(async () => {
      if (reasonSelect) {
        changeField(reasonSelect, EstimateFollowUpLostReasonCode.TIMING);
      }
      if (lostNotesInput) {
        changeField(lostNotesInput, 'Asked to revisit in June');
      }
    });

    await act(async () => {
      secondTaskSaveButton?.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          button: 0,
        })
      );
    });
    await flushEffects();

    expect(apiPatchMock).toHaveBeenCalledWith('/follow-ups/tasks/task-2', {
      draftSubject: 'Second follow-up',
      draftBody: 'Wanted to check back in.',
      notes: '',
    });
    expect(firstTaskSubject?.value).toBe('Unsaved task 1 subject');
    expect((container.querySelector('select[name="closeStatus"]') as HTMLSelectElement | null)?.value).toBe(
      EstimateFollowUpSequenceStatus.LOST
    );
    expect((container.querySelector('textarea[name="closedSummary"]') as HTMLTextAreaElement | null)?.value).toBe(
      'Customer requested more time'
    );
    expect((container.querySelector('select[name="lostReasonCode"]') as HTMLSelectElement | null)?.value).toBe(
      EstimateFollowUpLostReasonCode.TIMING
    );
    expect((container.querySelector('textarea[name="lostReasonNotes"]') as HTMLTextAreaElement | null)?.value).toBe(
      'Asked to revisit in June'
    );
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
        changeField(summaryInput, 'Customer chose another contractor');
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
        changeField(reasonSelect, EstimateFollowUpLostReasonCode.CHOSE_COMPETITOR);
      }
    });
    await act(async () => {
      if (notesInput) {
        changeField(notesInput, 'Went with a lower bid');
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
        changeField(subjectInput, 'Updated subject');
      }
    });
    await act(async () => {
      if (bodyInput) {
        changeField(bodyInput, 'Updated draft body');
      }
    });
    await act(async () => {
      if (notesInput) {
        changeField(notesInput, 'Updated task notes');
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

describe('Task 5 integrations', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    apiGetMock.mockReset();
    apiPatchMock.mockReset();
    apiPostMock.mockReset();
    navigateMock.mockReset();
    useProjectMock.mockReset();
    useSubcontractorsMock.mockReset();
    useNotesMock.mockReset();
    useAuthMock.mockReset();
    useRateTemplatesMock.mockReset();
    useProjectMock.mockReturnValue({
      project: makeProjectDetail(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    useSubcontractorsMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      addSub: vi.fn(),
      updateSub: vi.fn(),
      deleteSub: vi.fn(),
    });
    useNotesMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      createNote: vi.fn(),
      updateNote: vi.fn(),
      deleteNote: vi.fn(),
      uploadPhoto: vi.fn(),
    });
    useAuthMock.mockReturnValue({
      user: { id: 'user-1', name: 'Adnaan', email: 'adnaan@fencetastic.com' },
    });
    useRateTemplatesMock.mockReturnValue({ templates: [] });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders the project detail Follow-Up tab and no longer exposes the legacy follow-up date editor', async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url.startsWith('/transactions?projectId=project-1&type=INCOME')) {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url.startsWith('/transactions?projectId=project-1&type=EXPENSE')) {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url === '/follow-ups/projects/project-1') {
        return Promise.resolve({ data: { data: makeSummary() } });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    await act(async () => {
      root.render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ProjectDetailPage />
        </MemoryRouter>
      );
    });
    await flushEffects();

    expect(container.textContent).not.toContain('Follow-Up Date');

    const followUpTab = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Follow-Up')
    );
    expect(followUpTab).not.toBeUndefined();

    await act(async () => {
      followUpTab?.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          button: 0,
        })
      );
    });
    await flushEffects();

    expect(container.textContent).toContain('Sequence Status');
    expect(apiGetMock).toHaveBeenCalledWith('/follow-ups/projects/project-1');
  });

  it('no longer exposes the legacy followUpDate input in the create project dialog', async () => {
    await act(async () => {
      root.render(
        <CreateProjectDialog
          onCreated={vi.fn()}
          open
          onOpenChange={vi.fn()}
        />
      );
    });
    await flushEffects();

    expect(document.querySelector('#estimateDate')).not.toBeNull();
    expect(document.querySelector('#followUpDate')).toBeNull();
    expect(document.body.textContent).not.toContain('Follow-Up Date');
  });
});
