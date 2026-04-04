import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useProject } from '@/hooks/use-project';
import { useSubcontractors } from '@/hooks/use-subcontractors';
import { useNotes } from '@/hooks/use-notes';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { EditableField } from '@/components/ui/editable-field';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/projects/status-badge';
import { NotesTimeline } from '@/components/projects/notes-timeline';
import { PhotoGallery } from '@/components/projects/photo-gallery';
import { SubcontractorTable } from '@/components/projects/subcontractor-table';
import { ProjectStatus } from '@fencetastic/shared';
import type { Transaction } from '@fencetastic/shared';
import {
  ArrowLeft,
  FileText,
  DollarSign,
  Building,
  TrendingUp,
  FileEdit,
  Trash2,
  Plus,
  CalendarDays,
  Info,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FENCE_TYPE_OPTIONS = [
  { label: 'Wood', value: 'WOOD' },
  { label: 'Metal', value: 'METAL' },
  { label: 'Chain Link', value: 'CHAIN_LINK' },
  { label: 'Vinyl', value: 'VINYL' },
  { label: 'Gate', value: 'GATE' },
  { label: 'Other', value: 'OTHER' },
];

const PAYMENT_METHOD_OPTIONS = [
  { label: 'Cash', value: 'CASH' },
  { label: 'Check', value: 'CHECK' },
  { label: 'Credit Card', value: 'CREDIT_CARD' },
  { label: 'Zelle', value: 'ZELLE' },
  { label: 'Financing', value: 'FINANCING' },
];

const EXPENSE_CATEGORIES = ['Materials', 'Labor', 'Equipment', 'Permits', 'Sub Payment', 'Fuel', 'Misc'];
const INCOME_CATEGORIES = ['Customer Payment', 'Deposit', 'Partial Payment', 'Final Payment'];

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'payments', label: 'Payments' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'commission', label: 'Commission' },
  { id: 'activity', label: 'Activity' },
  { id: 'photos', label: 'Photos' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const today = () => new Date().toISOString().slice(0, 10);

interface LineForm {
  category: string;
  description: string;
  amount: string;
  date: string;
}

const emptyForm: LineForm = { category: '', description: '', amount: '', date: today() };

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { project, isLoading, error, refetch } = useProject(id);
  const { user } = useAuth();

  const {
    data: subs,
    addSub,
    updateSub,
    deleteSub,
  } = useSubcontractors(id);

  const {
    data: notes,
    createNote,
    updateNote,
    deleteNote,
    uploadPhoto,
  } = useNotes(id);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Transaction state
  const [incomeItems, setIncomeItems] = useState<Transaction[]>([]);
  const [expenseItems, setExpenseItems] = useState<Transaction[]>([]);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [incomeForm, setIncomeForm] = useState<LineForm>({ ...emptyForm });
  const [expenseForm, setExpenseForm] = useState<LineForm>({ ...emptyForm });
  const [savingIncome, setSavingIncome] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Delete project dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch transactions
  const fetchIncome = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get(`/transactions?projectId=${id}&type=INCOME&limit=100`);
      setIncomeItems(res.data.data ?? []);
    } catch { /* silent */ }
  }, [id]);

  const fetchExpenses = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get(`/transactions?projectId=${id}&type=EXPENSE&limit=100`);
      setExpenseItems(res.data.data ?? []);
    } catch { /* silent */ }
  }, [id]);

  useEffect(() => {
    fetchIncome();
    fetchExpenses();
  }, [fetchIncome, fetchExpenses]);

  // Handlers
  const handleFieldSave = async (field: string, value: string | number | null) => {
    try {
      await api.patch(`/projects/${id}`, { [field]: value });
      refetch();
    } catch (err) {
      console.error('Failed to save:', err);
      alert('Failed to save field.');
    }
  };

  async function handleStatusChange(newStatus: string) {
    try {
      await api.patch(`/projects/${id}`, { status: newStatus });
      refetch();
    } catch (err) {
      console.error('Status change failed:', err);
      alert('Failed to update status.');
      refetch();
    }
  }

  async function handleDeleteProject() {
    setDeleting(true);
    try {
      await api.delete(`/projects/${id}`);
      navigate('/projects');
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete project.');
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  async function addIncome() {
    if (!incomeForm.category || !incomeForm.amount || !incomeForm.date) return;
    setSavingIncome(true);
    try {
      await api.post('/transactions', {
        type: 'INCOME',
        category: incomeForm.category,
        description: incomeForm.description || incomeForm.category,
        amount: parseFloat(incomeForm.amount),
        date: incomeForm.date,
        projectId: id,
      });
      setIncomeForm({ ...emptyForm, date: today() });
      setShowIncomeForm(false);
      await fetchIncome();
      refetch();
    } catch (err) {
      console.error('Failed to add payment:', err);
      alert('Failed to add payment.');
    } finally {
      setSavingIncome(false);
    }
  }

  async function addExpense() {
    if (!expenseForm.category || !expenseForm.amount || !expenseForm.date) return;
    setSavingExpense(true);
    try {
      await api.post('/transactions', {
        type: 'EXPENSE',
        category: expenseForm.category,
        description: expenseForm.description || expenseForm.category,
        amount: parseFloat(expenseForm.amount),
        date: expenseForm.date,
        projectId: id,
      });
      setExpenseForm({ ...emptyForm, date: today() });
      setShowExpenseForm(false);
      await fetchExpenses();
      refetch();
    } catch (err) {
      console.error('Failed to add expense:', err);
      alert('Failed to add expense.');
    } finally {
      setSavingExpense(false);
    }
  }

  async function handleDeleteTransaction(txId: string, type: 'INCOME' | 'EXPENSE') {
    setDeletingId(txId);
    try {
      await api.delete(`/transactions/${txId}`);
      if (type === 'INCOME') await fetchIncome();
      else await fetchExpenses();
      refetch();
    } catch {
      /* silent */
    } finally {
      setDeletingId(null);
    }
  }

  // Derived values
  const incomeTotal = incomeItems.reduce((s, i) => s + i.amount, 0);
  const expenseTotal = expenseItems.reduce((s, e) => s + e.amount, 0);

  // Tab counts for badges
  const tabCounts: Partial<Record<TabId, number>> = {
    payments: incomeItems.length,
    expenses: expenseItems.length,
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-8 text-center">
          <p className="text-destructive">{error || 'Project not found'}</p>
        </CardContent>
      </Card>
    );
  }

  const cp = project.commissionPreview;
  // The API returns commission fields that aren't on the ProjectDetail type
  const projectExtra = project as unknown as {
    commissionOwed?: number | null;
    memesCommission?: number | null;
    aimannsCommission?: number | null;
  };
  const photosFromNotes = notes.filter((n) => n.photoUrls.length > 0);

  return (
    <div className="space-y-6">
      {/* ================================================================ */}
      {/* HEADER CARD                                                      */}
      {/* ================================================================ */}
      <Card>
        <CardContent className="py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Back link */}
            <Link
              to="/projects"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Projects
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-3">
            {/* Left: customer info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
                  {project.customer}
                </h1>
                <StatusBadge status={project.status} />
              </div>
              <p className="text-muted-foreground mt-1 truncate">{project.address}</p>
              {project.subcontractor && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  Sub: {project.subcontractor}
                </p>
              )}
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://forms.zoho.com/fencetastic/form/PropertyInquiryForm', '_blank')}
              >
                <FileEdit className="h-4 w-4 mr-1" />
                Work Order
              </Button>

              <Select value={project.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Change status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ProjectStatus).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* KPI SUMMARY CARDS                                                */}
      {/* ================================================================ */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <KpiCard
          label="Invoice"
          value={formatCurrency(project.projectTotal)}
          icon={<FileText className="h-5 w-5" />}
        />
        <KpiCard
          label="Collected"
          value={formatCurrency(project.customerPaid)}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <KpiCard
          label="Expenses"
          value={formatCurrency(cp.totalExpenses || project.forecastedExpenses)}
          icon={<Building className="h-5 w-5" />}
        />
        <KpiCard
          label="Profit"
          value={formatCurrency(cp.netProfit)}
          icon={<TrendingUp className="h-5 w-5" />}
          valueClassName={cp.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}
        />
      </div>

      {/* ================================================================ */}
      {/* TAB BAR                                                          */}
      {/* ================================================================ */}
      <div className="border-b">
        <nav className="flex gap-0 overflow-x-auto -mb-px">
          {TABS.map((tab) => {
            const count = tabCounts[tab.id];
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                }`}
              >
                {tab.label}
                {count != null && count > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1.5 h-5 min-w-[20px] px-1.5 text-[10px] rounded-full"
                  >
                    {count}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ================================================================ */}
      {/* TAB CONTENT                                                      */}
      {/* ================================================================ */}

      {/* --- OVERVIEW TAB --- */}
      {activeTab === 'overview' && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-4 w-4" />
                Job Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <FieldRow label="Contract Date">
                <EditableField
                  label="Contract Date"
                  value={project.contractDate}
                  type="date"
                  formatDisplay={(v) => formatDate(v as string | null)}
                  onSave={(v) => handleFieldSave('contractDate', v)}
                />
              </FieldRow>
              <FieldRow label="Fence Type">
                <EditableField
                  label="Fence Type"
                  value={project.fenceType}
                  type="select"
                  options={FENCE_TYPE_OPTIONS}
                  formatDisplay={(v) => String(v ?? '').replace(/_/g, ' ')}
                  onSave={(v) => handleFieldSave('fenceType', v)}
                />
              </FieldRow>
              <FieldRow label="Description">
                <EditableField
                  label="Description"
                  value={project.description}
                  type="text"
                  onSave={(v) => handleFieldSave('description', v)}
                />
              </FieldRow>
              <FieldRow label="Linear Feet">
                <EditableField
                  label="Linear Feet"
                  value={project.linearFeet}
                  type="number"
                  formatDisplay={(v) => (v != null ? `${v} ft` : '\u2014')}
                  onSave={(v) => handleFieldSave('linearFeet', v)}
                />
              </FieldRow>
              <FieldRow label="Subcontractor">
                <EditableField
                  label="Subcontractor"
                  value={project.subcontractor}
                  type="text"
                  formatDisplay={(v) => (v != null && v !== '' ? String(v) : '\u2014')}
                  onSave={(v) => handleFieldSave('subcontractor', v)}
                />
              </FieldRow>
              <FieldRow label="Payment Method">
                <EditableField
                  label="Payment Method"
                  value={project.paymentMethod}
                  type="select"
                  options={PAYMENT_METHOD_OPTIONS}
                  formatDisplay={(v) => String(v ?? '').replace(/_/g, ' ')}
                  onSave={(v) => handleFieldSave('paymentMethod', v)}
                />
              </FieldRow>
              <FieldRow label="Project Total">
                <EditableField
                  label="Project Total"
                  value={project.projectTotal}
                  type="currency"
                  formatDisplay={(v) => formatCurrency(v as number)}
                  onSave={(v) => handleFieldSave('projectTotal', v)}
                />
              </FieldRow>
              <FieldRow label="Customer Paid">
                <EditableField
                  label="Customer Paid"
                  value={project.customerPaid}
                  type="currency"
                  formatDisplay={(v) => formatCurrency(v as number)}
                  onSave={(v) => handleFieldSave('customerPaid', v)}
                />
              </FieldRow>
              <FieldRow label="Materials Cost">
                <EditableField
                  label="Materials Cost"
                  value={project.materialsCost}
                  type="currency"
                  formatDisplay={(v) => formatCurrency(v as number)}
                  onSave={(v) => handleFieldSave('materialsCost', v)}
                />
              </FieldRow>
              <FieldRow label="Forecasted Expenses">
                <EditableField
                  label="Forecasted Expenses"
                  value={project.forecastedExpenses}
                  type="currency"
                  formatDisplay={(v) => formatCurrency(v as number)}
                  onSave={(v) => handleFieldSave('forecastedExpenses', v)}
                />
              </FieldRow>
              <FieldRow label="Notes">
                <EditableField
                  label="Notes"
                  value={project.notes}
                  type="text"
                  formatDisplay={(v) => (v != null && v !== '' ? String(v) : '\u2014')}
                  onSave={(v) => handleFieldSave('notes', v)}
                />
              </FieldRow>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <FieldRow label="Install Date">
                <EditableField
                  label="Install Date"
                  value={project.installDate}
                  type="date"
                  formatDisplay={(v) => formatDate(v as string | null)}
                  onSave={(v) => handleFieldSave('installDate', v)}
                />
              </FieldRow>
              <FieldRow label="Estimate Date">
                <EditableField
                  label="Estimate Date"
                  value={project.estimateDate}
                  type="date"
                  formatDisplay={(v) => formatDate(v as string | null)}
                  onSave={(v) => handleFieldSave('estimateDate', v)}
                />
              </FieldRow>
              <FieldRow label="Follow-Up Date">
                <EditableField
                  label="Follow-Up Date"
                  value={project.followUpDate}
                  type="date"
                  formatDisplay={(v) => formatDate(v as string | null)}
                  onSave={(v) => handleFieldSave('followUpDate', v)}
                />
              </FieldRow>
              <FieldRow label="Completed Date">
                <EditableField
                  label="Completed Date"
                  value={project.completedDate}
                  type="date"
                  formatDisplay={(v) => formatDate(v as string | null)}
                  onSave={(v) => handleFieldSave('completedDate', v)}
                />
              </FieldRow>
            </CardContent>
          </Card>
        </div>
      )}

      {/* --- PAYMENTS TAB --- */}
      {activeTab === 'payments' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">Income / Payments</CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setShowIncomeForm(true);
                setIncomeForm({ ...emptyForm, date: today() });
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </CardHeader>
          <CardContent>
            {showIncomeForm && (
              <div className="p-3 border rounded-lg bg-muted/30 space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    value={incomeForm.category}
                    onValueChange={(v) => setIncomeForm((f) => ({ ...f, category: v }))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {INCOME_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="h-8 text-sm"
                    placeholder="Description"
                    value={incomeForm.description}
                    onChange={(e) => setIncomeForm((f) => ({ ...f, description: e.target.value }))}
                  />
                  <Input
                    className="h-8 text-sm"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Amount"
                    value={incomeForm.amount}
                    onChange={(e) => setIncomeForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                  <Input
                    className="h-8 text-sm"
                    type="date"
                    value={incomeForm.date}
                    onChange={(e) => setIncomeForm((f) => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowIncomeForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={addIncome}
                    disabled={savingIncome || !incomeForm.category || !incomeForm.amount}
                  >
                    {savingIncome ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            )}

            {incomeItems.length === 0 && !showIncomeForm ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No payments recorded yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 pr-4 font-medium">Type</th>
                      <th className="text-left py-2 pr-4 font-medium">Description</th>
                      <th className="text-right py-2 pr-4 font-medium">Amount</th>
                      <th className="text-left py-2 pr-4 font-medium">Date</th>
                      <th className="py-2 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {incomeItems.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-2 pr-4 font-medium">{item.category}</td>
                        <td className="py-2 pr-4 text-muted-foreground truncate max-w-[200px]">
                          {item.description !== item.category ? item.description : '\u2014'}
                        </td>
                        <td className="py-2 pr-4 text-right font-mono text-green-600">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {formatDate(item.date)}
                        </td>
                        <td className="py-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            disabled={deletingId === item.id}
                            onClick={() => handleDeleteTransaction(item.id, 'INCOME')}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {incomeItems.length > 0 && (
                    <tfoot>
                      <tr className="border-t font-semibold">
                        <td className="pt-3 pr-4" colSpan={2}>
                          Total Income
                        </td>
                        <td className="pt-3 pr-4 text-right font-mono text-green-600">
                          {formatCurrency(incomeTotal)}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* --- EXPENSES TAB --- */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Expenses</CardTitle>
              <Button
                size="sm"
                onClick={() => {
                  setShowExpenseForm(true);
                  setExpenseForm({ ...emptyForm, date: today() });
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </CardHeader>
            <CardContent>
              {showExpenseForm && (
                <div className="p-3 border rounded-lg bg-muted/30 space-y-3 mb-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      value={expenseForm.category}
                      onValueChange={(v) => setExpenseForm((f) => ({ ...f, category: v }))}
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
                    <Input
                      className="h-8 text-sm"
                      placeholder="Description"
                      value={expenseForm.description}
                      onChange={(e) =>
                        setExpenseForm((f) => ({ ...f, description: e.target.value }))
                      }
                    />
                    <Input
                      className="h-8 text-sm"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Amount"
                      value={expenseForm.amount}
                      onChange={(e) =>
                        setExpenseForm((f) => ({ ...f, amount: e.target.value }))
                      }
                    />
                    <Input
                      className="h-8 text-sm"
                      type="date"
                      value={expenseForm.date}
                      onChange={(e) =>
                        setExpenseForm((f) => ({ ...f, date: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowExpenseForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={addExpense}
                      disabled={savingExpense || !expenseForm.category || !expenseForm.amount}
                    >
                      {savingExpense ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              )}

              {expenseItems.length === 0 && !showExpenseForm ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No expenses recorded yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 pr-4 font-medium">Category</th>
                        <th className="text-left py-2 pr-4 font-medium">Description</th>
                        <th className="text-right py-2 pr-4 font-medium">Amount</th>
                        <th className="text-left py-2 pr-4 font-medium">Date</th>
                        <th className="py-2 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {expenseItems.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b hover:bg-muted/50 transition-colors"
                        >
                          <td className="py-2 pr-4 font-medium">{item.category}</td>
                          <td className="py-2 pr-4 text-muted-foreground truncate max-w-[200px]">
                            {item.description !== item.category ? item.description : '\u2014'}
                          </td>
                          <td className="py-2 pr-4 text-right font-mono text-red-500">
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">
                            {formatDate(item.date)}
                          </td>
                          <td className="py-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              disabled={deletingId === item.id}
                              onClick={() => handleDeleteTransaction(item.id, 'EXPENSE')}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {expenseItems.length > 0 && (
                      <tfoot>
                        <tr className="border-t font-semibold">
                          <td className="pt-3 pr-4" colSpan={2}>
                            Total Expenses
                          </td>
                          <td className="pt-3 pr-4 text-right font-mono text-red-500">
                            {formatCurrency(expenseTotal)}
                          </td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subcontractor Payments within Expenses tab */}
          <SubcontractorTable
            projectId={project.id}
            subs={subs}
            onAdd={addSub}
            onUpdate={updateSub}
            onDelete={deleteSub}
            onDataChange={refetch}
          />
        </div>
      )}

      {/* --- COMMISSION TAB --- */}
      {activeTab === 'commission' && (
        <div className="grid gap-4 md:grid-cols-3">
          {/* Left: payments + expenses + profit */}
          <div className="md:col-span-2 space-y-4">
            {/* PAYMENTS */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Payments</h3>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setActiveTab('payments')}>
                  <Plus className="h-3 w-3 mr-1" />Add
                </Button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-1.5 font-medium">Type</th>
                    <th className="text-right py-1.5 font-medium">Amount</th>
                    <th className="text-right py-1.5 font-medium">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {incomeItems.length === 0 ? (
                    <tr><td colSpan={3} className="py-3 text-center text-muted-foreground">No payments yet</td></tr>
                  ) : incomeItems.map((item) => (
                    <tr key={item.id} className="border-b border-dashed">
                      <td className="py-1.5 font-medium uppercase text-xs">{item.category}</td>
                      <td className="py-1.5 text-right font-mono">{formatCurrency(item.amount)}</td>
                      <td className="py-1.5 text-right"><span className="text-green-600">&#10003;</span></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold">
                    <td className="pt-2">Total Income</td>
                    <td className="pt-2 text-right font-mono">{formatCurrency(incomeTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            <Separator />

            {/* EXPENSES */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Expenses</h3>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setActiveTab('expenses')}>
                  <Plus className="h-3 w-3 mr-1" />Add
                </Button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-1.5 font-medium">Category</th>
                    <th className="text-left py-1.5 font-medium">Description</th>
                    <th className="text-right py-1.5 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseItems.length === 0 ? (
                    <tr><td colSpan={3} className="py-3 text-center text-muted-foreground">No expenses yet</td></tr>
                  ) : expenseItems.map((item) => (
                    <tr key={item.id} className="border-b border-dashed">
                      <td className="py-1.5 font-medium uppercase text-xs">{item.category}</td>
                      <td className="py-1.5 text-muted-foreground">{item.description || '—'}</td>
                      <td className="py-1.5 text-right font-mono">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold">
                    <td colSpan={2} className="pt-2">Total Job Cost</td>
                    <td className="pt-2 text-right font-mono">{formatCurrency(expenseTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Total Profit bar */}
            <Card className="bg-gradient-to-r from-purple-600/5 to-cyan-500/5 border-purple-200">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total Profit</span>
                  <span className={`text-xl font-bold font-mono ${cp.grossProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {formatCurrency(cp.grossProfit)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: SUMMARY sidebar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SummaryRow label="Income" value={formatCurrency(incomeTotal > 0 ? incomeTotal : cp.moneyReceived)} />
              <SummaryRow label="Expenses" value={formatCurrency(expenseTotal > 0 ? expenseTotal : cp.totalExpenses)} negative />
              <Separator />
              <SummaryRow label="Profit" value={formatCurrency(cp.grossProfit)} highlight positive={cp.grossProfit >= 0} />
              <Separator />
              <SummaryRow label="Adnaan Commission (10%)" value={formatCurrency(cp.adnaanCommission)} negative />
              <SummaryRow label="Meme Commission (5%)" value={formatCurrency(cp.memeCommission)} negative />
              <SummaryRow label="Aimann Deduction (25%)" value={formatCurrency(cp.aimannDeduction)} negative />
              <Separator />
              <SummaryRow label="Company Half" value={formatCurrency(cp.netProfit)} highlight positive={cp.netProfit >= 0} />

              <Separator />

              {/* Editable overrides */}
              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Overrides</p>
                <FieldRow label="Commission Owed">
                  <EditableField label="Commission Owed" value={projectExtra.commissionOwed ?? null} type="currency"
                    formatDisplay={(v) => (v != null ? formatCurrency(v as number) : '\u2014')} onSave={(v) => handleFieldSave('commissionOwed', v)} />
                </FieldRow>
                <FieldRow label="Meme's Comm">
                  <EditableField label="Meme's Commission" value={projectExtra.memesCommission ?? null} type="currency"
                    formatDisplay={(v) => (v != null ? formatCurrency(v as number) : '\u2014')} onSave={(v) => handleFieldSave('memesCommission', v)} />
                </FieldRow>
                <FieldRow label="Aimann's Comm">
                  <EditableField label="Aimann's Commission" value={projectExtra.aimannsCommission ?? null} type="currency"
                    formatDisplay={(v) => (v != null ? formatCurrency(v as number) : '\u2014')} onSave={(v) => handleFieldSave('aimannsCommission', v)} />
                </FieldRow>
              </div>

              <Separator />

              {/* Notes */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                <EditableField label="Notes" value={project.notes} type="text"
                  formatDisplay={(v) => (v ? String(v) : 'Add notes...')} onSave={(v) => handleFieldSave('notes', v)} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* --- ACTIVITY TAB --- */}
      {activeTab === 'activity' && (
        <NotesTimeline
          projectId={project.id}
          notes={notes}
          currentUserId={user?.id ?? ''}
          onCreateNote={createNote}
          onUpdateNote={updateNote}
          onDeleteNote={deleteNote}
          uploadPhoto={uploadPhoto}
        />
      )}

      {/* --- PHOTOS TAB --- */}
      {activeTab === 'photos' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Photos</CardTitle>
          </CardHeader>
          <CardContent>
            {photosFromNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No photos yet. Add photos via the Activity tab.
              </p>
            ) : (
              <div className="space-y-4">
                {photosFromNotes.map((note) => (
                  <div key={note.id}>
                    <p className="text-xs text-muted-foreground mb-1">
                      {note.authorName} &middot; {formatDate(note.createdAt.split('T')[0])}
                    </p>
                    <PhotoGallery urls={note.photoUrls} altPrefix="Project photo" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ================================================================ */}
      {/* DELETE CONFIRMATION DIALOG                                       */}
      {/* ================================================================ */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Project?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This will soft-delete the project for <strong>{project.customer}</strong>. This
            action cannot be easily undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProject} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  icon,
  valueClassName,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="py-4">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className={`text-xl sm:text-2xl font-bold mt-1 font-mono ${valueClassName ?? ''}`}>
          {value}
        </p>
        <div className="absolute top-4 right-4 text-muted-foreground/20">{icon}</div>
      </CardContent>
    </Card>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  negative = false,
  highlight = false,
  positive,
}: {
  label: string;
  value: string;
  negative?: boolean;
  highlight?: boolean;
  positive?: boolean;
}) {
  let valueClass = '';
  if (positive === true) valueClass = 'text-green-600';
  else if (positive === false) valueClass = 'text-red-500';
  else if (negative) valueClass = 'text-red-500';

  return (
    <div className="flex justify-between text-sm">
      <span className={highlight ? 'font-semibold' : 'text-muted-foreground'}>{label}</span>
      <span className={`font-mono ${highlight ? 'font-semibold' : ''} ${valueClass}`}>
        {negative && positive === undefined ? `- ${value}` : value}
      </span>
    </div>
  );
}
