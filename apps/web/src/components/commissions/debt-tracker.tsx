import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Aimann Debt Tracker</CardTitle>
          <Button size="sm" variant="outline" onClick={onAddAdjustment}>
            <Plus className="h-4 w-4 mr-1" />
            Adjustment
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current balance */}
        <div className="rounded-lg border p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Current Balance</p>
            {isLoadingBalance ? (
              <div className="h-8 w-32 animate-pulse rounded bg-muted mt-1" />
            ) : (
              <p
                className={`text-3xl font-bold mt-1 ${
                  (balance ?? 0) > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-600 dark:text-green-400'
                }`}
              >
                {formatCurrency(balance ?? 0)}
              </p>
            )}
          </div>
          {!isLoadingBalance && balance != null && balance <= 0 && (
            <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-sm font-medium text-green-700 dark:text-green-400">
              Paid Off
            </span>
          )}
        </div>

        {/* Ledger history */}
        <div>
          <p className="text-sm font-medium mb-2">Ledger History</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Note</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Amount</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Running Balance</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingLedger ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 4 }).map((_, j) => (
                        <td key={j} className="px-3 py-2">
                          <div className="h-4 animate-pulse rounded bg-muted" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : ledger.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                      No ledger entries yet.
                    </td>
                  </tr>
                ) : (
                  ledger.map((entry, i) => (
                    <tr
                      key={entry.id}
                      className={`border-b transition-colors hover:bg-muted/30 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}
                    >
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                        {formatLedgerDate(entry.date)}
                      </td>
                      <td className="px-3 py-2 max-w-xs truncate" title={entry.note}>
                        {entry.note}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-medium tabular-nums ${
                          entry.amount < 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {entry.amount < 0 ? '-' : '+'}
                        {formatCurrency(Math.abs(entry.amount))}
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">
                        {formatCurrency(entry.runningBalance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
