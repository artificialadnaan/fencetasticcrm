import { useState } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useTransactions,
  useTransactionSummary,
  useMonthlyBreakdown,
  useCategoryBreakdown,
} from '@/hooks/use-transactions';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { api } from '@/lib/api';
import { TransactionType } from '@fencetastic/shared';
import type { CreateTransactionDTO } from '@fencetastic/shared';

const PIE_COLORS = ['#7C3AED', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6'];

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
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateTransactionDTO>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const txQuery =
    typeFilter === 'ALL'
      ? { page, limit: 20 }
      : { page, limit: 20, type: typeFilter };

  const { data: transactions, pagination, isLoading, refetch } = useTransactions(txQuery);
  const { summary, isLoading: summaryLoading } = useTransactionSummary(period);
  const { data: monthly } = useMonthlyBreakdown();
  const { data: categories } = useCategoryBreakdown();

  async function handleSave() {
    if (!form.category || !form.description || form.amount <= 0) return;
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Finances</h1>
          <p className="text-gray-400 text-sm mt-1">Track income, expenses, and profit</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period toggle */}
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                period === 'mtd'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
              onClick={() => setPeriod('mtd')}
            >
              MTD
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                period === 'ytd'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
              onClick={() => setPeriod('ytd')}
            >
              YTD
            </button>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 text-white">
              <DialogHeader>
                <DialogTitle>Add Transaction</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                {/* Type */}
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Type</label>
                  <Select
                    value={form.type}
                    onValueChange={(v) => setForm((f) => ({ ...f, type: v as TransactionType }))}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value={TransactionType.INCOME}>Income</SelectItem>
                      <SelectItem value={TransactionType.EXPENSE}>Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount || ''}
                    onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="0.00"
                  />
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Category</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g. Materials, Labor, Revenue"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Description</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Brief description"
                  />
                </div>

                {/* Payee */}
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Payee (optional)</label>
                  <input
                    type="text"
                    value={form.payee ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, payee: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Vendor or customer name"
                  />
                </div>

                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={handleSave}
                  disabled={saving || !form.category || !form.description || form.amount <= 0}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Income</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {summaryLoading ? '—' : formatCurrency(summary?.totalIncome)}
            </div>
            <p className="text-xs text-gray-500 mt-1">{period === 'mtd' ? 'Month to date' : 'Year to date'}</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Expenses</CardTitle>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">
              {summaryLoading ? '—' : formatCurrency(summary?.totalExpenses)}
            </div>
            <p className="text-xs text-gray-500 mt-1">{period === 'mtd' ? 'Month to date' : 'Year to date'}</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Net Profit</CardTitle>
            <DollarSign className="w-4 h-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                (summary?.netProfit ?? 0) >= 0 ? 'text-purple-400' : 'text-red-400'
              }`}
            >
              {summaryLoading ? '—' : formatCurrency(summary?.netProfit)}
            </div>
            <p className="text-xs text-gray-500 mt-1">{period === 'mtd' ? 'Month to date' : 'Year to date'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Bar Chart */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-base">Monthly Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: 8 }}
                  labelStyle={{ color: '#F9FAFB' }}
                  formatter={(value) => formatCurrency(typeof value === "number" ? value : 0)}
                />
                <Bar dataKey="income" name="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Pie Chart */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-base">Expense Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <div className="flex items-center justify-center h-60 text-gray-500 text-sm">
                No category data
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={220}>
                  <PieChart>
                    <Pie
                      data={categories}
                      dataKey="total"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                    >
                      {categories.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: 8 }}
                      formatter={(value) => formatCurrency(typeof value === "number" ? value : 0)}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  {categories.slice(0, 7).map((c, i) => (
                    <div key={c.category} className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="text-xs text-gray-400 truncate">{c.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-base">Transactions</CardTitle>
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v as 'ALL' | TransactionType);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-36 bg-gray-700 border-gray-600 text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value={TransactionType.INCOME}>Income</SelectItem>
                <SelectItem value={TransactionType.EXPENSE}>Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No transactions found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700 hover:bg-transparent">
                  <TableHead className="text-gray-400">Date</TableHead>
                  <TableHead className="text-gray-400">Type</TableHead>
                  <TableHead className="text-gray-400">Category</TableHead>
                  <TableHead className="text-gray-400">Description</TableHead>
                  <TableHead className="text-gray-400">Payee</TableHead>
                  <TableHead className="text-gray-400 text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} className="border-gray-700 hover:bg-gray-750">
                    <TableCell className="text-gray-300 text-sm">{formatDate(tx.date)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge
                          className={
                            tx.type === TransactionType.INCOME
                              ? 'bg-green-900/40 text-green-400 border-green-800'
                              : 'bg-red-900/40 text-red-400 border-red-800'
                          }
                          variant="outline"
                        >
                          {tx.type === TransactionType.INCOME ? 'Income' : 'Expense'}
                        </Badge>
                        {tx.isAutoGenerated && (
                          <Badge className="bg-gray-700 text-gray-400 border-gray-600 text-xs px-1" variant="outline">
                            auto
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300 text-sm">{tx.category}</TableCell>
                    <TableCell className="text-gray-300 text-sm max-w-48 truncate">{tx.description}</TableCell>
                    <TableCell className="text-gray-400 text-sm">{tx.payee ?? '—'}</TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      <span
                        className={
                          tx.type === TransactionType.INCOME ? 'text-green-400' : 'text-red-400'
                        }
                      >
                        {tx.type === TransactionType.INCOME ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
              <span className="text-xs text-gray-500">
                Page {pagination.page} of {pagination.totalPages} — {pagination.total} transactions
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-700 text-gray-300 hover:bg-gray-700"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-700 text-gray-300 hover:bg-gray-700"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
