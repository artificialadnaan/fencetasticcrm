import { act, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PageShell, { PageShellProvider, type PageShellConfig } from '@/components/layout/page-shell';
import SettingsPage from './settings';

const useRateTemplatesCrudMock = vi.fn();
const useOperatingExpensesMock = vi.fn();
const useFinanceTrustMock = vi.fn();

vi.mock('@/hooks/use-rate-templates-crud', () => ({
  useRateTemplatesCrud: () => useRateTemplatesCrudMock(),
}));

vi.mock('@/hooks/use-operating-expenses', () => ({
  useOperatingExpenses: () => useOperatingExpensesMock(),
}));

vi.mock('@/hooks/use-finance-trust', () => ({
  useFinanceTrust: () => useFinanceTrustMock(),
}));

vi.mock('@/components/settings/rate-templates-section', () => ({
  RateTemplatesSection: () => <div data-testid="rate-templates-section" />,
}));

vi.mock('@/components/settings/operating-expenses-section', () => ({
  OperatingExpensesSection: () => <div data-testid="operating-expenses-section" />,
}));

vi.mock('@/components/settings/change-password-form', () => ({
  ChangePasswordForm: () => <div data-testid="change-password-form" />,
}));

function ShellHarness({ children }: { children: ReactNode }) {
  const [shellConfig, setShellConfig] = useState<PageShellConfig>({});

  return (
    <PageShellProvider value={setShellConfig}>
      <PageShell onOpenSidebar={vi.fn()} {...shellConfig}>
        {children}
      </PageShell>
    </PageShellProvider>
  );
}

describe('SettingsPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    useRateTemplatesCrudMock.mockReturnValue({
      templates: [],
      isLoading: false,
      error: null,
      createTemplate: vi.fn(),
      updateTemplate: vi.fn(),
      deleteTemplate: vi.fn(),
    });
    useOperatingExpensesMock.mockReturnValue({
      expenses: [],
      isLoading: false,
      error: null,
      createExpense: vi.fn(),
      updateExpense: vi.fn(),
      deleteExpense: vi.fn(),
    });
    useFinanceTrustMock.mockReturnValue({
      data: {
        summary: {
          totalProjects: 61,
          importedProjects: 29,
          computedProjects: 24,
          manualOverrideProjects: 4,
          mixedProjects: 2,
          reconciliationRequiredProjects: 2,
          projectsWithManualFinanceEdits: 4,
          projectsWithImportedFinance: 31,
          lastImportedAt: '2026-04-15T12:00:00.000Z',
        },
        reconciliationQueue: [
          {
            id: 'project-1',
            customer: 'Imported Missing',
            address: '101 Fence Way',
            status: 'OPEN',
            contractDate: '2026-04-01',
            importedSource: 'Completed Projects',
            importedAt: '2026-04-15T12:00:00.000Z',
            lastRecalculatedAt: null,
            lastManualFinanceEditAt: null,
            reconciliationRequiredAt: '2026-04-15T12:30:00.000Z',
            reconciliationNotes: 'Address mismatch from spreadsheet import',
            financeTrust: {
              projectMode: 'RECONCILIATION_REQUIRED',
              receivablesSource: 'RECONCILIATION_REQUIRED',
              payablesSource: 'IMPORTED_ACTUAL',
              commissionsSource: 'IMPORTED_ACTUAL',
              profitabilitySource: 'IMPORTED_ACTUAL',
              importedAt: '2026-04-15T12:00:00.000Z',
              importedSource: 'Completed Projects',
              lastRecalculatedAt: null,
              lastManualFinanceEditAt: null,
              reconciliationRequiredAt: '2026-04-15T12:30:00.000Z',
              reconciliationNotes: 'Address mismatch from spreadsheet import',
            },
          },
        ],
        manualOverrideQueue: [],
        recentImports: [],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders the finance trust summary and reconciliation queue inside settings', () => {
    act(() => {
      root.render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ShellHarness>
            <SettingsPage />
          </ShellHarness>
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('Finance Trust');
    expect(container.textContent).toContain('Projects needing reconciliation');
    expect(container.textContent).toContain('Imported Missing');
    expect(container.textContent).toContain('Address mismatch from spreadsheet import');
    expect(container.textContent).toContain('Last spreadsheet import');
  });
});
