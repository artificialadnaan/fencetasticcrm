import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { DebtLedgerEntry } from '@fencetastic/shared';

interface DebtTrackerProps {
  balance: number | null;
  ledger: DebtLedgerEntry[];
  isLoadingBalance: boolean;
  isLoadingLedger: boolean;
  onAddAdjustment: () => void;
}

export function DebtTracker({
  balance,
  ledger,
  isLoadingBalance,
  isLoadingLedger,
  onAddAdjustment,
}: DebtTrackerProps) {
  const formatLedgerDate = (value: string) => {
    const normalized = value.includes('T') ? value.split('T')[0] : value;
    return formatDate(normalized);
  };

  return (
    <section className="shell-panel rounded-[28px] p-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-[-0.05em] text-slate-950">
          Aimann Debt Tracker
        </h2>
        <Button
          size="sm"
          variant="outline"
          onClick={onAddAdjustment}
          className="rounded-2xl"
        >
          <Plus className="h-4 w-4 mr-1" />
          Adjustment
        </Button>
      </div>

      <div className="mt-6 space-y-6">
        {/* Current balance */}
        <div className="rounded-[24px] border border-black/5 bg-white/70 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Current Balance
            </p>
            {isLoadingBalance ? (
              <div className="h-8 w-32 animate-pulse rounded-[28px] bg-slate-200 mt-2" />
            ) : (
              <p
                className={`text-3xl font-semibold tracking-[-0.05em] mt-2 ${
                  (balance ?? 0) > 0 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {formatCurrency(balance ?? 0)}
              </p>
            )}
          </div>
          {!isLoadingBalance && balance != null && balance <= 0 && (
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
              Paid Off
            </span>
          )}
        </div>

        {/* Ledger history */}
        <div>
          <p className="text-sm font-medium text-slate-950 mb-3">Ledger History</p>
          <div className="rounded-[28px] border border-black/5 bg-white/55 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/5 bg-slate-50/80">
                    <th className="px-3 py-2 text-left font-medium text-slate-500">Date</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">Note</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">Amount</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">Running Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingLedger ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b border-black/5">
                        {Array.from({ length: 4 }).map((_, j) => (
                          <td key={j} className="px-3 py-2">
                            <div className="h-4 animate-pulse rounded-[28px] bg-slate-200" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : ledger.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                        No ledger entries yet.
                      </td>
                    </tr>
                  ) : (
                    ledger.map((entry, i) => (
                      <tr
                        key={entry.id}
                        className={`border-b border-black/5 transition-colors hover:bg-slate-50/60 ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}
                      >
                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                          {formatLedgerDate(entry.date)}
                        </td>
                        <td className="px-3 py-2 max-w-xs truncate" title={entry.note}>
                          {entry.note}
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-medium tabular-nums ${
                            entry.amount < 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {entry.amount < 0 ? '-' : '+'}
                          {formatCurrency(Math.abs(entry.amount))}
                        </td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums text-slate-950">
                          {formatCurrency(entry.runningBalance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
