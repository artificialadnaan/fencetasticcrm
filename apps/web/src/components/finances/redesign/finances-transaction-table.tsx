import { Filter, SlidersHorizontal } from 'lucide-react';
import type { Transaction, PaginatedResponse, TransactionListQuery } from '@fencetastic/shared';
import { TransactionType } from '@fencetastic/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/formatters';

interface FinancesTransactionTableProps {
  transactions: Transaction[];
  pagination: PaginatedResponse<Transaction>['pagination'] | null;
  isLoading: boolean;
  error: string | null;
  query: TransactionListQuery;
  typeFilter: 'ALL' | TransactionType;
  categoryFilter: string;
  categories: string[];
  onTypeFilterChange: (value: 'ALL' | TransactionType) => void;
  onCategoryFilterChange: (value: string) => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
}

function EmptyState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white/55 px-6 py-12 text-center">
      <Filter className="h-10 w-10 text-slate-400" />
      <p className="mt-4 text-lg font-semibold text-slate-950">No transactions found</p>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
        Try broadening the search or clearing the current filters to reveal more of the ledger.
      </p>
      <Button type="button" variant="outline" onClick={onClearFilters} className="mt-5 rounded-2xl border-black/10 bg-white/70">
        Clear Filters
      </Button>
    </div>
  );
}

export function FinancesTransactionTable({
  transactions,
  pagination,
  isLoading,
  error,
  query,
  typeFilter,
  categoryFilter,
  categories,
  onTypeFilterChange,
  onCategoryFilterChange,
  onClearFilters,
  onPageChange,
}: FinancesTransactionTableProps) {
  const hasFilters = Boolean(query.search || query.type || query.category || query.dateFrom || query.dateTo);

  return (
    <section className="shell-panel rounded-[32px] p-4 md:p-6">
      <div className="flex flex-col gap-4 border-b border-black/5 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Transaction Ledger
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
            Recent transactions
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Filter and review every ledger entry from this page.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-[28px] border border-black/5 bg-white/55 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-medium text-white shadow-sm">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </div>

          <Select value={typeFilter} onValueChange={(value) => onTypeFilterChange(value as 'ALL' | TransactionType)}>
            <SelectTrigger className="h-10 w-full rounded-2xl border-black/10 bg-white/80 shadow-sm sm:w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value={TransactionType.INCOME}>Income</SelectItem>
              <SelectItem value={TransactionType.EXPENSE}>Expense</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
            <SelectTrigger className="h-10 w-full rounded-2xl border-black/10 bg-white/80 shadow-sm sm:w-[220px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasFilters && (
          <Button type="button" variant="ghost" onClick={onClearFilters} className="h-10 rounded-2xl border border-black/5 bg-white/60 px-4 text-slate-700 hover:bg-white">
            Clear Filters
          </Button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-[28px] border border-black/5 bg-white/70">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-slate-500">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="p-6">
            <EmptyState onClearFilters={onClearFilters} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left">
              <thead className="bg-slate-950 text-white">
                <tr>
                  <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/70">Date</th>
                  <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/70">Type</th>
                  <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/70">Category</th>
                  <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/70">Description</th>
                  <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/70">Payee</th>
                  <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-right text-white/70">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx, index) => (
                  <tr key={tx.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="px-5 py-4 text-sm text-slate-600">{formatDate(tx.date)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            tx.type === TransactionType.INCOME
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-rose-200 bg-rose-50 text-rose-700'
                          }
                          variant="outline"
                        >
                          {tx.type === TransactionType.INCOME ? 'Income' : 'Expense'}
                        </Badge>
                        {tx.isAutoGenerated && (
                          <Badge className="border-slate-200 bg-slate-100 text-slate-500" variant="outline">
                            auto
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-900">{tx.category}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{tx.description}</td>
                    <td className="px-5 py-4 text-sm text-slate-500">{tx.payee ?? '—'}</td>
                    <td className="px-5 py-4 text-right text-sm font-semibold">
                      <span className={tx.type === TransactionType.INCOME ? 'text-emerald-700' : 'text-rose-700'}>
                        {tx.type === TransactionType.INCOME ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-black/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              Page {pagination.page} of {pagination.totalPages} - {pagination.total} transactions
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pagination.page <= 1}
                onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
                className="rounded-2xl border-black/10 bg-white/70"
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => onPageChange(pagination.page + 1)}
                className="rounded-2xl border-black/10 bg-white/70"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
