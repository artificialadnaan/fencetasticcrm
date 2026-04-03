import { useState } from 'react';
import { SummaryCards } from '@/components/commissions/summary-cards';
import { ProjectBreakdownTable } from '@/components/commissions/project-breakdown-table';
import { PipelineProjection } from '@/components/commissions/pipeline-projection';
import { DebtTracker } from '@/components/commissions/debt-tracker';
import { DebtAdjustmentDialog } from '@/components/commissions/debt-adjustment-dialog';
import { useCommissionSummary, useCommissionsByProject, useCommissionPipeline } from '@/hooks/use-commissions';
import { useDebtBalance, useDebtLedger, useDebtAdjustment } from '@/hooks/use-debt';

export default function CommissionsPage() {
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [page, setPage] = useState(1);

  const { data: summary, isLoading: summaryLoading } = useCommissionSummary();
  const { data: byProject, pagination, isLoading: byProjectLoading, refetch: refetchByProject } = useCommissionsByProject(page);
  const { data: pipeline, isLoading: pipelineLoading } = useCommissionPipeline();
  const { balance, isLoading: balanceLoading, refetch: refetchBalance } = useDebtBalance();
  const { data: ledger, isLoading: ledgerLoading, refetch: refetchLedger } = useDebtLedger();
  const { submit, isSubmitting } = useDebtAdjustment();

  async function handleAdjustmentSubmit(dto: { amount: number; note: string; date?: string }) {
    await submit(dto);
    refetchBalance();
    refetchLedger();
    refetchByProject();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Commissions</h1>
        <p className="text-muted-foreground mt-1">
          Commission payouts, Aimann debt tracking, and pipeline projections.
        </p>
      </div>

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
