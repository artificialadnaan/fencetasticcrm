import {
  ArrowUpRight,
  CreditCard,
  FolderKanban,
  Wallet,
} from 'lucide-react';
import type { DashboardData } from '@fencetastic/shared';
import { formatCurrency } from '@/lib/formatters';

interface DashboardKpiStripProps {
  kpis: DashboardData['kpis'] | null;
  isLoading: boolean;
}

interface KpiItem {
  label: string;
  value: string;
  detail: string;
  accent: string;
  Icon: typeof Wallet;
}

function KpiSkeleton() {
  return (
    <div className="shell-panel rounded-[28px] p-5">
      <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200" />
      <div className="mt-4 h-9 w-32 animate-pulse rounded-full bg-slate-200" />
      <div className="mt-4 h-3 w-28 animate-pulse rounded-full bg-slate-200" />
    </div>
  );
}

function KpiCard({ label, value, detail, accent, Icon }: KpiItem) {
  return (
    <article className="shell-panel relative overflow-hidden rounded-[28px] p-5">
      <div className={`absolute inset-x-5 top-0 h-1 rounded-b-full ${accent}`} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            {label}
          </p>
          <p className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
            {value}
          </p>
          <p className="mt-4 text-sm text-slate-600">{detail}</p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/80 p-3 text-slate-700 shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

export function DashboardKpiStrip({ kpis, isLoading }: DashboardKpiStripProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <KpiSkeleton key={item} />
        ))}
      </div>
    );
  }

  const isUnavailable = kpis == null;
  const items: KpiItem[] = [
    {
      label: 'Revenue MTD',
      value: isUnavailable ? 'Unavailable' : formatCurrency(kpis.revenueMTD),
      detail: isUnavailable ? 'Dashboard metrics could not be loaded.' : 'Completed projects booked this month',
      accent: 'bg-emerald-500',
      Icon: ArrowUpRight,
    },
    {
      label: 'Open Projects',
      value: isUnavailable ? 'Unavailable' : String(kpis.openProjects),
      detail: isUnavailable ? 'Dashboard metrics could not be loaded.' : 'Open and in-progress work in the field',
      accent: 'bg-sky-500',
      Icon: FolderKanban,
    },
    {
      label: 'Outstanding Receivables',
      value: isUnavailable ? 'Unavailable' : formatCurrency(kpis.outstandingReceivables),
      detail: isUnavailable
        ? 'Dashboard metrics could not be loaded.'
        : kpis.outstandingReceivables > 0
          ? 'Customer balances still due'
          : 'No outstanding receivables',
      accent: 'bg-amber-500',
      Icon: Wallet,
    },
    {
      label: 'Debt Balance',
      value: isUnavailable ? 'Unavailable' : formatCurrency(kpis.aimannDebtBalance),
      detail: isUnavailable
        ? 'Dashboard metrics could not be loaded.'
        : kpis.aimannDebtBalance > 0
          ? 'Remaining owner debt balance'
          : 'Debt ledger is fully cleared',
      accent: 'bg-rose-500',
      Icon: CreditCard,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <KpiCard key={item.label} {...item} />
      ))}
    </div>
  );
}
