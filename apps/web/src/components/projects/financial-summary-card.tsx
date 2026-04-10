import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { useProjectMaterialSummary } from '@/hooks/use-materials';

interface FinancialSummaryCardProps {
  projectId: string;
}

export function FinancialSummaryCard({ projectId }: FinancialSummaryCardProps) {
  const { data, isLoading } = useProjectMaterialSummary(projectId);

  return (
    <section className="shell-panel rounded-[28px] p-6 md:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
        Financial Summary
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
        Materials Overview
      </h2>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {/* Total Materials */}
        <div className="rounded-[20px] border border-black/5 bg-white/55 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Total Materials
          </p>
          {isLoading ? (
            <Skeleton className="mt-2 h-7 w-28 rounded-lg" />
          ) : (
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
              {formatCurrency(data?.total ?? 0)}
              {data?.isLegacy && (
                <span className="ml-2 text-xs font-normal text-slate-400">(legacy)</span>
              )}
            </p>
          )}
        </div>

        {/* Line Item Count */}
        <div className="rounded-[20px] border border-black/5 bg-white/55 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Line Items
          </p>
          {isLoading ? (
            <Skeleton className="mt-2 h-7 w-16 rounded-lg" />
          ) : (
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
              {data?.lineItemCount ?? 0}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
