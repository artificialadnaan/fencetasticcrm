import { Filter, SlidersHorizontal } from 'lucide-react';
import type { Transaction, PaginatedResponse, TransactionListQuery } from '@fencetastic/shared';
import { TransactionType } from '@fencetastic/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataSurface } from '@/components/ui/data-surface';
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
    <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-white/12 bg-white/[0.03] px-6 py-12 text-center">
      <Filter className="h-10 w-10 text-[#8f9aae]" />
      <p className="mt-4 text-lg font-semibold text-[#f7f8fb]">No transactions found</p>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[#9aa6bb]">
        Try broadening the search or clearing the current filters to reveal more of the ledger.
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={onClearFilters}
        className="mt-5 rounded-2xl border-white/12 bg-white/[0.04] text-[#f7f8fb] hover:bg-white/[0.08]"
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
    <DataSurface title="Recent transactions" eyebrow="Transaction Ledger" contentClassName="space-y-4">
      <div className="flex flex-col gap-3 rounded-[28px] border border-white/8 bg-white/[0.03] p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-[#f0b56f] px-4 py-2 text-sm font-medium text-[#11161d] shadow-sm">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </div>

          <Select value={typeFilter} onValueChange={(value) => onTypeFilterChange(value as 'ALL' | TransactionType)}>
            <SelectTrigger className="h-10 w-full rounded-2xl border-white/10 bg-[#0d1218] text-[#dbe2ee] shadow-sm sm:w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value={TransactionType.INCOME}>Income</SelectItem>
              <SelectItem value={TransactionType.EXPENSE}>Expense</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
            <SelectTrigger className="h-10 w-full rounded-2xl border-white/10 bg-[#0d1218] text-[#dbe2ee] shadow-sm sm:w-[220px]">
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
            className="h-10 rounded-2xl border border-white/8 bg-white/[0.04] px-4 text-[#dbe2ee] hover:bg-white/[0.08]"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-[20px] border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <DarkTableContainer>
        {isLoading ? (
          <div className="p-10 text-center text-sm text-[#9aa6bb]">Loading transactions...</div>
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
                  <DarkTableCell className="text-[#9aa6bb]">{formatDate(tx.date)}</DarkTableCell>
                  <DarkTableCell>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          tx.type === TransactionType.INCOME
                            ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                            : 'border-rose-400/30 bg-rose-500/10 text-rose-300'
                        }
                        variant="outline"
                      >
                        {tx.type === TransactionType.INCOME ? 'Income' : 'Expense'}
                      </Badge>
                      {tx.isAutoGenerated && (
                        <Badge className="border-white/12 bg-white/[0.06] text-[#9aa6bb]" variant="outline">
                          auto
                        </Badge>
                      )}
                    </div>
                  </DarkTableCell>
                  <DarkTableCell className="font-medium">{tx.category}</DarkTableCell>
                  <DarkTableCell className="text-[#dbe2ee]">{tx.description}</DarkTableCell>
                  <DarkTableCell className="text-[#9aa6bb]">{tx.payee ?? '—'}</DarkTableCell>
                  <DarkTableCell numeric className="font-semibold">
                    <span className={tx.type === TransactionType.INCOME ? 'text-emerald-300' : 'text-rose-300'}>
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
          <div className="flex flex-col gap-3 border-t border-white/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#9aa6bb]">
              Page {pagination.page} of {pagination.totalPages} - {pagination.total} transactions
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pagination.page <= 1}
                onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
                className="rounded-2xl border-white/10 bg-white/[0.04] text-[#f7f8fb] hover:bg-white/[0.08]"
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => onPageChange(pagination.page + 1)}
                className="rounded-2xl border-white/10 bg-white/[0.04] text-[#f7f8fb] hover:bg-white/[0.08]"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </DarkTableContainer>
    </DataSurface>
  );
}
