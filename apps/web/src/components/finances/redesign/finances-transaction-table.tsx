import { Filter, SlidersHorizontal } from 'lucide-react';
import type { Transaction, PaginatedResponse, TransactionListQuery } from '@fencetastic/shared';
import { TransactionType } from '@fencetastic/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DarkTable,
  DarkTableCell,
  DarkTableContainer,
  DarkTableHeader,
  DarkTableRow,
} from '@/components/ui/dark-table';
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
    <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-[#f9fafb] px-6 py-12 text-center">
      <Filter className="h-10 w-10 text-[#6b7280]" />
      <p className="mt-4 text-lg font-semibold text-[#111827]">No transactions found</p>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[#4b5563]">
        Try broadening the search or clearing the current filters to reveal more of the ledger.
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={onClearFilters}
        className="mt-5 rounded-2xl border-[#d1d9e6] bg-white text-[#1f3864] hover:bg-[#f7f9fc]"
      >
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
    <section className="rounded-[28px] border border-[#d9e1ef] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="border-b border-[#e5e7eb] px-6 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6b7280]">
          Transaction Ledger
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[#111827]">
          Recent transactions
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4b5563]">
          Filter and review every ledger entry from this page.
        </p>
      </div>

      <div className="flex flex-col gap-3 border-b border-[#e5e7eb] bg-[#f9fafb] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-[#1f3864] px-4 py-2 text-sm font-medium text-white shadow-sm">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </div>

          <Select value={typeFilter} onValueChange={(value) => onTypeFilterChange(value as 'ALL' | TransactionType)}>
            <SelectTrigger className="h-10 w-full rounded-2xl border-[#d1d9e6] bg-white text-[#111827] shadow-sm sm:w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value={TransactionType.INCOME}>Income</SelectItem>
              <SelectItem value={TransactionType.EXPENSE}>Expense</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
            <SelectTrigger className="h-10 w-full rounded-2xl border-[#d1d9e6] bg-white text-[#111827] shadow-sm sm:w-[220px]">
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
          <Button
            type="button"
            variant="ghost"
            onClick={onClearFilters}
            className="h-10 rounded-2xl border border-[#d1d9e6] bg-white px-4 text-[#1f3864] hover:bg-[#f7f9fc]"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {error && (
        <div className="mx-4 mt-4 rounded-[20px] border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="p-4">
      <DarkTableContainer className="[--table-bg:#ffffff] [--table-border:#d9e1ef] [--table-text:#111827] [--table-head-bg:#1f3864] [--table-head-text:#ffffff] [--table-row-border:#e5e7eb] [--table-row-odd:#ffffff] [--table-row-even:#f9fafb] [--table-row-hover:#f3f6fb] [--table-cell-text:#111827]">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-[#4b5563]">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="p-6">
            <EmptyState onClearFilters={onClearFilters} />
          </div>
        ) : (
          <DarkTable>
            <thead>
              <tr>
                <DarkTableHeader sticky>Date</DarkTableHeader>
                <DarkTableHeader sticky>Type</DarkTableHeader>
                <DarkTableHeader sticky>Category</DarkTableHeader>
                <DarkTableHeader sticky>Description</DarkTableHeader>
                <DarkTableHeader sticky>Payee</DarkTableHeader>
                <DarkTableHeader sticky className="text-right">Amount</DarkTableHeader>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <DarkTableRow key={tx.id}>
                  <DarkTableCell className="text-[#4b5563]">{formatDate(tx.date)}</DarkTableCell>
                  <DarkTableCell>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          tx.type === TransactionType.INCOME
                            ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-700'
                            : 'border-rose-400/30 bg-rose-500/10 text-rose-700'
                        }
                        variant="outline"
                      >
                        {tx.type === TransactionType.INCOME ? 'Income' : 'Expense'}
                      </Badge>
                      {tx.isAutoGenerated && (
                        <Badge className="border-[#d1d9e6] bg-[#f3f4f6] text-[#4b5563]" variant="outline">
                          auto
                        </Badge>
                      )}
                    </div>
                  </DarkTableCell>
                  <DarkTableCell className="font-medium">{tx.category}</DarkTableCell>
                  <DarkTableCell className="text-[#111827]">{tx.description}</DarkTableCell>
                  <DarkTableCell className="text-[#4b5563]">{tx.payee ?? '—'}</DarkTableCell>
                  <DarkTableCell numeric className="font-semibold">
                    <span className={tx.type === TransactionType.INCOME ? 'text-emerald-700' : 'text-rose-700'}>
                      {tx.type === TransactionType.INCOME ? '+' : '-'}
                      {formatCurrency(tx.amount)}
                    </span>
                  </DarkTableCell>
                </DarkTableRow>
              ))}
            </tbody>
          </DarkTable>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-[#e5e7eb] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#4b5563]">
              Page {pagination.page} of {pagination.totalPages} - {pagination.total} transactions
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pagination.page <= 1}
                onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
                className="rounded-2xl border-[#d1d9e6] bg-white text-[#1f3864] hover:bg-[#f7f9fc]"
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => onPageChange(pagination.page + 1)}
                className="rounded-2xl border-[#d1d9e6] bg-white text-[#1f3864] hover:bg-[#f7f9fc]"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </DarkTableContainer>
      </div>
    </section>
  );
}
