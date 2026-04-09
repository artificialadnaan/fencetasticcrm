import { useState, useEffect, useCallback } from 'react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EditableField } from '@/components/ui/editable-field';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { CommissionPreview, Transaction } from '@fencetastic/shared';

const PAYMENT_METHOD_OPTIONS = [
  { label: 'Cash', value: 'CASH' },
  { label: 'Check', value: 'CHECK' },
  { label: 'Credit Card', value: 'CREDIT_CARD' },
  { label: 'Zelle', value: 'ZELLE' },
  { label: 'Financing', value: 'FINANCING' },
];

const EXPENSE_CATEGORIES = ['Materials', 'Labor', 'Equipment', 'Permits', 'Sub Payment', 'Fuel', 'Misc'];
const INCOME_CATEGORIES = ['Customer Payment', 'Deposit', 'Partial Payment', 'Final Payment'];

const today = () => new Date().toISOString().slice(0, 10);

interface ProjectFinancialsCardProps {
  projectId: string;
  projectTotal: number;
  paymentMethod: string;
  customerPaid: number;
  forecastedExpenses: number;
  materialsCost: number;
  commissionPreview: CommissionPreview;
  isSnapshot: boolean;
  onSave: (field: string, value: string | number | null) => Promise<void>;
}

interface LineForm {
  category: string;
  description: string;
  amount: string;
  date: string;
}

const emptyForm: LineForm = { category: '', description: '', amount: '', date: today() };

export function ProjectFinancialsCard({
  projectId,
  projectTotal,
  paymentMethod,
  customerPaid,
  forecastedExpenses,
  materialsCost,
  commissionPreview,
  isSnapshot,
  onSave,
}: ProjectFinancialsCardProps) {
  // Income line items
  const [incomeItems, setIncomeItems] = useState<Transaction[]>([]);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [incomeForm, setIncomeForm] = useState<LineForm>({ ...emptyForm });
  const [savingIncome, setSavingIncome] = useState(false);

  // Expense line items
  const [expenseItems, setExpenseItems] = useState<Transaction[]>([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState<LineForm>({ ...emptyForm });
  const [savingExpense, setSavingExpense] = useState(false);

  // Collapsible sections
  const [incomeOpen, setIncomeOpen] = useState(true);
  const [expenseOpen, setExpenseOpen] = useState(true);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchIncome = useCallback(async () => {
    try {
      const res = await api.get(`/transactions?projectId=${projectId}&type=INCOME&limit=100`);
      setIncomeItems(res.data.data ?? []);
    } catch { /* silent */ }
  }, [projectId]);

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await api.get(`/transactions?projectId=${projectId}&type=EXPENSE&limit=100`);
      setExpenseItems(res.data.data ?? []);
    } catch { /* silent */ }
  }, [projectId]);

  useEffect(() => { fetchIncome(); fetchExpenses(); }, [fetchIncome, fetchExpenses]);

  async function addIncome() {
    if (!incomeForm.category || !incomeForm.amount || !incomeForm.date) return;
    setSavingIncome(true);
    try {
      await api.post('/transactions', {
        type: 'INCOME', category: incomeForm.category, description: incomeForm.description || incomeForm.category,
        amount: parseFloat(incomeForm.amount), date: incomeForm.date, projectId,
      });
      setIncomeForm({ ...emptyForm, date: today() });
      setShowIncomeForm(false);
      await fetchIncome();
      onSave('customerPaid', customerPaid); // trigger refetch
    } catch (err) {
      console.error('Failed to add payment:', err);
      alert('Failed to add payment.');
    } finally { setSavingIncome(false); }
  }

  async function addExpense() {
    if (!expenseForm.category || !expenseForm.amount || !expenseForm.date) return;
    setSavingExpense(true);
    try {
      await api.post('/transactions', {
        type: 'EXPENSE', category: expenseForm.category, description: expenseForm.description || expenseForm.category,
        amount: parseFloat(expenseForm.amount), date: expenseForm.date, projectId,
      });
      setExpenseForm({ ...emptyForm, date: today() });
      setShowExpenseForm(false);
      await fetchExpenses();
      onSave('forecastedExpenses', forecastedExpenses); // trigger refetch
    } catch (err) {
      console.error('Failed to add expense:', err);
      alert('Failed to add expense.');
    } finally { setSavingExpense(false); }
  }

  async function handleDelete(id: string, type: 'INCOME' | 'EXPENSE') {
    setDeletingId(id);
    try {
      await api.delete(`/transactions/${id}`);
      if (type === 'INCOME') await fetchIncome();
      else await fetchExpenses();
    } catch { /* silent */ }
    finally { setDeletingId(null); }
  }

  const incomeTotal = incomeItems.reduce((s, i) => s + i.amount, 0);
  const expenseTotal = expenseItems.reduce((s, e) => s + e.amount, 0);

  return (
    <section className="shell-panel rounded-[28px] p-6 md:p-8">
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          Financials
          {isSnapshot && (
            <span className="ml-2 normal-case tracking-normal text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              Snapshot
            </span>
          )}
        </p>
      </div>

      <div className="space-y-3">
        {/* Editable fields */}
        <EditableRow label="Project Total">
          <EditableField label="Project Total" value={projectTotal} type="currency"
            formatDisplay={(v) => formatCurrency(v as number)} onSave={(v) => onSave('projectTotal', v)} />
        </EditableRow>
        <EditableRow label="Payment Method">
          <EditableField label="Payment Method" value={paymentMethod} type="select" options={PAYMENT_METHOD_OPTIONS}
            formatDisplay={(v) => String(v ?? '').replace(/_/g, ' ')} onSave={(v) => onSave('paymentMethod', v)} />
        </EditableRow>
        <EditableRow label="Customer Paid">
          <EditableField label="Customer Paid" value={customerPaid} type="currency"
            formatDisplay={(v) => formatCurrency(v as number)} onSave={(v) => onSave('customerPaid', v)} />
        </EditableRow>
        <EditableRow label="Materials Cost">
          <EditableField label="Materials Cost" value={materialsCost} type="currency"
            formatDisplay={(v) => formatCurrency(v as number)} onSave={(v) => onSave('materialsCost', v)} />
        </EditableRow>
        <EditableRow label="Forecasted Expenses">
          <EditableField label="Forecasted Expenses" value={forecastedExpenses} type="currency"
            formatDisplay={(v) => formatCurrency(v as number)} onSave={(v) => onSave('forecastedExpenses', v)} />
        </EditableRow>

        <Separator />

        {/* Computed fields */}
        <Row label="Money Received" value={formatCurrency(commissionPreview.moneyReceived)} />
        <Row label="Total Expenses" value={formatCurrency(commissionPreview.totalExpenses)} negative />
        <Row label="Adnaan Commission (10%)" value={formatCurrency(commissionPreview.adnaanCommission)} negative />
        <Separator />
        <Row label="Gross Profit" value={formatCurrency(commissionPreview.grossProfit)} highlight />
        <Row label="Aimann Deduction (25%)" value={formatCurrency(commissionPreview.aimannDeduction)} negative />
        <Row label="Meme Commission (5%)" value={formatCurrency(commissionPreview.memeCommission)} negative />
        <Separator />
        <Row label="Net Profit" value={formatCurrency(commissionPreview.netProfit)} highlight />
        <Row label="Profit %" value={formatPercent(commissionPreview.profitPercent)} highlight />

        <Separator />

        {/* Income Section */}
        <div>
          <button onClick={() => setIncomeOpen(!incomeOpen)}
            className="flex items-center gap-1 text-sm font-semibold text-green-700 hover:text-green-900 w-full">
            {incomeOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Income / Payments
            {incomeItems.length > 0 && <span className="ml-auto font-mono text-green-600">{formatCurrency(incomeTotal)}</span>}
          </button>

          {incomeOpen && (
            <div className="mt-2 space-y-1">
              {incomeItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-dashed">
                  <span className="text-slate-400 w-20">{new Date(item.date).toLocaleDateString()}</span>
                  <span className="flex-1 truncate px-2">{item.category}{item.description && item.description !== item.category ? ` — ${item.description}` : ''}</span>
                  <span className="font-mono text-green-600 w-20 text-right">{formatCurrency(item.amount)}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 ml-1 text-destructive" disabled={deletingId === item.id}
                    onClick={() => handleDelete(item.id, 'INCOME')}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              {showIncomeForm ? (
                <div className="p-2 border border-black/5 rounded-[16px] bg-slate-50 space-y-2 mt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={incomeForm.category} onValueChange={(v) => setIncomeForm((f) => ({ ...f, category: v }))}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>{INCOME_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input className="h-7 text-xs" placeholder="Description" value={incomeForm.description}
                      onChange={(e) => setIncomeForm((f) => ({ ...f, description: e.target.value }))} />
                    <Input className="h-7 text-xs" type="number" min="0" step="0.01" placeholder="Amount"
                      value={incomeForm.amount} onChange={(e) => setIncomeForm((f) => ({ ...f, amount: e.target.value }))} />
                    <Input className="h-7 text-xs" type="date" value={incomeForm.date}
                      onChange={(e) => setIncomeForm((f) => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div className="flex gap-1 justify-end">
                    <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => setShowIncomeForm(false)}>Cancel</Button>
                    <Button size="sm" className="h-6 text-xs" onClick={addIncome}
                      disabled={savingIncome || !incomeForm.category || !incomeForm.amount}>{savingIncome ? 'Saving...' : 'Save'}</Button>
                  </div>
                </div>
              ) : (
                <Button variant="ghost" size="sm" className="h-6 text-xs mt-1 text-green-700"
                  onClick={() => { setShowIncomeForm(true); setIncomeForm({ ...emptyForm, date: today() }); }}>
                  <Plus className="h-3 w-3 mr-1" />Add Payment
                </Button>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Expense Section */}
        <div>
          <button onClick={() => setExpenseOpen(!expenseOpen)}
            className="flex items-center gap-1 text-sm font-semibold text-red-700 hover:text-red-900 w-full">
            {expenseOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Expenses
            {expenseItems.length > 0 && <span className="ml-auto font-mono text-red-600">{formatCurrency(expenseTotal)}</span>}
          </button>

          {expenseOpen && (
            <div className="mt-2 space-y-1">
              {expenseItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-dashed">
                  <span className="text-slate-400 w-20">{new Date(item.date).toLocaleDateString()}</span>
                  <span className="flex-1 truncate px-2">{item.category}{item.description && item.description !== item.category ? ` — ${item.description}` : ''}</span>
                  <span className="font-mono text-red-500 w-20 text-right">{formatCurrency(item.amount)}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 ml-1 text-destructive" disabled={deletingId === item.id}
                    onClick={() => handleDelete(item.id, 'EXPENSE')}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              {showExpenseForm ? (
                <div className="p-2 border border-black/5 rounded-[16px] bg-slate-50 space-y-2 mt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={expenseForm.category} onValueChange={(v) => setExpenseForm((f) => ({ ...f, category: v }))}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input className="h-7 text-xs" placeholder="Description" value={expenseForm.description}
                      onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))} />
                    <Input className="h-7 text-xs" type="number" min="0" step="0.01" placeholder="Amount"
                      value={expenseForm.amount} onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))} />
                    <Input className="h-7 text-xs" type="date" value={expenseForm.date}
                      onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div className="flex gap-1 justify-end">
                    <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => setShowExpenseForm(false)}>Cancel</Button>
                    <Button size="sm" className="h-6 text-xs" onClick={addExpense}
                      disabled={savingExpense || !expenseForm.category || !expenseForm.amount}>{savingExpense ? 'Saving...' : 'Save'}</Button>
                  </div>
                </div>
              ) : (
                <Button variant="ghost" size="sm" className="h-6 text-xs mt-1 text-red-700"
                  onClick={() => { setShowExpenseForm(true); setExpenseForm({ ...emptyForm, date: today() }); }}>
                  <Plus className="h-3 w-3 mr-1" />Add Expense
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function EditableRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-slate-500">{label}</span>
      {children}
    </div>
  );
}

function Row({ label, value, negative = false, highlight = false }: {
  label: string; value: string; negative?: boolean; highlight?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className={highlight ? 'font-semibold text-slate-950' : 'text-slate-500'}>{label}</span>
      <span className={`font-mono ${highlight ? 'font-semibold' : ''} ${negative ? 'text-red-500' : ''}`}>
        {negative ? `- ${value}` : value}
      </span>
    </div>
  );
}
