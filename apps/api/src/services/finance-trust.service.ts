import type { FinanceTrustOverview, FinanceTrustProjectRow, FinanceTrustSummary, ProjectStatus } from '@fencetastic/shared';
import { FinanceProjectMode } from '@fencetastic/shared';
import { prisma } from '../lib/prisma';

type FinanceTrustProjectRecord = {
  id: string;
  customer: string;
  address: string;
  status: string;
  contractDate: Date;
  financeProjectMode: string | null;
  receivablesSource: string | null;
  payablesSource: string | null;
  commissionsSource: string | null;
  profitabilitySource: string | null;
  importedAt: Date | null;
  importedSource: string | null;
  lastRecalculatedAt: Date | null;
  lastManualFinanceEditAt: Date | null;
  reconciliationRequiredAt: Date | null;
  reconciliationNotes: string | null;
};

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function toProjectRow(project: FinanceTrustProjectRecord): FinanceTrustProjectRow {
  return {
    id: project.id,
    customer: project.customer,
    address: project.address,
    status: project.status as ProjectStatus,
    contractDate: project.contractDate.toISOString().split('T')[0],
    importedSource: project.importedSource,
    importedAt: toIso(project.importedAt),
    lastRecalculatedAt: toIso(project.lastRecalculatedAt),
    lastManualFinanceEditAt: toIso(project.lastManualFinanceEditAt),
    reconciliationRequiredAt: toIso(project.reconciliationRequiredAt),
    reconciliationNotes: project.reconciliationNotes,
    financeTrust: {
      projectMode: (project.financeProjectMode ?? FinanceProjectMode.COMPUTED) as FinanceTrustProjectRow['financeTrust']['projectMode'],
      receivablesSource: (project.receivablesSource ?? 'CRM_COMPUTED') as FinanceTrustProjectRow['financeTrust']['receivablesSource'],
      payablesSource: (project.payablesSource ?? 'CRM_COMPUTED') as FinanceTrustProjectRow['financeTrust']['payablesSource'],
      commissionsSource: (project.commissionsSource ?? 'CRM_COMPUTED') as FinanceTrustProjectRow['financeTrust']['commissionsSource'],
      profitabilitySource: (project.profitabilitySource ?? 'CRM_COMPUTED') as FinanceTrustProjectRow['financeTrust']['profitabilitySource'],
      importedAt: toIso(project.importedAt),
      importedSource: project.importedSource,
      lastRecalculatedAt: toIso(project.lastRecalculatedAt),
      lastManualFinanceEditAt: toIso(project.lastManualFinanceEditAt),
      reconciliationRequiredAt: toIso(project.reconciliationRequiredAt),
      reconciliationNotes: project.reconciliationNotes,
    },
  };
}

export async function getFinanceTrustOverview(): Promise<FinanceTrustOverview> {
  const projects = await prisma.project.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      customer: true,
      address: true,
      status: true,
      contractDate: true,
      financeProjectMode: true,
      receivablesSource: true,
      payablesSource: true,
      commissionsSource: true,
      profitabilitySource: true,
      importedAt: true,
      importedSource: true,
      lastRecalculatedAt: true,
      lastManualFinanceEditAt: true,
      reconciliationRequiredAt: true,
      reconciliationNotes: true,
    },
    orderBy: [{ updatedAt: 'desc' }],
  });

  const summary: FinanceTrustSummary = {
    totalProjects: projects.length,
    importedProjects: projects.filter((project) => project.financeProjectMode === FinanceProjectMode.IMPORTED).length,
    computedProjects: projects.filter((project) => project.financeProjectMode === FinanceProjectMode.COMPUTED).length,
    manualOverrideProjects: projects.filter((project) => project.financeProjectMode === FinanceProjectMode.MANUAL_OVERRIDE).length,
    mixedProjects: projects.filter((project) => project.financeProjectMode === FinanceProjectMode.MIXED).length,
    reconciliationRequiredProjects: projects.filter((project) => project.financeProjectMode === FinanceProjectMode.RECONCILIATION_REQUIRED || project.reconciliationRequiredAt !== null).length,
    projectsWithManualFinanceEdits: projects.filter((project) => project.lastManualFinanceEditAt !== null).length,
    projectsWithImportedFinance: projects.filter((project) => project.importedAt !== null).length,
    lastImportedAt:
      projects
        .map((project) => project.importedAt)
        .filter((value): value is Date => value !== null)
        .sort((left, right) => right.getTime() - left.getTime())[0]?.toISOString() ?? null,
  };

  const reconciliationQueue = projects
    .filter((project) => project.reconciliationRequiredAt !== null || project.financeProjectMode === FinanceProjectMode.RECONCILIATION_REQUIRED)
    .sort((left, right) => (right.reconciliationRequiredAt?.getTime() ?? 0) - (left.reconciliationRequiredAt?.getTime() ?? 0))
    .map(toProjectRow);

  const manualOverrideQueue = projects
    .filter((project) => project.financeProjectMode === FinanceProjectMode.MANUAL_OVERRIDE || project.lastManualFinanceEditAt !== null)
    .sort((left, right) => (right.lastManualFinanceEditAt?.getTime() ?? 0) - (left.lastManualFinanceEditAt?.getTime() ?? 0))
    .map(toProjectRow);

  const recentImports = projects
    .filter((project) => project.importedAt !== null)
    .sort((left, right) => (right.importedAt?.getTime() ?? 0) - (left.importedAt?.getTime() ?? 0))
    .slice(0, 12)
    .map(toProjectRow);

  return {
    summary,
    reconciliationQueue,
    manualOverrideQueue,
    recentImports,
  };
}
