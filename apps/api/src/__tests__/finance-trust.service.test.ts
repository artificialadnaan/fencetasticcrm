import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinanceProjectMode, FinanceSubdomainSource, ProjectStatus } from '@fencetastic/shared';

const prismaMock = vi.hoisted(() => ({
  prisma: {
    project: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../lib/prisma', () => ({
  prisma: prismaMock.prisma,
}));

describe('finance-trust.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('summarizes trust modes and builds reconciliation, manual override, and import queues', async () => {
    prismaMock.prisma.project.findMany.mockResolvedValue([
      {
        id: 'recon-1',
        customer: 'Imported Missing',
        address: '101 Fence Way',
        status: ProjectStatus.OPEN,
        contractDate: new Date('2026-04-01T00:00:00.000Z'),
        financeProjectMode: FinanceProjectMode.RECONCILIATION_REQUIRED,
        receivablesSource: FinanceSubdomainSource.RECONCILIATION_REQUIRED,
        payablesSource: FinanceSubdomainSource.IMPORTED_ACTUAL,
        commissionsSource: FinanceSubdomainSource.IMPORTED_ACTUAL,
        profitabilitySource: FinanceSubdomainSource.IMPORTED_ACTUAL,
        importedAt: new Date('2026-04-12T10:00:00.000Z'),
        importedSource: 'Completed Projects',
        lastRecalculatedAt: null,
        lastManualFinanceEditAt: null,
        reconciliationRequiredAt: new Date('2026-04-14T08:00:00.000Z'),
        reconciliationNotes: 'Address mismatch from spreadsheet import',
      },
      {
        id: 'manual-1',
        customer: 'Manual Override Job',
        address: '22 Oak Street',
        status: ProjectStatus.COMPLETED,
        contractDate: new Date('2026-03-10T00:00:00.000Z'),
        financeProjectMode: FinanceProjectMode.MANUAL_OVERRIDE,
        receivablesSource: FinanceSubdomainSource.MANUAL_OVERRIDE,
        payablesSource: FinanceSubdomainSource.MANUAL_OVERRIDE,
        commissionsSource: FinanceSubdomainSource.MANUAL_OVERRIDE,
        profitabilitySource: FinanceSubdomainSource.MANUAL_OVERRIDE,
        importedAt: new Date('2026-04-13T12:00:00.000Z'),
        importedSource: 'Open',
        lastRecalculatedAt: null,
        lastManualFinanceEditAt: new Date('2026-04-14T11:00:00.000Z'),
        reconciliationRequiredAt: null,
        reconciliationNotes: null,
      },
      {
        id: 'computed-1',
        customer: 'Computed Job',
        address: '77 Cedar Ave',
        status: ProjectStatus.OPEN,
        contractDate: new Date('2026-04-05T00:00:00.000Z'),
        financeProjectMode: FinanceProjectMode.COMPUTED,
        receivablesSource: FinanceSubdomainSource.CRM_COMPUTED,
        payablesSource: FinanceSubdomainSource.CRM_COMPUTED,
        commissionsSource: FinanceSubdomainSource.CRM_COMPUTED,
        profitabilitySource: FinanceSubdomainSource.CRM_COMPUTED,
        importedAt: null,
        importedSource: null,
        lastRecalculatedAt: new Date('2026-04-14T09:00:00.000Z'),
        lastManualFinanceEditAt: null,
        reconciliationRequiredAt: null,
        reconciliationNotes: null,
      },
    ]);

    const { getFinanceTrustOverview } = await import('../services/finance-trust.service');
    const result = await getFinanceTrustOverview();

    expect(result.summary).toEqual({
      totalProjects: 3,
      importedProjects: 0,
      computedProjects: 1,
      manualOverrideProjects: 1,
      mixedProjects: 0,
      reconciliationRequiredProjects: 1,
      projectsWithManualFinanceEdits: 1,
      projectsWithImportedFinance: 2,
      lastImportedAt: '2026-04-13T12:00:00.000Z',
    });
    expect(result.reconciliationQueue).toHaveLength(1);
    expect(result.reconciliationQueue[0]).toEqual(
      expect.objectContaining({
        id: 'recon-1',
        customer: 'Imported Missing',
        reconciliationNotes: 'Address mismatch from spreadsheet import',
      })
    );
    expect(result.manualOverrideQueue.map((project) => project.id)).toEqual(['manual-1']);
    expect(result.recentImports.map((project) => project.id)).toEqual(['manual-1', 'recon-1']);
  });
});
