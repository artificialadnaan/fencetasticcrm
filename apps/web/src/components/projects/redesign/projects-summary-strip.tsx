import { BadgeDollarSign, FolderOpen, Gauge, Rows4, type LucideIcon } from 'lucide-react';
import { ProjectStatus, type PaginatedResponse, type ProjectListItem } from '@fencetastic/shared';
import { formatCurrency } from '@/lib/formatters';

interface ProjectsSummaryStripProps {
  projects: ProjectListItem[];
  pagination: PaginatedResponse<ProjectListItem>['pagination'] | null;
  isLoading: boolean;
  error: string | null;
}

interface SummaryCard {
  label: string;
  value: string;
  detail: string;
  accent: string;
  icon: LucideIcon;
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

export function ProjectsSummaryStrip({
  projects,
  pagination,
  isLoading,
  error,
}: ProjectsSummaryStripProps) {
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
  const activePipeline = projects.filter((project) =>
    [ProjectStatus.ESTIMATE, ProjectStatus.OPEN, ProjectStatus.IN_PROGRESS].includes(project.status)
  ).length;
  const pageReceivables = projects.reduce((sum, project) => sum + project.receivable, 0);

  const cards: SummaryCard[] = [
    {
      label: 'Projects Found',
      value: hasUnavailableState ? 'Unavailable' : String(pagination?.total ?? 0),
      detail: hasUnavailableState
        ? 'The live project count could not be loaded.'
        : 'Matches the current search, status, and type filters.',
      accent: 'bg-sky-500',
      icon: FolderOpen,
    },
    {
      label: 'Visible Now',
      value: hasUnavailableState ? 'Unavailable' : String(projects.length),
      detail: hasUnavailableState
        ? 'Rows on the current page are unavailable.'
        : `Showing page ${pagination?.page ?? 1} of ${pagination?.totalPages ?? 1}.`,
      accent: 'bg-amber-500',
      icon: Rows4,
    },
    {
      label: 'Active Pipeline',
      value: hasUnavailableState ? 'Unavailable' : String(activePipeline),
      detail: hasUnavailableState
        ? 'Pipeline counts are unavailable until the list loads.'
        : 'Estimate, open, and in-progress jobs on this page.',
      accent: 'bg-emerald-500',
      icon: Gauge,
    },
    {
      label: 'Page Receivables',
      value: hasUnavailableState ? 'Unavailable' : formatCurrency(pageReceivables),
      detail: hasUnavailableState
        ? 'Receivables are unavailable until data returns.'
        : 'Outstanding balance across the visible project slice.',
      accent: 'bg-rose-500',
      icon: BadgeDollarSign,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <SummaryCardView key={card.label} {...card} />
      ))}
    </div>
  );
}
