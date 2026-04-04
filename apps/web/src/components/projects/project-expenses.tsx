import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { Transaction } from '@fencetastic/shared';

const EXPENSE_CATEGORIES = [
  'Materials',
  'Labor',
  'Equipment',
  'Permits',
  'Sub Payment',
  'Fuel',
  'Misc',
];

const today = () => new Date().toISOString().slice(0, 10);

interface ProjectExpensesProps {
  projectId: string;
  onDataChange?: () => void;
}

interface ExpenseForm {
  category: string;
  description: string;
  amount: string;
  date: string;
}

const emptyForm: ExpenseForm = {
  category: '',
  description: '',
  amount: '',
  date: today(),
};

export function ProjectExpenses({ projectId, onDataChange }: ProjectExpensesProps) {
  const [expenses, setExpenses] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ExpenseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await api.get(
        `/transactions?projectId=${projectId}&type=EXPENSE&limit=100`
      );
      setExpenses(res.data.data ?? []);
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  async function handleAdd() {
    if (!form.category || !form.amount || !form.date) return;
    setSaving(true);
    try {
      await api.post('/transactions', {
        type: 'EXPENSE',
        category: form.category,
        description: form.description,
        amount: parseFloat(form.amount),
        date: form.date,
        projectId,
      });
      setForm({ ...emptyForm, date: today() });
      setShowForm(false);
      await fetchExpenses();
      onDataChange?.();
    } catch (err) {
      console.error('Failed to add expense:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await api.delete(`/transactions/${id}`);
      await fetchExpenses();
      onDataChange?.();
    } catch (err) {
      console.error('Failed to delete expense:', err);
    } finally {
      setDeletingId(null);
    }
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg">Expenses</CardTitle>
        <Button
          size="sm"
          onClick={() => {
            setShowForm(true);
            setForm({ ...emptyForm, date: today() });
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Expense
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-4 p-3 border rounded-md bg-muted/40">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <Select
                  value={form.category}
                  onValueChange={(val) => setForm((f) => ({ ...f, category: val }))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Input
                  className="h-8 text-sm"
                  placeholder="Description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <Input
                  className="h-8 text-sm"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Amount"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div>
                <Input
                  className="h-8 text-sm"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={saving || !form.category || !form.amount || !form.date}
              >
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
        ) : expenses.length === 0 && !showForm ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No expenses recorded yet.
          </p>
        ) : expenses.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((exp) => (
                  <TableRow key={exp.id}>
                    <TableCell className="text-muted-foreground">{formatDate(exp.date)}</TableCell>
                    <TableCell>{exp.category}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {exp.description || '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-500">
                      {formatCurrency(exp.amount)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(exp.id)}
                        disabled={deletingId === exp.id}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <tfoot>
                <tr className="border-t font-semibold">
                  <td colSpan={3} className="pt-3 pl-4 text-sm">
                    Total
                  </td>
                  <td className="pt-3 pr-4 text-right font-mono text-sm text-red-500">
                    {formatCurrency(total)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </Table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
