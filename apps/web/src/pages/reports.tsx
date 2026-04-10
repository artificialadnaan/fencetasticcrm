import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePageShell } from '@/components/layout/page-shell';
import { useExportReport } from '@/hooks/use-financial-reports';
import { api } from '@/lib/api';
import { PnlReport } from '@/components/reports/pnl-report';
import { JobCostingReport } from '@/components/reports/job-costing-report';
import { CommissionReport } from '@/components/reports/commission-report';
import { ExpenseReport } from '@/components/reports/expense-report';
import { CashFlowReport } from '@/components/reports/cash-flow-report';

const TABS = [
  { id: 'pnl', label: 'P&L' },
  { id: 'job-costing', label: 'Job Costing' },
  { id: 'commissions', label: 'Commissions' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'cash-flow', label: 'Cash Flow' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const PERIOD_OPTIONS = ['monthly', 'quarterly', 'annual'] as const;

function getDefaultDateFrom(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function getDefaultDateTo(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('pnl');
  const [dateFrom, setDateFrom] = useState(getDefaultDateFrom);
  const [dateTo, setDateTo] = useState(getDefaultDateTo);
  const [period, setPeriod] = useState<string>('monthly');
  const [jobCostingFilters, setJobCostingFilters] = useState<Record<string, string>>({});

  const exportExtraParams = activeTab === 'pnl' ? { period } : activeTab === 'job-costing' ? jobCostingFilters : undefined;
  const { exportCsv, isExporting } = useExportReport(activeTab, { dateFrom, dateTo }, exportExtraParams);

  const handlePdfExport = async () => {
    try {
      const params = new URLSearchParams({ dateFrom, dateTo });
      if (activeTab === 'pnl') params.set('period', period);
      if (activeTab === 'job-costing') {
        Object.entries(jobCostingFilters).forEach(([k, v]) => { if (v) params.set(k, v); });
      }
      const res = await api.get(`/reports/${activeTab}/pdf?${params.toString()}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTab}-report.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to export PDF');
    }
  };

  const utilityActions = useMemo(
    () => (
      <div className="flex items-center gap-3 flex-wrap">
        {/* Tab Navigation */}
        <div role="tablist" className="inline-flex items-center rounded-2xl border border-black/5 bg-white/65 p-1 shadow-sm">
          {TABS.map((tab) => (
            <Button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              variant="ghost"
              size="sm"
              className={`rounded-xl px-4 text-xs sm:text-sm ${
                activeTab === tab.id
                  ? 'bg-slate-950 text-white hover:bg-slate-800'
                  : 'text-slate-600 hover:bg-white hover:text-slate-950'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Period toggle for P&L */}
        {activeTab === 'pnl' && (
          <div className="inline-flex items-center rounded-2xl border border-black/5 bg-white/65 p-1 shadow-sm">
            {PERIOD_OPTIONS.map((p) => (
              <Button
                key={p}
                type="button"
                variant="ghost"
                size="sm"
                className={`rounded-xl px-3 text-xs capitalize ${
                  period === p
                    ? 'bg-slate-950 text-white hover:bg-slate-800'
                    : 'text-slate-600 hover:bg-white hover:text-slate-950'
                }`}
                onClick={() => setPeriod(p)}
              >
                {p}
              </Button>
            ))}
          </div>
        )}
      </div>
    ),
    [activeTab, period],
  );

  const secondaryActions = useMemo(
    () => (
      <div className="flex items-center gap-3 flex-wrap">
        {/* Date Range Controls */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label="Date from"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-xl border border-black/10 bg-white/70 px-3 py-1.5 text-sm text-slate-700"
          />
          <span className="text-sm text-slate-400">to</span>
          <input
            type="date"
            aria-label="Date to"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-xl border border-black/10 bg-white/70 px-3 py-1.5 text-sm text-slate-700"
          />
        </div>

        {/* Export CSV */}
        <Button
          variant="outline"
          size="sm"
          onClick={exportCsv}
          disabled={isExporting}
          className="rounded-2xl border-black/10 bg-white/70 px-4 print:hidden"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export CSV
        </Button>

        {/* Export PDF */}
        <Button
          variant="outline"
          size="sm"
          onClick={handlePdfExport}
          className="rounded-2xl border-black/10 bg-white/70 px-4 print:hidden"
        >
          <Download className="h-4 w-4 mr-1" />
          PDF
        </Button>
      </div>
    ),
    [dateFrom, dateTo, exportCsv, isExporting, activeTab, period],
  );

  usePageShell({
    eyebrow: 'Financial Reports',
    title: 'Reports',
    subtitle: 'P&L, job costing, commissions, expenses, and cash flow.',
    utilityActions,
    secondaryActions,
  });

  return (
    <div className="space-y-6 print:space-y-4">
      {activeTab === 'pnl' && (
        <PnlReport dateFrom={dateFrom} dateTo={dateTo} period={period} />
      )}
      {activeTab === 'job-costing' && (
        <JobCostingReport dateFrom={dateFrom} dateTo={dateTo} onFiltersChange={setJobCostingFilters} />
      )}
      {activeTab === 'commissions' && (
        <CommissionReport dateFrom={dateFrom} dateTo={dateTo} />
      )}
      {activeTab === 'expenses' && (
        <ExpenseReport dateFrom={dateFrom} dateTo={dateTo} />
      )}
      {activeTab === 'cash-flow' && (
        <CashFlowReport dateFrom={dateFrom} dateTo={dateTo} />
      )}
    </div>
  );
}
