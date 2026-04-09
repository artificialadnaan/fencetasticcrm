import { useDeferredValue, useMemo, useState } from 'react';
import { Download, Plus, Search } from 'lucide-react';
import { TransactionType, type CreateTransactionDTO } from '@fencetastic/shared';
import { usePageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import {
  useCategoryBreakdown,
  useMonthlyBreakdown,
  useTransactionSummary,
  useTransactions,
} from '@/hooks/use-transactions';
import { FinancesSummaryStrip } from '@/components/finances/redesign/finances-summary-strip';
import { FinancesOverviewPanels } from '@/components/finances/redesign/finances-overview-panels';
import { FinancesTransactionTable } from '@/components/finances/redesign/finances-transaction-table';
import { exportTransactions } from '@/components/finances/redesign/transactions-export';

const EMPTY_FORM: CreateTransactionDTO = {
  type: TransactionType.EXPENSE,
  amount: 0,
  date: new Date().toISOString().split('T')[0],
  category: '',
  description: '',
  payee: '',
};

export default function FinancesPage() {
  const [period, setPeriod] = useState<'mtd' | 'ytd'>('mtd');
  const [typeFilter, setTypeFilter] = useState<'ALL' | TransactionType>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchText, setSearchText] = useState('');
  const deferredSearch = useDeferredValue(searchText.trim());
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateTransactionDTO>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const txQuery = useMemo(
    () => ({
      page,
      limit: 20,
      ...(typeFilter !== 'ALL' ? { type: typeFilter } : {}),
      ...(categoryFilter !== 'ALL' ? { category: categoryFilter } : {}),
      ...(deferredSearch ? { search: deferredSearch } : {}),
    }),
    [page, typeFilter, categoryFilter, deferredSearch]
  );

  const { data: transactions, pagination, isLoading, error, refetch } = useTransactions(txQuery);
  const { summary, isLoading: summaryLoading } = useTransactionSummary(period);
  const { data: monthly, isLoading: monthlyLoading } = useMonthlyBreakdown();
  const { data: categories, isLoading: categoryLoading } = useCategoryBreakdown();

  const categoryOptions = useMemo(
    () => categories.map((entry) => entry.category),
    [categories]
  );

  const hasActiveFilters = Boolean(typeFilter !== 'ALL' || categoryFilter !== 'ALL' || searchText.trim());

  async function handleSave() {
    const errors: Record<string, string> = {};
    if (!form.category) errors.category = 'Category is required';
    if (!form.description) errors.description = 'Description is required';
    if (form.amount <= 0) errors.amount = 'Amount must be greater than 0';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setSaving(true);
    try {
      await api.post('/transactions', {
        ...form,
        amount: Number(form.amount),
        payee: form.payee || null,
      });
      setDialogOpen(false);
      setForm({ ...EMPTY_FORM });
      refetch();
    } catch (err) {
      console.error('Failed to save transaction', err);
    } finally {
      setSaving(false);
    }
  }

  const searchSlot = useMemo(
    () => (
      <div className="relative w-full sm:w-[320px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search description, category, or payee..."
          className="h-10 rounded-2xl border-black/10 bg-white/80 pl-10 shadow-sm placeholder:text-slate-400"
          value={searchText}
          onChange={(event) => {
            setSearchText(event.target.value);
            setPage(1);
          }}
        />
      </div>
    ),
    [searchText]
  );

  const periodToggle = useMemo(
    () => (
      <div className="inline-flex items-center rounded-2xl border border-black/5 bg-white/65 p-1 shadow-sm">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`rounded-xl px-4 ${period === 'mtd' ? 'bg-slate-950 text-white hover:bg-slate-800' : 'text-slate-600 hover:bg-white hover:text-slate-950'}`}
          onClick={() => setPeriod('mtd')}
        >
          MTD
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`rounded-xl px-4 ${period === 'ytd' ? 'bg-slate-950 text-white hover:bg-slate-800' : 'text-slate-600 hover:bg-white hover:text-slate-950'}`}
          onClick={() => setPeriod('ytd')}
        >
          YTD
        </Button>
      </div>
    ),
    [period]
  );

  const primaryActions = useMemo(
    () => (
      <Button
        type="button"
        onClick={() => {
          setForm({ ...EMPTY_FORM, date: new Date().toISOString().split('T')[0] });
          setFormErrors({});
          setDialogOpen(true);
        }}
        className="rounded-2xl bg-slate-950 px-4 text-white hover:bg-slate-800"
      >
        <Plus className="h-4 w-4" />
        Add Transaction
      </Button>
    ),
    []
  );

  const secondaryActions = useMemo(
    () => (
      <Button
        type="button"
        variant="outline"
        onClick={async () => {
          try {
            const blob = await exportTransactions({
              ...txQuery,
              search: txQuery.search,
            });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = 'transactions.csv';
            anchor.click();
            URL.revokeObjectURL(url);
          } catch (err) {
            console.error('Failed to export transactions', err);
          }
        }}
        className="rounded-2xl border-black/10 bg-white/70 px-4 shadow-sm"
      >
        <Download className="h-4 w-4" />
        Export
      </Button>
    ),
    [txQuery]
  );

  usePageShell({
    eyebrow: 'Financial Ledger',
    title: 'Finances',
    subtitle: 'Live view of revenue, pipeline spend, and ledger activity.',
    searchSlot,
    primaryActions,
    secondaryActions,
    utilityActions: periodToggle,
  });

  const handleClearFilters = () => {
    setTypeFilter('ALL');
    setCategoryFilter('ALL');
    setSearchText('');
    setPage(1);
  };

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setFormErrors({}); }}>
        <DialogContent className="max-w-2xl rounded-[28px] border-black/5 bg-white p-0 shadow-2xl">
          <div className="border-b border-black/5 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                Add Transaction
              </DialogTitle>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Record income or expense activity directly into the ledger.
              </p>
            </DialogHeader>
          </div>

          <div className="grid gap-4 px-6 py-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Type</Label>
              <Select
                value={form.type}
                onValueChange={(value) => setForm((current) => ({ ...current, type: value as TransactionType }))}
              >
                <SelectTrigger className="h-10 rounded-2xl border-black/10 bg-white shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TransactionType.INCOME}>Income</SelectItem>
                  <SelectItem value={TransactionType.EXPENSE}>Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.amount || ''}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    amount: parseFloat(event.target.value) || 0,
                  }))
                }
                className="h-10 rounded-2xl border-black/10 bg-white shadow-sm"
                placeholder="0.00"
              />
              {formErrors.amount && <p className="text-xs text-destructive mt-1">{formErrors.amount}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                className="h-10 rounded-2xl border-black/10 bg-white shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Category</Label>
              <Input
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                className="h-10 rounded-2xl border-black/10 bg-white shadow-sm"
                placeholder="Materials, labor, revenue..."
              />
              {formErrors.category && <p className="text-xs text-destructive mt-1">{formErrors.category}</p>}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label className="text-sm font-medium text-slate-700">Description</Label>
              <Input
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                className="h-10 rounded-2xl border-black/10 bg-white shadow-sm"
                placeholder="Short description"
              />
              {formErrors.description && <p className="text-xs text-destructive mt-1">{formErrors.description}</p>}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label className="text-sm font-medium text-slate-700">Payee</Label>
              <Textarea
                value={form.payee ?? ''}
                onChange={(event) => setForm((current) => ({ ...current, payee: event.target.value }))}
                className="min-h-24 rounded-2xl border-black/10 bg-white shadow-sm"
                placeholder="Vendor or customer name"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-black/5 px-6 py-5">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-2xl border-black/10 bg-white/70">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || !form.category || !form.description || form.amount <= 0}
              className="rounded-2xl bg-slate-950 px-5 text-white hover:bg-slate-800"
            >
              {saving ? 'Saving...' : 'Save Transaction'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-black/5 bg-white/55 px-5 py-4 shadow-sm">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Spreadsheet Finance Feed
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Keep the current live transaction behaviors while moving to the unified shell.
            </p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
            {hasActiveFilters ? 'Filtered ledger' : 'All transactions'}
          </div>
        </div>

        <FinancesSummaryStrip summary={summary} isLoading={summaryLoading} period={period} />

        <FinancesOverviewPanels
          monthly={monthly}
          categories={categories}
          isMonthlyLoading={monthlyLoading}
          isCategoryLoading={categoryLoading}
        />

        <FinancesTransactionTable
          transactions={transactions}
          pagination={pagination}
          isLoading={isLoading}
          error={error}
          query={txQuery}
          typeFilter={typeFilter}
          categoryFilter={categoryFilter}
          categories={categoryOptions}
          onTypeFilterChange={(value) => {
            setTypeFilter(value);
            setPage(1);
          }}
          onCategoryFilterChange={(value) => {
            setCategoryFilter(value);
            setPage(1);
          }}
          onClearFilters={handleClearFilters}
          onPageChange={setPage}
        />
      </div>
    </>
  );
}
