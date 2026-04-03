import { useState } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMonthlyPL, useProjectStats, useReceivablesAging } from '@/hooks/use-reports';
import { MonthlyPLTable } from '@/components/reports/monthly-pl-table';
import { ProjectStats } from '@/components/reports/project-stats';
import { ReceivablesTable } from '@/components/reports/receivables-table';

const MONTH_OPTIONS = [3, 6, 12] as const;

export default function ReportsPage() {
  const [months, setMonths] = useState<number>(6);

  const { data: plData, isLoading: plLoading, error: plError } = useMonthlyPL(months);
  const { data: statsData, isLoading: statsLoading, error: statsError } = useProjectStats();
  const { data: receivablesData, isLoading: receivablesLoading, error: receivablesError } = useReceivablesAging();

  const pageError = plError ?? statsError ?? receivablesError;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1">
            Monthly P&L, project stats, and receivables aging.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Month range selector */}
          <div className="flex rounded-md border overflow-hidden">
            {MONTH_OPTIONS.map((m) => (
              <button
                key={m}
                onClick={() => setMonths(m)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  months === m
                    ? 'bg-[#7C3AED] text-white'
                    : 'bg-transparent text-muted-foreground hover:bg-muted/50'
                }`}
              >
                {m}M
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Print header — hidden on screen */}
      <div className="hidden print:block mb-4">
        <h1 className="text-2xl font-bold">Fencetastic Reports</h1>
        <p className="text-sm text-gray-500">Generated {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </div>

      {pageError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive print:hidden">
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
