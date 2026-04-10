import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
import { formatCurrency, formatDate } from '@/lib/formatters';
import {
  useProjectMaterials,
  useCreateMaterials,
  useUpdateMaterial,
  useDeleteMaterial,
  useEligibleTransactions,
} from '@/hooks/use-materials';
import { MaterialCategory } from '@fencetastic/shared';
import type { MaterialLineItem, CreateMaterialLineItemDTO } from '@fencetastic/shared';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<MaterialCategory, string> = {
  [MaterialCategory.LUMBER]: 'Lumber',
  [MaterialCategory.CONCRETE]: 'Concrete',
  [MaterialCategory.HARDWARE]: 'Hardware',
  [MaterialCategory.FASTENERS]: 'Fasteners',
  [MaterialCategory.GATES]: 'Gates',
  [MaterialCategory.PANELS]: 'Panels',
  [MaterialCategory.OTHER]: 'Other',
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS) as [MaterialCategory, string][];

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MaterialForm {
  description: string;
  category: MaterialCategory | '';
  vendor: string;
  quantity: string;
  unitCost: string;
  purchaseDate: string;
  transactionId: string;
}

const emptyForm: MaterialForm = {
  description: '',
  category: '',
  vendor: '',
  quantity: '',
  unitCost: '',
  purchaseDate: localToday(),
  transactionId: '',
};

// Empty row used for bulk-add
const emptyRow = (): MaterialForm => ({ ...emptyForm });

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MaterialsTabProps {
  projectId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MaterialsTab({ projectId }: MaterialsTabProps) {
  const { data: materials, isLoading, error: materialsError, refetch } = useProjectMaterials(projectId);
  const { mutate: createMaterials, isLoading: creating } = useCreateMaterials();
  const { mutate: updateMaterial, isLoading: updating } = useUpdateMaterial();
  const { mutate: deleteMaterial, isLoading: deleting } = useDeleteMaterial();
  const { data: eligibleTransactions } = useEligibleTransactions(projectId);

  // Single add/edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MaterialLineItem | null>(null);
  const [form, setForm] = useState<MaterialForm>(emptyForm);

  // Bulk add dialog
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState<MaterialForm[]>([emptyRow()]);

  // Delete confirm
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const isSaving = creating || updating || deleting;

  // ---- single form computed total ----
  const formTotal =
    form.quantity && form.unitCost
      ? parseFloat(form.quantity) * parseFloat(form.unitCost)
      : 0;

  // ---- table running total ----
  const runningTotal = materials.reduce((sum, m) => sum + m.totalCost, 0);

  // ---------------------------------------------------------------------------
  // Single dialog handlers
  // ---------------------------------------------------------------------------

  function openAdd() {
    setEditingItem(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  }

  function openEdit(item: MaterialLineItem) {
    setEditingItem(item);
    setForm({
      description: item.description,
      category: item.category,
      vendor: item.vendor ?? '',
      quantity: String(item.quantity),
      unitCost: String(item.unitCost),
      purchaseDate: item.purchaseDate,
      transactionId: item.transactionId ?? '',
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.description.trim() || !form.category || !form.quantity || !form.unitCost) return;
    const qty = Number(form.quantity);
    const cost = Number(form.unitCost);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Quantity must be a positive number');
      return;
    }
    if (isNaN(cost) || cost < 0) {
      toast.error('Unit cost must be a valid number');
      return;
    }
    if (!form.purchaseDate) {
      toast.error('Purchase date is required');
      return;
    }
    try {
      if (editingItem) {
        await updateMaterial(editingItem.id, {
          description: form.description.trim(),
          category: form.category as MaterialCategory,
          vendor: form.vendor || null,
          quantity: parseFloat(form.quantity),
          unitCost: parseFloat(form.unitCost),
          purchaseDate: form.purchaseDate,
          transactionId: form.transactionId || null,
        });
      } else {
        const dto: CreateMaterialLineItemDTO = {
          description: form.description.trim(),
          category: form.category as MaterialCategory,
          vendor: form.vendor || null,
          quantity: parseFloat(form.quantity),
          unitCost: parseFloat(form.unitCost),
          purchaseDate: form.purchaseDate,
          transactionId: form.transactionId || null,
        };
        await createMaterials(projectId, [dto]);
      }
      refetch();
      setDialogOpen(false);
    } catch {
      // toast already shown by hook
    }
  }

  // ---------------------------------------------------------------------------
  // Bulk add handlers
  // ---------------------------------------------------------------------------

  function openBulk() {
    setBulkRows([emptyRow()]);
    setBulkOpen(true);
  }

  function addBulkRow() {
    setBulkRows((rows) => [...rows, emptyRow()]);
  }

  function removeBulkRow(idx: number) {
    setBulkRows((rows) => rows.filter((_, i) => i !== idx));
  }

  function updateBulkRow(idx: number, patch: Partial<MaterialForm>) {
    setBulkRows((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  async function handleBulkSave() {
    const validRows = bulkRows.filter(
      (r) => r.description.trim() && r.category && r.quantity && r.unitCost
    );
    if (validRows.length === 0) return;
    const errors: string[] = [];
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const qty = Number(row.quantity);
      const cost = Number(row.unitCost);
      if (isNaN(qty) || qty <= 0) errors.push(`Row ${i + 1}: Quantity must be a positive number`);
      if (isNaN(cost) || cost < 0) errors.push(`Row ${i + 1}: Unit cost must be a valid number`);
      if (!row.purchaseDate) errors.push(`Row ${i + 1}: Purchase date is required`);
    }
    if (errors.length > 0) {
      toast.error(errors.join('. '));
      return;
    }
    const items: CreateMaterialLineItemDTO[] = validRows.map((r) => ({
      description: r.description.trim(),
      category: r.category as MaterialCategory,
      vendor: r.vendor || null,
      quantity: parseFloat(r.quantity),
      unitCost: parseFloat(r.unitCost),
      purchaseDate: r.purchaseDate,
    }));
    try {
      await createMaterials(projectId, items);
      refetch();
      setBulkOpen(false);
    } catch {
      // toast already shown by hook
    }
  }

  // ---------------------------------------------------------------------------
  // Delete handler
  // ---------------------------------------------------------------------------

  async function handleDelete(id: string) {
    try {
      await deleteMaterial(id);
      refetch();
    } finally {
      setDeleteConfirmId(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <section className="shell-panel rounded-[28px] p-6 md:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Materials
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
              Material Line Items
            </h2>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-2xl px-4"
              onClick={openBulk}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Multiple
            </Button>
            <Button
              size="sm"
              className="rounded-2xl bg-slate-950 px-5 text-white hover:bg-slate-800"
              onClick={openAdd}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Material
            </Button>
          </div>
        </div>

        <div className="mt-6">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-xl" />
              ))}
            </div>
          ) : materialsError ? (
            <div className="rounded-[16px] border border-destructive/30 bg-destructive/10 px-4 py-4 text-sm text-destructive">
              Unable to load materials: {materialsError}
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500">No materials logged yet.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openAdd}
                className="mt-2 rounded-2xl"
              >
                Add Material
              </Button>
            </div>
          ) : (
            <div className="rounded-[28px] border border-black/5 bg-white/55 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/5 text-slate-500">
                      <th className="text-left py-2 px-4 font-medium">Description</th>
                      <th className="text-left py-2 px-4 font-medium">Category</th>
                      <th className="text-left py-2 px-4 font-medium">Vendor</th>
                      <th className="text-right py-2 px-4 font-medium">Qty</th>
                      <th className="text-right py-2 px-4 font-medium">Unit Cost</th>
                      <th className="text-right py-2 px-4 font-medium">Total</th>
                      <th className="text-left py-2 px-4 font-medium">Purchase Date</th>
                      <th className="py-2 px-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-black/5 hover:bg-slate-100/50 transition-colors"
                      >
                        <td className="py-2 px-4 font-medium">{item.description}</td>
                        <td className="py-2 px-4 text-slate-600">
                          {CATEGORY_LABELS[item.category] ?? item.category}
                        </td>
                        <td className="py-2 px-4 text-slate-500">{item.vendor ?? '—'}</td>
                        <td className="py-2 px-4 text-right font-mono">{item.quantity}</td>
                        <td className="py-2 px-4 text-right font-mono">
                          {formatCurrency(item.unitCost)}
                        </td>
                        <td className="py-2 px-4 text-right font-mono font-semibold">
                          {formatCurrency(item.totalCost)}
                        </td>
                        <td className="py-2 px-4 text-slate-500">
                          {formatDate(item.purchaseDate)}
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              aria-label="Edit material"
                              onClick={() => openEdit(item)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              aria-label="Delete material"
                              onClick={() => setDeleteConfirmId(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-black/5 font-semibold">
                      <td className="pt-3 pb-3 px-4" colSpan={5}>
                        Total
                      </td>
                      <td className="pt-3 pb-3 px-4 text-right font-mono">
                        {formatCurrency(runningTotal)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Material' : 'Add Material'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="mat-description">Description</Label>
              <Input
                id="mat-description"
                placeholder="e.g. 6ft cedar pickets"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mat-category">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v as MaterialCategory }))}
                >
                  <SelectTrigger id="mat-category">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mat-vendor">Vendor</Label>
                <Input
                  id="mat-vendor"
                  placeholder="Optional"
                  value={form.vendor}
                  onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mat-qty">Quantity</Label>
                <Input
                  id="mat-qty"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mat-unitcost">Unit Cost ($)</Label>
                <Input
                  id="mat-unitcost"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.unitCost}
                  onChange={(e) => setForm((f) => ({ ...f, unitCost: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mat-date">Purchase Date</Label>
                <Input
                  id="mat-date"
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Line Total</Label>
                <div className="h-9 flex items-center px-3 rounded-md border border-input bg-muted text-sm font-mono">
                  {formatCurrency(isNaN(formTotal) ? 0 : formTotal)}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mat-transaction">Link to Transaction (optional)</Label>
              <select
                id="mat-transaction"
                value={form.transactionId}
                onChange={(e) => setForm((f) => ({ ...f, transactionId: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">None</option>
                {eligibleTransactions.map((txn) => (
                  <option key={txn.id} value={txn.id}>
                    {txn.description} — ${txn.amount.toFixed(2)} ({txn.date})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                isSaving ||
                !form.description.trim() ||
                !form.category ||
                !form.quantity ||
                !form.unitCost
              }
            >
              {isSaving ? 'Saving…' : editingItem ? 'Save Changes' : 'Add Material'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>Add Multiple Materials</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            {bulkRows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_80px_90px_90px_auto] gap-2 items-end">
                <div className="space-y-1">
                  {idx === 0 && <Label className="text-xs">Description</Label>}
                  <Input
                    placeholder="Description"
                    value={row.description}
                    onChange={(e) => updateBulkRow(idx, { description: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  {idx === 0 && <Label className="text-xs">Category</Label>}
                  <Select
                    value={row.category}
                    onValueChange={(v) => updateBulkRow(idx, { category: v as MaterialCategory })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  {idx === 0 && <Label className="text-xs">Vendor</Label>}
                  <Input
                    placeholder="Vendor"
                    value={row.vendor}
                    onChange={(e) => updateBulkRow(idx, { vendor: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  {idx === 0 && <Label className="text-xs">Qty</Label>}
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={row.quantity}
                    onChange={(e) => updateBulkRow(idx, { quantity: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  {idx === 0 && <Label className="text-xs">Unit Cost</Label>}
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={row.unitCost}
                    onChange={(e) => updateBulkRow(idx, { unitCost: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  {idx === 0 && <Label className="text-xs">Date</Label>}
                  <Input
                    type="date"
                    value={row.purchaseDate}
                    onChange={(e) => updateBulkRow(idx, { purchaseDate: e.target.value })}
                  />
                </div>
                <div className={idx === 0 ? 'pt-5' : ''}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive hover:text-destructive"
                    onClick={() => removeBulkRow(idx)}
                    disabled={bulkRows.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-2xl"
              onClick={addBulkRow}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Row
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleBulkSave} disabled={creating}>
              {creating ? 'Saving…' : `Add ${bulkRows.filter((r) => r.description.trim() && r.category && r.quantity && r.unitCost).length} Material(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirmId != null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Delete Material?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 py-2">This cannot be undone.</p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
