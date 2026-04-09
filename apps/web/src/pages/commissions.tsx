import { useState } from 'react';
import { SummaryCards } from '@/components/commissions/summary-cards';
import { ProjectBreakdownTable } from '@/components/commissions/project-breakdown-table';
import { PipelineProjection } from '@/components/commissions/pipeline-projection';
import { DebtTracker } from '@/components/commissions/debt-tracker';
import { DebtAdjustmentDialog } from '@/components/commissions/debt-adjustment-dialog';
import { useCommissionSummary, useCommissionsByProject, useCommissionPipeline } from '@/hooks/use-commissions';
import { useDebtBalance, useDebtLedger, useDebtAdjustment } from '@/hooks/use-debt';
import { usePageShell } from '@/components/layout/page-shell';

export default function CommissionsPage() {
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [page, setPage] = useState(1);

  const { data: summary, isLoading: summaryLoading, error: summaryError } = useCommissionSummary();
  const { data: byProject, pagination, isLoading: byProjectLoading, refetch: refetchByProject, error: byProjectError } = useCommissionsByProject(page);
  const { data: pipeline, isLoading: pipelineLoading, error: pipelineError } = useCommissionPipeline();
  const { balance, isLoading: balanceLoading, refetch: refetchBalance, error: balanceError } = useDebtBalance();
  const { data: ledger, isLoading: ledgerLoading, refetch: refetchLedger, error: ledgerError } = useDebtLedger();

  const pageError = summaryError ?? byProjectError ?? pipelineError ?? balanceError ?? ledgerError;
  const { submit, isSubmitting } = useDebtAdjustment();

  usePageShell({
    eyebrow: 'Payroll & Commissions',
    title: 'Commissions',
    subtitle: 'Commission payouts, Aimann debt tracking, and pipeline projections.',
  });

  async function handleAdjustmentSubmit(dto: { amount: number; note: string; date?: string }) {
    await submit(dto);
    refetchBalance();
    refetchLedger();
    refetchByProject();
  }

  return (
    <div className="space-y-6">
      {pageError && (
        <div className="rounded-[24px] border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
          Failed to load commission data: {String(pageError)}
        </div>
      )}

      {/* Summary Cards */}
      <SummaryCards summary={summary} isLoading={summaryLoading} />

      {/* Aimann Debt Tracker */}
      <DebtTracker
        balance={balance}
        ledger={ledger}
        isLoadingBalance={balanceLoading}
        isLoadingLedger={ledgerLoading}
        onAddAdjustment={() => setAdjustmentOpen(true)}
      />

      {/* Pipeline Projection */}
      <PipelineProjection data={pipeline} isLoading={pipelineLoading} />

      {/* Per-Project Breakdown */}
      <ProjectBreakdownTable
        data={byProject}
        pagination={pagination}
        isLoading={byProjectLoading}
        page={page}
        onPageChange={setPage}
      />

      {/* Debt Adjustment Dialog */}
      <DebtAdjustmentDialog
        open={adjustmentOpen}
        onClose={() => setAdjustmentOpen(false)}
        onSubmit={handleAdjustmentSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
