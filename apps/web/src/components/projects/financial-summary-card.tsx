import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { useProjectFinancialSummary } from '@/hooks/use-materials';

interface FinancialSummaryCardProps {
  projectId: string;
}

function MarginBadge({ pct }: { pct: number }) {
  const color =
    pct >= 30
      ? 'text-emerald-600 bg-emerald-50'
      : pct >= 15
      ? 'text-amber-600 bg-amber-50'
      : 'text-red-600 bg-red-50';
  return (
    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      {pct.toFixed(1)}%
    </span>
  );
}

export function FinancialSummaryCard({ projectId }: FinancialSummaryCardProps) {
  const { data, isLoading, error } = useProjectFinancialSummary(projectId);

  const rows: Array<{ label: string; value: string | React.ReactNode; sub?: string }> = data
    ? [
        {
          label: 'Revenue',
          value: formatCurrency(data.revenue),
        },
        {
          label: 'Total Materials',
          value: (
            <>
              {formatCurrency(data.materials)}
              {data.isLegacyMaterials && (
                <span className="ml-2 text-xs font-normal text-slate-400">(legacy)</span>
              )}
            </>
          ),
          sub: data.materialLineItemCount > 0
            ? `${data.materialLineItemCount} line item${data.materialLineItemCount !== 1 ? 's' : ''}`
            : undefined,
        },
        {
          label: 'Subcontractors',
          value: formatCurrency(data.subcontractors),
        },
        {
          label: 'Other Expenses',
          value: formatCurrency(data.otherExpenses),
        },
        {
          label: 'Commissions',
          value: formatCurrency(data.totalCommissions),
          sub: `Adnaan ${formatCurrency(data.commissionsAdnaan)} · Meme ${formatCurrency(data.commissionsMeme)}`,
        },
      ]
    : [];

  if (error) {
    return (
      <section className="shell-panel rounded-[28px] p-6 md:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          Financial Summary
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
          Project Financials
        </h2>
        <div className="mt-6 rounded-[16px] border border-destructive/30 bg-destructive/10 px-4 py-4 text-sm text-destructive">
          Unable to load financial summary
        </div>
      </section>
    );
  }

  return (
    <section className="shell-panel rounded-[28px] p-6 md:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
        Financial Summary
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
        Project Financials
      </h2>

      <div className="mt-6 space-y-3">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-[16px] border border-black/5 bg-white/55 px-4 py-3"
              >
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-5 w-20 rounded" />
              </div>
            ))
          : rows.map((row) => (
              <div
                key={row.label}
                className="flex items-start justify-between rounded-[16px] border border-black/5 bg-white/55 px-4 py-3"
              >
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {row.label}
                  </p>
                  {row.sub && (
                    <p className="mt-0.5 text-[11px] text-slate-400">{row.sub}</p>
                  )}
                </div>
                <p className="text-base font-semibold tracking-[-0.03em] text-slate-950">
                  {row.value}
                </p>
              </div>
            ))}
      </div>

      {/* Profit row */}
      <div className="mt-4 rounded-[16px] border border-black/5 bg-white/55 px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24 rounded" />
            <Skeleton className="h-7 w-28 rounded" />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Project Profit
              {data && <MarginBadge pct={data.marginPct} />}
            </p>
            <p
              className={`text-2xl font-semibold tracking-[-0.04em] ${
                (data?.profit ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(data?.profit ?? 0)}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
