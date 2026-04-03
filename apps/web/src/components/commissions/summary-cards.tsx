import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-7 w-28 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{formatCurrency(mtd)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              YTD: <span className="font-medium text-foreground">{formatCurrency(ytd)}</span>
            </p>
          </>
        )}
      </CardContent>
    </Card>
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
