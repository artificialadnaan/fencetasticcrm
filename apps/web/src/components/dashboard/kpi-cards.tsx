import { TrendingUp, TrendingDown, Minus, FolderOpen, AlertCircle, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import type { DashboardData } from '@fencetastic/shared';

interface KpiCardsProps {
  kpis: DashboardData['kpis'] | null;
  isLoading: boolean;
}

function Skeleton() {
  return (
    <div className="space-y-2">
      <div className="h-8 w-32 animate-pulse rounded bg-muted" />
      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
    </div>
  );
}

interface KpiCardProps {
  title: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  isLoading: boolean;
}

function KpiCard({ title, value, sub, icon, trend, isLoading }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {sub && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                {trend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-400" />}
                {trend === 'neutral' && <Minus className="h-3 w-3 text-muted-foreground" />}
                {sub}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function KpiCards({ kpis, isLoading }: KpiCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title="Revenue MTD"
        value={formatCurrency(kpis?.revenueMTD ?? 0)}
        sub="Completed projects this month"
        icon={<TrendingUp className="h-4 w-4" />}
        trend="up"
        isLoading={isLoading}
      />
      <KpiCard
        title="Open Projects"
        value={String(kpis?.openProjects ?? 0)}
        sub="Open + In Progress"
        icon={<FolderOpen className="h-4 w-4" />}
        trend="neutral"
        isLoading={isLoading}
      />
      <KpiCard
        title="Outstanding Receivables"
        value={formatCurrency(kpis?.outstandingReceivables ?? 0)}
        sub={(kpis?.outstandingReceivables ?? 0) > 0 ? 'Unpaid balances' : 'All caught up'}
        icon={<AlertCircle className="h-4 w-4" />}
        trend={(kpis?.outstandingReceivables ?? 0) > 0 ? 'down' : 'up'}
        isLoading={isLoading}
      />
      <KpiCard
        title="Aimann Debt Balance"
        value={formatCurrency(kpis?.aimannDebtBalance ?? 0)}
        sub={(kpis?.aimannDebtBalance ?? 0) > 0 ? 'Remaining debt' : 'Debt cleared'}
        icon={<CreditCard className="h-4 w-4" />}
        trend={(kpis?.aimannDebtBalance ?? 0) > 0 ? 'down' : 'up'}
        isLoading={isLoading}
      />
    </div>
  );
}
