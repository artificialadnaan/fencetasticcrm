import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectsPage from './projects';

const navigateMock = vi.fn();
const useProjectsMock = vi.fn();

vi.mock('@/hooks/use-projects', () => ({
  useProjects: (...args: unknown[]) => useProjectsMock(...args),
}));

vi.mock('@/components/layout/page-shell', () => ({
  usePageShell: vi.fn(),
}));

vi.mock('@/components/projects/create-project-dialog', () => ({
  CreateProjectDialog: () => null,
}));

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function makeProject(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'p-1',
    customer: 'Acme Fence',
    address: '123 Oak St',
    fenceType: 'WOOD',
    status: 'OPEN',
    projectTotal: 5000,
    moneyReceived: 4500,
    customerPaid: 1500,
    installDate: '2026-04-01',
    receivable: 3500,
    profitPercent: 22.5,
    ...overrides,
  };
}

describe('ProjectsPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    navigateMock.mockReset();
    useProjectsMock.mockReset();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('marks the active status tab and opens a project row from the keyboard', () => {
    useProjectsMock.mockReturnValue({
      data: [makeProject()],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    act(() => {
      root.render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ProjectsPage />
        </MemoryRouter>
      );
    });

    const selectedTab = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('All')
    );
    const openTab = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Open')
    );
    const projectRow = container.querySelector('tbody tr');

    expect(selectedTab?.getAttribute('aria-pressed')).toBe('true');
    expect(openTab?.getAttribute('aria-pressed')).toBe('false');
    expect(projectRow?.getAttribute('tabindex')).toBe('0');

    act(() => {
      projectRow?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true,
        })
      );
    });

    expect(navigateMock).toHaveBeenCalledWith('/projects/p-1');
  });
});
