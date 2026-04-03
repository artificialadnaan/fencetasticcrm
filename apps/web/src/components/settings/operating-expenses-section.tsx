import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { ExpenseFrequency } from '@fencetastic/shared';
import type { OperatingExpense, CreateOperatingExpenseDTO, UpdateOperatingExpenseDTO } from '@fencetastic/shared';
import { formatCurrency } from '@/lib/formatters';

interface OperatingExpensesSectionProps {
  expenses: OperatingExpense[];
  isLoading: boolean;
  onCreate: (dto: CreateOperatingExpenseDTO) => Promise<void>;
  onUpdate: (id: string, dto: UpdateOperatingExpenseDTO) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const FREQUENCY_LABELS: Record<ExpenseFrequency, string> = {
  [ExpenseFrequency.MONTHLY]: 'Monthly',
  [ExpenseFrequency.QUARTERLY]: 'Quarterly',
  [ExpenseFrequency.ANNUAL]: 'Annual',
};

interface ExpenseForm {
  category: string;
  description: string;
  amount: string;
  frequency: ExpenseFrequency | '';
}

const emptyForm: ExpenseForm = {
  category: '',
  description: '',
  amount: '',
  frequency: '',
};

export function OperatingExpensesSection({
  expenses,
  isLoading,
  onCreate,
  onUpdate,
  onDelete,
}: OperatingExpensesSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<OperatingExpense | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function openAdd() {
    setEditingExpense(null);
    setForm(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(e: OperatingExpense) {
    setEditingExpense(e);
    setForm({
      category: e.category,
      description: e.description,
      amount: String(e.amount),
      frequency: e.frequency,
    });
    setFormError(null);
    setDialogOpen(true);
  }

  const isFormValid =
    form.category.trim() !== '' &&
    form.description.trim() !== '' &&
    form.amount !== '' &&
    form.frequency !== '';

  // Monthly equivalent for totals display
  const monthlyEquivalent = expenses.reduce((sum, e) => {
    const divisor = e.frequency === ExpenseFrequency.MONTHLY ? 1
      : e.frequency === ExpenseFrequency.QUARTERLY ? 3
      : 12;
    return sum + e.amount / divisor;
  }, 0);

  async function handleSave() {
    if (!isFormValid) return;
    setSaving(true);
    setFormError(null);
    try {
      const dto = {
        category: form.category.trim(),
        description: form.description.trim(),
        amount: parseFloat(form.amount),
        frequency: form.frequency as ExpenseFrequency,
      };
      if (editingExpense) {
        await onUpdate(editingExpense.id, dto);
      } else {
        await onCreate(dto);
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setSaving(true);
    try {
      await onDelete(id);
    } finally {
      setSaving(false);
      setDeleteConfirmId(null);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-lg">Operating Expenses</CardTitle>
            {expenses.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                ~{formatCurrency(monthlyEquivalent)}/mo equivalent
              </p>
            )}
          </div>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Add Expense
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
          ) : expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No operating expenses yet. Add recurring costs like insurance and advertising.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4 font-medium">Category</th>
                    <th className="text-left py-2 pr-4 font-medium">Description</th>
                    <th className="text-right py-2 pr-4 font-medium">Amount</th>
                    <th className="text-left py-2 pr-4 font-medium">Frequency</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-2 pr-4 font-medium">{e.category}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{e.description}</td>
                      <td className="py-2 pr-4 text-right font-mono">{formatCurrency(e.amount)}</td>
                      <td className="py-2 pr-4">
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                          {FREQUENCY_LABELS[e.frequency]}
                        </span>
                      </td>
                      <td className="py-2 pl-2">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(e)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmId(e.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Operating Expense' : 'Add Operating Expense'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="oe-category">Category</Label>
              <Input
                id="oe-category"
                placeholder="e.g. Insurance, Advertising, Accounting"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="oe-description">Description</Label>
              <Input
                id="oe-description"
                placeholder="e.g. HISCOX INC"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="oe-amount">Amount ($)</Label>
                <Input
                  id="oe-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="oe-frequency">Frequency</Label>
                <Select
                  value={form.frequency}
                  onValueChange={(v) => setForm((f) => ({ ...f, frequency: v as ExpenseFrequency }))}
                >
                  <SelectTrigger id="oe-frequency">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ExpenseFrequency).map((freq) => (
                      <SelectItem key={freq} value={freq}>
                        {FREQUENCY_LABELS[freq]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formError != null && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !isFormValid}>
              {saving ? 'Saving…' : editingExpense ? 'Save Changes' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirmId != null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Remove Expense?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This expense will be deactivated and removed from reports going forward.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={saving}
            >
              {saving ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
