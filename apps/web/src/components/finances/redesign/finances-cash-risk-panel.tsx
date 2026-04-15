import type { FinanceRiskOverview } from '@fencetastic/shared';
import { DataSurface } from '@/components/ui/data-surface';
import { formatCurrency } from '@/lib/formatters';

interface FinancesCashRiskPanelProps {
  risk: FinanceRiskOverview | null;
  isLoading: boolean;
  error?: string | null;
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#d9e1ef] bg-[#f8fafc] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6b7280]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#111827]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[#4b5563]">{detail}</p>
    </div>
  );
}

function EmptyState({ copy }: { copy: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#d9e1ef] bg-[#f8fafc] px-4 py-6 text-sm text-[#6b7280]">
      {copy}
    </div>
  );
}

export function FinancesCashRiskPanel({ risk, isLoading, error }: FinancesCashRiskPanelProps) {
  return (
    <DataSurface eyebrow="Cash Risk" title="Aging, payables, and debt pressure" tone="light">
      {isLoading ? (
        <div className="grid gap-4 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-[24px] bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700">
          Failed to load cash-risk data: {error}
        </div>
      ) : !risk ? (
        <EmptyState copy="Cash-risk reporting is unavailable right now." />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-3">
            <SummaryCard
              label="Outstanding Receivables"
              value={formatCurrency(risk.receivables.overallOutstanding)}
              detail={`${formatCurrency(risk.receivables.over60Outstanding)} is older than 60 days.`}
            />
            <SummaryCard
              label="Outstanding Commissions"
              value={formatCurrency(risk.payables.outstandingCommissions)}
              detail={`${risk.payables.projectCount} projects still need commission payout.`}
            />
            <SummaryCard
              label="Debt Balance"
              value={formatCurrency(risk.debt.currentBalance)}
              detail={`${formatCurrency(risk.debt.netMovementLast30Days)} net movement over the last 30 days.`}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1.1fr)]">
            <div className="rounded-[24px] border border-[#d9e1ef] bg-[#f8fafc] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6b7280]">Receivables Aging</p>
              <div className="mt-4 space-y-3">
                {risk.receivables.buckets.map((bucket) => (
                  <div key={bucket.label} className="flex items-center justify-between gap-3 rounded-2xl border border-white bg-white px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-[#111827]">{bucket.label}</p>
                      <p className="text-xs text-[#6b7280]">{bucket.count} projects</p>
                    </div>
                    <p className="text-sm font-semibold text-[#111827]">{formatCurrency(bucket.amount)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-[#d9e1ef] bg-[#f8fafc] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6b7280]">Top Receivables At Risk</p>
              <div className="mt-4 space-y-3">
                {risk.receivables.topAtRisk.length === 0 ? (
                  <EmptyState copy="No outstanding receivables right now." />
                ) : (
                  risk.receivables.topAtRisk.map((project) => (
                    <div key={project.projectId} className="rounded-2xl border border-white bg-white px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#111827]">{project.customer}</p>
                          <p className="truncate text-sm text-[#6b7280]">{project.address}</p>
                        </div>
                        <p className="text-sm font-semibold text-[#111827]">{formatCurrency(project.amount)}</p>
                      </div>
                      <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-[#6b7280]">
                        {project.ageDays} days outstanding
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[24px] border border-[#d9e1ef] bg-[#f8fafc] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6b7280]">Commission Payables</p>
              <div className="mt-4 space-y-3">
                {risk.payables.topUnpaid.length === 0 ? (
                  <EmptyState copy="No unpaid commission balances right now." />
                ) : (
                  risk.payables.topUnpaid.map((project) => (
                    <div key={project.projectId} className="rounded-2xl border border-white bg-white px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#111827]">{project.customer}</p>
                          <p className="truncate text-sm text-[#6b7280]">{project.address}</p>
                        </div>
                        <p className="text-sm font-semibold text-[#111827]">{formatCurrency(project.amountDue)}</p>
                      </div>
                      <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-[#6b7280]">{project.status}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DataSurface>
  );
}
