import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMonthlyPL, useProjectStats, useReceivablesAging } from '@/hooks/use-reports';
import { MonthlyPLTable } from '@/components/reports/monthly-pl-table';
import { ProjectStats } from '@/components/reports/project-stats';
import { ReceivablesTable } from '@/components/reports/receivables-table';
import { usePageShell } from '@/components/layout/page-shell';

const MONTH_OPTIONS = [3, 6, 12] as const;

export default function ReportsPage() {
  const [months, setMonths] = useState<number>(6);

  const { data: plData, isLoading: plLoading, error: plError } = useMonthlyPL(months);
  const { data: statsData, isLoading: statsLoading, error: statsError } = useProjectStats();
  const { data: receivablesData, isLoading: receivablesLoading, error: receivablesError } = useReceivablesAging();

  const pageError = plError ?? statsError ?? receivablesError;

  const utilityActions = useMemo(
    () => (
      <div className="inline-flex items-center rounded-2xl border border-black/5 bg-white/65 p-1 shadow-sm">
        {MONTH_OPTIONS.map((m) => (
          <Button
            key={m}
            type="button"
            variant="ghost"
            size="sm"
            className={`rounded-xl px-4 ${
              months === m
                ? 'bg-slate-950 text-white hover:bg-slate-800'
                : 'text-slate-600 hover:bg-white hover:text-slate-950'
            }`}
            onClick={() => setMonths(m)}
          >
            {m}M
          </Button>
        ))}
      </div>
    ),
    [months]
  );

  const secondaryActions = useMemo(
    () => (
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.print()}
        className="rounded-2xl border-black/10 bg-white/70 px-4 print:hidden"
      >
        <Download className="h-4 w-4" />
        Export PDF
      </Button>
    ),
    []
  );

  usePageShell({
    eyebrow: 'Financial Reports',
    title: 'Reports',
    subtitle: 'Monthly P&L, project stats, and receivables aging.',
    utilityActions,
    secondaryActions,
  });

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="hidden print:block mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          Fencetastic Reports
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
          Financial overview
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Generated {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {pageError && (
        <div className="rounded-[24px] border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive print:hidden">
          Failed to load report data: {pageError}
        </div>
      )}

      {/* Monthly P&L */}
      <MonthlyPLTable data={plData} isLoading={plLoading} />

      {/* Project Stats */}
      <ProjectStats data={statsData} isLoading={statsLoading} />

      {/* Receivables Aging */}
      <ReceivablesTable data={receivablesData} isLoading={receivablesLoading} />
    </div>
  );
}
