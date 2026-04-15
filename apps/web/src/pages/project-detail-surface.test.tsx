import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectDetailPage from './project-detail';

const apiGetMock = vi.fn();
const navigateMock = vi.fn();
const useProjectMock = vi.fn();
const useSubcontractorsMock = vi.fn();
const useNotesMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
    patch: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
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

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ id: 'project-1' }),
  };
});

function makeProjectDetail() {
  return {
    id: 'project-1',
    customer: 'Sharon Harbach',
    address: '321 River Meadows Ln, Argyle, TX 76226',
    description: 'Wood privacy fence',
    fenceType: 'WOOD',
    status: 'SIGNED_CONTRACT',
    projectTotal: 0,
    paymentMethod: 'CHECK',
    moneyReceived: 0,
    customerPaid: 0,
    forecastedExpenses: 0,
    materialsCost: 0,
    contractDate: null,
    installDate: null,
    completedDate: null,
    estimateDate: null,
    followUpDate: null,
    linearFeet: null,
    rateTemplateId: null,
    subcontractor: 'Heidi Lowery',
    notes: null,
    commissionOwed: null,
    commissionPaid: null,
    memesCommission: null,
    aimannsCommission: null,
    financeProjectMode: 'IMPORTED',
    profitabilitySource: 'SPREADSHEET_IMPORTED',
    receivablesSource: 'SPREADSHEET_IMPORTED',
    payablesSource: 'SPREADSHEET_IMPORTED',
    commissionsSource: 'SPREADSHEET_IMPORTED',
    importedSource: 'Project Schedule.xlsx',
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
      totalExpenses: 0,
      adnaanCommission: 0,
      memeCommission: 0,
      grossProfit: 0,
      aimannDeduction: 0,
      netProfit: 0,
      profitPercent: 0,
    },
  } as const;
}

describe('ProjectDetailPage surface styling', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    apiGetMock.mockReset();
    navigateMock.mockReset();
    useProjectMock.mockReset();
    useSubcontractorsMock.mockReset();
    useNotesMock.mockReset();
    useAuthMock.mockReset();

    apiGetMock.mockResolvedValue({ data: { data: [] } });
    useProjectMock.mockReturnValue({
      project: makeProjectDetail(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    useSubcontractorsMock.mockReturnValue({
      data: [],
      addSub: vi.fn(),
      updateSub: vi.fn(),
      deleteSub: vi.fn(),
    });
    useNotesMock.mockReturnValue({
      data: [],
      refetch: vi.fn(),
      createNote: vi.fn(),
      updateNote: vi.fn(),
      deleteNote: vi.fn(),
      uploadPhoto: vi.fn(),
    });
    useAuthMock.mockReturnValue({ user: { id: 'user-1', name: 'Adnaan' } });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders the detail screen with higher-contrast shell treatments', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ProjectDetailPage />
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('Sharon Harbach');
    expect(container.textContent).toContain('Back to Projects');

    const darkShells = container.querySelectorAll('.bg-\\[\\#161d27\\]');
    expect(darkShells.length).toBeGreaterThanOrEqual(2);

    const whiteCards = container.querySelectorAll('.bg-white');
    expect(whiteCards.length).toBeGreaterThan(3);

    const detailValue = Array.from(container.querySelectorAll('span')).find((node) =>
      node.textContent?.includes('Wood privacy fence')
    );
    const detailValueText = detailValue?.querySelector('span');
    expect(detailValueText?.className).toContain('text-slate-950');

    const commissionTab = Array.from(container.querySelectorAll('button')).find((node) =>
      node.textContent?.includes('Commission')
    );
    await act(async () => {
      commissionTab?.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          button: 0,
        })
      );
    });

    const overrideValue = container.querySelector('[aria-label="Edit Commission Owed"] span');
    expect(overrideValue?.className).toContain('text-slate-950');

    const inverseValue = container.querySelector('[aria-label="Edit Notes"] span');
    expect(inverseValue?.className).toContain('text-white');
  }, 15000);
});
