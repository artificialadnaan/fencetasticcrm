import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useProject } from '@/hooks/use-project';
import { useSubcontractors } from '@/hooks/use-subcontractors';
import { useNotes } from '@/hooks/use-notes';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { EditableField } from '@/components/ui/editable-field';
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
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/projects/status-badge';
import { NotesTimeline } from '@/components/projects/notes-timeline';
import { PhotoGallery } from '@/components/projects/photo-gallery';
import { SubcontractorTable } from '@/components/projects/subcontractor-table';
import { FollowUpPanel } from '@/components/projects/follow-up-panel';
import { PROJECT_STATUS_META, PROJECT_STATUS_ORDER, ProjectStatus } from '@fencetastic/shared';
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
  { id: 'follow-up', label: 'Follow-Up' },
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
    refetch: refetchNotes,
    createNote,
    updateNote,
    deleteNote,
    uploadPhoto,
  } = useNotes(id);

  // Tab state synced to URL
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>(
    () => (searchParams.get('tab') as TabId) || 'overview'
  );
  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  }, [setSearchParams]);

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
  const [deleteTransactionId, setDeleteTransactionId] = useState<string | null>(null);
  const [deleteTransactionType, setDeleteTransactionType] = useState<'INCOME' | 'EXPENSE' | null>(null);

  // Error states for fetch failures
  const [incomeError, setIncomeError] = useState<string | null>(null);
  const [expenseError, setExpenseError] = useState<string | null>(null);

  // Delete project dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch transactions
  const fetchIncome = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get(`/transactions?projectId=${id}&type=INCOME&limit=100`);
      setIncomeItems(res.data.data ?? []);
      setIncomeError(null);
    } catch {
      setIncomeError('Failed to load payments');
    }
  }, [id]);

  const fetchExpenses = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get(`/transactions?projectId=${id}&type=EXPENSE&limit=100`);
      setExpenseItems(res.data.data ?? []);
      setExpenseError(null);
    } catch {
      setExpenseError('Failed to load expenses');
    }
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
      toast.success('Field updated');
    } catch (err) {
      console.error('Failed to save:', err);
      toast.error('Failed to save field');
    }
  };

  async function handleStatusChange(newStatus: string) {
    try {
      await api.patch(`/projects/${id}`, { status: newStatus });
      refetch();
      toast.success('Status updated');
    } catch (err) {
      console.error('Status change failed:', err);
      toast.error('Failed to update status');
      refetch();
    }
  }

  async function handleDeleteProject() {
    setDeleting(true);
    try {
      await api.delete(`/projects/${id}`);
      toast.success('Project deleted');
      navigate('/projects');
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Failed to delete project');
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
      toast.success('Payment added');
    } catch (err) {
      console.error('Failed to add payment:', err);
      toast.error('Failed to add payment');
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
      toast.success('Expense added');
    } catch (err) {
      console.error('Failed to add expense:', err);
      toast.error('Failed to add expense');
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
      toast.success('Transaction deleted');
    } catch {
      toast.error('Failed to delete transaction');
    } finally {
      setDeletingId(null);
      setDeleteTransactionId(null);
      setDeleteTransactionType(null);
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
        <Skeleton className="h-24 w-full rounded-[28px]" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Skeleton className="h-24 rounded-[24px]" />
          <Skeleton className="h-24 rounded-[24px]" />
          <Skeleton className="h-24 rounded-[24px]" />
          <Skeleton className="h-24 rounded-[24px]" />
        </div>
        <Skeleton className="h-[400px] rounded-[28px]" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <section className="shell-panel rounded-[28px] p-8 text-center">
        <p className="text-red-500">{error || 'Project not found'}</p>
      </section>
    );
  }

  const cp = project.commissionPreview;
  const photosFromNotes = notes.filter((n) => n.photoUrls.length > 0);
  const currentStatusIndex = PROJECT_STATUS_ORDER.indexOf(project.status);
  const lifecycleStages = PROJECT_STATUS_ORDER.map((status) => {
    const meta = PROJECT_STATUS_META[status];
    const trackedDate =
      meta.lifecycleDateField != null ? project[meta.lifecycleDateField] : null;
    const isCurrent = status === project.status;
    const isCompleted = currentStatusIndex >= PROJECT_STATUS_ORDER.indexOf(status);

    return {
      status,
      meta,
      trackedDate,
      stateLabel: trackedDate
        ? formatDate(trackedDate)
        : isCurrent
          ? 'Current stage'
          : isCompleted
            ? 'Reached'
            : 'Pending',
    };
  });

  return (
    <div className="space-y-6">
      {/* ================================================================ */}
      {/* HEADER                                                           */}
      {/* ================================================================ */}
      <section className="shell-panel rounded-[28px] p-6 md:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Link
            to="/projects"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-950 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4">
          {/* Left: customer info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.05em] text-slate-950 truncate">
                {project.customer}
              </h1>
              <StatusBadge status={project.status} />
            </div>
            <p className="text-slate-500 mt-1 truncate">{project.address}</p>
            {project.subcontractor && (
              <p className="text-sm text-slate-400 mt-0.5">
                Sub: {project.subcontractor}
              </p>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/projects/${project.id}/work-order`)}
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
      </section>

      {/* ================================================================ */}
      {/* KPI METRIC TILES                                                 */}
      {/* ================================================================ */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <KpiTile
          label="Invoice"
          value={formatCurrency(project.projectTotal)}
          icon={<FileText className="h-5 w-5" />}
        />
        <KpiTile
          label="Collected"
          value={formatCurrency(project.customerPaid)}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <KpiTile
          label="Expenses"
          value={formatCurrency(cp.totalExpenses || project.forecastedExpenses)}
          icon={<Building className="h-5 w-5" />}
        />
        <KpiTile
          label="Profit"
          value={formatCurrency(cp.netProfit)}
          icon={<TrendingUp className="h-5 w-5" />}
          valueClassName={cp.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}
          dark={cp.netProfit >= 0}
        />
      </div>

      {/* ================================================================ */}
      {/* TAB BAR                                                          */}
      {/* ================================================================ */}
      <div className="rounded-[28px] border border-black/5 bg-white/55 p-2 shadow-sm">
        <div role="tablist" className="flex flex-wrap items-center gap-2">
          {TABS.map((tab) => {
            const count = tabCounts[tab.id];
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(tab.id)}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[hsl(var(--brand-blue))] text-white shadow-[0_10px_24px_rgba(78,156,207,0.25)]'
                    : 'text-slate-600 hover:bg-white hover:text-slate-950'
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
        </div>
      </div>

      {/* ================================================================ */}
      {/* TAB CONTENT                                                      */}
      {/* ================================================================ */}

      {/* --- OVERVIEW TAB --- */}
      {activeTab === 'overview' && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Job Details */}
          <section className="shell-panel rounded-[28px] p-6 md:p-8">
            <div className="flex items-center gap-2 mb-5">
              <Info className="h-4 w-4 text-slate-400" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Job Details</p>
            </div>
            <div className="space-y-3">
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
            </div>
          </section>

          {/* Schedule */}
          <section className="shell-panel rounded-[28px] p-6 md:p-8">
            <div className="flex items-center gap-2 mb-5">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Schedule</p>
            </div>
            <div className="space-y-3">
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
              <FieldRow label="Completed Date">
                <EditableField
                  label="Completed Date"
                  value={project.completedDate}
                  type="date"
                  formatDisplay={(v) => formatDate(v as string | null)}
                  onSave={(v) => handleFieldSave('completedDate', v)}
                />
              </FieldRow>
            </div>
          </section>

          {/* Lifecycle */}
          <section className="shell-panel rounded-[28px] p-6 md:p-8 md:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 mb-5">Lifecycle</p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {lifecycleStages.map(({ status, meta, trackedDate, stateLabel }) => (
                <div key={status} className="rounded-[24px] border border-black/5 bg-white/70 px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-slate-950">{meta.label}</div>
                    <StatusBadge status={status} className="text-[11px]" />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{meta.description}</p>
                  <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">
                    {meta.lifecycleDateLabel ?? 'Tracking'}
                  </p>
                  <p className="text-sm font-medium text-slate-950">
                    {trackedDate ? formatDate(trackedDate) : stateLabel}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* --- FOLLOW-UP TAB --- */}
      {activeTab === 'follow-up' && (
        <FollowUpPanel projectId={id ?? project.id} />
      )}

      {/* --- PAYMENTS TAB --- */}
      {activeTab === 'payments' && (
        <section className="shell-panel rounded-[28px] p-6 md:p-8">
          <div className="flex items-center justify-between mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Income / Payments</p>
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
          </div>

          {incomeError && (
            <div className="mb-4 rounded-[24px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {incomeError}
            </div>
          )}

          {showIncomeForm && (
            <div className="p-4 border border-black/5 rounded-[16px] bg-slate-50 space-y-3 mb-4">
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
            <div className="text-center py-6">
              <p className="text-sm text-slate-400">No payments recorded yet.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowIncomeForm(true)} className="mt-2 rounded-2xl">
                Add Payment
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-slate-400">
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
                      className="border-b hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-2 pr-4 font-medium">{item.category}</td>
                      <td className="py-2 pr-4 text-slate-400 truncate max-w-[200px]">
                        {item.description !== item.category ? item.description : '\u2014'}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono text-green-600">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="py-2 pr-4 text-slate-400">
                        {formatDate(item.date)}
                      </td>
                      <td className="py-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          disabled={deletingId === item.id}
                          onClick={() => { setDeleteTransactionId(item.id); setDeleteTransactionType('INCOME'); }}
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
        </section>
      )}

      {/* --- EXPENSES TAB --- */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <section className="shell-panel rounded-[28px] p-6 md:p-8">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Expenses</p>
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
            </div>

            {expenseError && (
              <div className="mb-4 rounded-[24px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {expenseError}
              </div>
            )}

            {showExpenseForm && (
              <div className="p-4 border border-black/5 rounded-[16px] bg-slate-50 space-y-3 mb-4">
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
              <div className="text-center py-6">
                <p className="text-sm text-slate-400">No expenses recorded yet.</p>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowExpenseForm(true)} className="mt-2 rounded-2xl">
                  Add Expense
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-slate-400">
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
                        className="border-b hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="py-2 pr-4 font-medium">{item.category}</td>
                        <td className="py-2 pr-4 text-slate-400 truncate max-w-[200px]">
                          {item.description !== item.category ? item.description : '\u2014'}
                        </td>
                        <td className="py-2 pr-4 text-right font-mono text-red-500">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="py-2 pr-4 text-slate-400">
                          {formatDate(item.date)}
                        </td>
                        <td className="py-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            disabled={deletingId === item.id}
                            onClick={() => { setDeleteTransactionId(item.id); setDeleteTransactionType('EXPENSE'); }}
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
          </section>

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
            <section className="shell-panel rounded-[28px] p-6 md:p-8">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Payments</p>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => handleTabChange('payments')}>
                  <Plus className="h-3 w-3 mr-1" />Add
                </Button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-slate-400">
                    <th className="text-left py-1.5 font-medium">Type</th>
                    <th className="text-right py-1.5 font-medium">Amount</th>
                    <th className="text-right py-1.5 font-medium">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {incomeItems.length === 0 ? (
                    <tr><td colSpan={3} className="py-3 text-center text-slate-400">No payments yet</td></tr>
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
            </section>

            {/* EXPENSES */}
            <section className="shell-panel rounded-[28px] p-6 md:p-8">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Expenses</p>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => handleTabChange('expenses')}>
                  <Plus className="h-3 w-3 mr-1" />Add
                </Button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-slate-400">
                    <th className="text-left py-1.5 font-medium">Category</th>
                    <th className="text-left py-1.5 font-medium">Description</th>
                    <th className="text-right py-1.5 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseItems.length === 0 ? (
                    <tr><td colSpan={3} className="py-3 text-center text-slate-400">No expenses yet</td></tr>
                  ) : expenseItems.map((item) => (
                    <tr key={item.id} className="border-b border-dashed">
                      <td className="py-1.5 font-medium uppercase text-xs">{item.category}</td>
                      <td className="py-1.5 text-slate-400">{item.description || '—'}</td>
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
            </section>

            {/* Total Profit tile */}
            <div className="rounded-[24px] border border-black/5 bg-slate-950 px-5 py-4 text-white">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total Profit</span>
                <span className={`text-xl font-bold font-mono ${cp.grossProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(cp.grossProfit)}
                </span>
              </div>
            </div>
          </div>

          {/* Right: SUMMARY sidebar */}
          <section className="shell-panel rounded-[28px] p-6 md:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 mb-4">Summary</p>
            <div className="space-y-3">
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
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Overrides</p>
                <FieldRow label="Commission Owed">
                  <EditableField label="Commission Owed" value={project.commissionOwed ?? null} type="currency"
                    formatDisplay={(v) => (v != null ? formatCurrency(v as number) : '\u2014')} onSave={(v) => handleFieldSave('commissionOwed', v)} />
                </FieldRow>
                <FieldRow label="Meme's Comm">
                  <EditableField label="Meme's Commission" value={project.memesCommission ?? null} type="currency"
                    formatDisplay={(v) => (v != null ? formatCurrency(v as number) : '\u2014')} onSave={(v) => handleFieldSave('memesCommission', v)} />
                </FieldRow>
                <FieldRow label="Aimann's Comm">
                  <EditableField label="Aimann's Commission" value={project.aimannsCommission ?? null} type="currency"
                    formatDisplay={(v) => (v != null ? formatCurrency(v as number) : '\u2014')} onSave={(v) => handleFieldSave('aimannsCommission', v)} />
                </FieldRow>
              </div>

              <Separator />

              {/* Notes */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Notes</p>
                <EditableField label="Notes" value={project.notes} type="text"
                  formatDisplay={(v) => (v ? String(v) : 'Add notes...')} onSave={(v) => handleFieldSave('notes', v)} />
              </div>
            </div>
          </section>
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
        <section className="shell-panel rounded-[28px] p-6 md:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 mb-5">Photos</p>
          {photosFromNotes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500">No photos yet.</p>
              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-black/10 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-white">
                <Plus className="h-4 w-4" />
                Upload Photos
                <input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
                  const files = e.target.files;
                  if (!files?.length) return;
                  for (const file of Array.from(files)) {
                    await uploadPhoto(id!, file);
                  }
                  refetchNotes();
                }} />
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              {photosFromNotes.map((note) => (
                <div key={note.id}>
                  <p className="text-xs text-slate-400 mb-1">
                    {note.authorName} &middot; {formatDate(note.createdAt.split('T')[0])}
                  </p>
                  <PhotoGallery urls={note.photoUrls} altPrefix="Project photo" />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ================================================================ */}
      {/* DELETE TRANSACTION CONFIRMATION DIALOG                          */}
      {/* ================================================================ */}
      <Dialog
        open={deleteTransactionId != null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTransactionId(null);
            setDeleteTransactionType(null);
          }
        }}
      >
        <DialogContent className="max-w-[400px] rounded-[28px] border-black/5 bg-white p-0 shadow-2xl">
          <div className="border-b border-black/5 px-6 py-5">
            <DialogHeader>
              <DialogTitle>Delete Transaction?</DialogTitle>
            </DialogHeader>
          </div>
          <div className="px-6 py-6">
            <p className="text-sm text-slate-500">
              Delete this transaction? This cannot be undone.
            </p>
          </div>
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 border-t border-black/5 px-6 py-5">
            <Button
              variant="outline"
              onClick={() => { setDeleteTransactionId(null); setDeleteTransactionType(null); }}
              disabled={deletingId != null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deletingId != null}
              onClick={() => {
                if (deleteTransactionId && deleteTransactionType) {
                  handleDeleteTransaction(deleteTransactionId, deleteTransactionType);
                }
              }}
            >
              {deletingId != null ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* DELETE CONFIRMATION DIALOG                                       */}
      {/* ================================================================ */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-[400px] rounded-[28px] border-black/5 bg-white p-0 shadow-2xl">
          <div className="border-b border-black/5 px-6 py-5">
            <DialogHeader>
              <DialogTitle>Delete Project?</DialogTitle>
            </DialogHeader>
          </div>
          <div className="px-6 py-6">
            <p className="text-sm text-slate-500">
              This will soft-delete the project for <strong className="text-slate-950">{project.customer}</strong>. This
              action cannot be easily undone.
            </p>
          </div>
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 border-t border-black/5 px-6 py-5">
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiTile({
  label,
  value,
  icon,
  valueClassName,
  dark = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  valueClassName?: string;
  dark?: boolean;
}) {
  if (dark) {
    return (
      <div className="rounded-[24px] border border-black/5 bg-slate-950 px-5 py-4 text-white relative overflow-hidden">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          {label}
        </p>
        <p className={`text-xl sm:text-2xl font-bold mt-1 font-mono ${valueClassName ?? 'text-white'}`}>
          {value}
        </p>
        <div className="absolute top-4 right-4 text-white/10">{icon}</div>
      </div>
    );
  }
  return (
    <div className="rounded-[24px] border border-black/5 bg-white/70 px-5 py-4 relative overflow-hidden">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <p className={`text-xl sm:text-2xl font-bold mt-1 font-mono ${valueClassName ?? 'text-slate-950'}`}>
        {value}
      </p>
      <div className="absolute top-4 right-4 text-slate-200">{icon}</div>
    </div>
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
      <span className="text-slate-500">{label}</span>
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
      <span className={highlight ? 'font-semibold text-slate-950' : 'text-slate-500'}>{label}</span>
      <span className={`font-mono ${highlight ? 'font-semibold' : ''} ${valueClass}`}>
        {negative && positive === undefined ? `- ${value}` : value}
      </span>
    </div>
  );
}
