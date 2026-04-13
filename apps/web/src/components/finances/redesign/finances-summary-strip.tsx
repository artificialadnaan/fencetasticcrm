import { ArrowDownRight, ArrowUpRight, BadgeDollarSign } from 'lucide-react';
import type { ComponentType } from 'react';
import { formatCurrency } from '@/lib/formatters';
import type { TransactionSummary } from '@fencetastic/shared';

interface FinancesSummaryStripProps {
  summary: TransactionSummary | null;
  isLoading: boolean;
  period: 'mtd' | 'ytd';
}

function SummarySkeleton() {
  return (
    <div className="rounded-[28px] border border-[#d9e1ef] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200" />
      <div className="mt-4 h-9 w-32 animate-pulse rounded-full bg-slate-200" />
      <div className="mt-4 h-3 w-28 animate-pulse rounded-full bg-slate-200" />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  accent,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  accent: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <article className="relative overflow-hidden rounded-[28px] border border-[#d9e1ef] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className={`absolute inset-x-5 top-0 h-1 rounded-b-full ${accent}`} />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6b7280]">
            {label}
          </p>
          <p className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#111827]">
            {value}
          </p>
          <p className="mt-4 text-sm leading-6 text-[#4b5563]">{detail}</p>
        </div>
        <div className="rounded-2xl border border-[#d9e1ef] bg-[#f7f9fc] p-3 text-[#1f3864] shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

export function FinancesSummaryStrip({ summary, isLoading, period }: FinancesSummaryStripProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <SummarySkeleton key={index} />
        ))}
      </div>
    );
  }

  const totalIncome = summary?.totalIncome ?? 0;
  const totalExpenses = summary?.totalExpenses ?? 0;
  const netProfit = summary?.netProfit ?? 0;

  const cards = [
    {
      label: 'Total Income',
      value: formatCurrency(totalIncome),
      detail: period === 'mtd' ? 'Month to date inflow.' : 'Year to date inflow.',
      accent: 'bg-emerald-500',
      icon: ArrowUpRight,
    },
    {
      label: 'Total Expenses',
      value: formatCurrency(totalExpenses),
      detail: period === 'mtd' ? 'Month to date spend.' : 'Year to date spend.',
      accent: 'bg-rose-500',
      icon: ArrowDownRight,
    },
    {
      label: 'Net Profit',
      value: formatCurrency(netProfit),
      detail:
        netProfit >= 0
          ? 'Healthy margin across the selected period.'
          : 'Loss position across the selected period.',
      accent: netProfit >= 0 ? 'bg-[#1f3864]' : 'bg-amber-500',
      icon: BadgeDollarSign,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <SummaryCard key={card.label} {...card} />
      ))}
    </div>
  );
}
