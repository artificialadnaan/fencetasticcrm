import { formatCurrency } from '@/lib/formatters';
import type { CommissionSummary } from '@fencetastic/shared';

interface SummaryCardsProps {
  summary: CommissionSummary | null;
  isLoading: boolean;
}

function StatCard({
  title,
  mtd,
  ytd,
  isLoading,
}: {
  title: string;
  mtd: number;
  ytd: number;
  isLoading: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-black/5 bg-white/70 px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">{title}</p>
      {isLoading ? (
        <div className="space-y-2 mt-2">
          <div className="h-7 w-28 animate-pulse rounded-[28px] bg-slate-200" />
          <div className="h-4 w-20 animate-pulse rounded-[28px] bg-slate-200" />
        </div>
      ) : (
        <>
          <div className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
            {formatCurrency(mtd)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            YTD: <span className="font-medium text-slate-950">{formatCurrency(ytd)}</span>
          </p>
        </>
      )}
    </div>
  );
}

export function SummaryCards({ summary, isLoading }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <StatCard
        title="Adnaan Commission (MTD)"
        mtd={summary?.adnaanMTD ?? 0}
        ytd={summary?.adnaanYTD ?? 0}
        isLoading={isLoading}
      />
      <StatCard
        title="Meme Commission (MTD)"
        mtd={summary?.memeMTD ?? 0}
        ytd={summary?.memeYTD ?? 0}
        isLoading={isLoading}
      />
    </div>
  );
}
