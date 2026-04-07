import { BadgeDollarSign, Gauge, Rows4, Wallet } from 'lucide-react';
import type { ComponentType } from 'react';
import { ProjectStatus, type PaginatedResponse, type GridProjectRow } from '@fencetastic/shared';
import { formatCurrency } from '@/lib/formatters';

interface GridViewSummaryStripProps {
  projects: GridProjectRow[];
  pagination: PaginatedResponse<GridProjectRow>['pagination'] | null;
  isLoading: boolean;
  error: string | null;
  selectedCount: number;
}

interface SummaryCard {
  label: string;
  value: string;
  detail: string;
  accent: string;
  icon: ComponentType<{ className?: string }>;
}

function SummarySkeleton() {
  return (
    <div className="shell-panel rounded-[28px] p-5">
      <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200" />
      <div className="mt-4 h-9 w-32 animate-pulse rounded-full bg-slate-200" />
      <div className="mt-4 h-3 w-28 animate-pulse rounded-full bg-slate-200" />
    </div>
  );
}

function SummaryCardView({ label, value, detail, accent, icon: Icon }: SummaryCard) {
  return (
    <article className="shell-panel relative overflow-hidden rounded-[28px] p-5">
      <div className={`absolute inset-x-5 top-0 h-1 rounded-b-full ${accent}`} />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            {label}
          </p>
          <p className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
            {value}
          </p>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            {detail}
          </p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/80 p-3 text-slate-700 shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

function sum(values: number[]) {
  return values.reduce((acc, value) => acc + value, 0);
}

export function GridViewSummaryStrip({
  projects,
  pagination,
  isLoading,
  error,
  selectedCount,
}: GridViewSummaryStripProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SummarySkeleton key={index} />
        ))}
      </div>
    );
  }

  const hasUnavailableState = Boolean(error);
  const projectValue = sum(projects.map((project) => project.projectTotal));
  const collected = sum(projects.map((project) => project.moneyReceived));
  const receivables = sum(projects.map((project) => project.outstandingReceivables));
  const netProfit = sum(projects.map((project) => project.netProfitDollar));
  const activeRows = projects.filter((project) =>
    [ProjectStatus.ESTIMATE, ProjectStatus.OPEN, ProjectStatus.IN_PROGRESS].includes(project.status)
  ).length;

  const cards: SummaryCard[] = [
    {
      label: 'Page Project Value',
      value: hasUnavailableState ? 'Unavailable' : formatCurrency(projectValue),
      detail: hasUnavailableState
        ? 'The visible project totals could not be loaded.'
        : `Filtered slice across ${pagination?.total ?? projects.length} project${(pagination?.total ?? projects.length) === 1 ? '' : 's'}.`,
      accent: 'bg-sky-500',
      icon: Gauge,
    },
    {
      label: 'Collected',
      value: hasUnavailableState ? 'Unavailable' : formatCurrency(collected),
      detail: hasUnavailableState
        ? 'Collected totals are unavailable until the grid loads.'
        : 'Money received across the current page.',
      accent: 'bg-emerald-500',
      icon: Wallet,
    },
    {
      label: 'Outstanding Receivables',
      value: hasUnavailableState ? 'Unavailable' : formatCurrency(receivables),
      detail: hasUnavailableState
        ? 'Receivable totals are unavailable until data returns.'
        : 'Open balances visible in the current slice.',
      accent: 'bg-amber-500',
      icon: Rows4,
    },
    {
      label: 'Net Profit',
      value: hasUnavailableState ? 'Unavailable' : formatCurrency(netProfit),
      detail: hasUnavailableState
        ? 'Profit totals are unavailable until the grid loads.'
        : `${activeRows} active pipeline row${activeRows === 1 ? '' : 's'} and ${selectedCount} selected.`,
      accent: 'bg-slate-950',
      icon: BadgeDollarSign,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-black/5 bg-white/55 px-5 py-4 shadow-sm">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Spreadsheet View
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Inline edits stay active. Select rows or jump into a project from the action column.
          </p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
          {selectedCount} selected
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <SummaryCardView key={card.label} {...card} />
        ))}
      </div>
    </div>
  );
}
