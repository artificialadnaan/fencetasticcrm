import { useState } from 'react';
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
import { FenceType } from '@fencetastic/shared';
import type { RateTemplate, CreateRateTemplateDTO, UpdateRateTemplateDTO } from '@fencetastic/shared';
import { formatCurrency } from '@/lib/formatters';

interface RateTemplatesSectionProps {
  templates: RateTemplate[];
  isLoading: boolean;
  onCreate: (dto: CreateRateTemplateDTO) => Promise<void>;
  onUpdate: (id: string, dto: UpdateRateTemplateDTO) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const FENCE_TYPE_LABELS: Record<FenceType, string> = {
  [FenceType.WOOD]: 'Wood',
  [FenceType.METAL]: 'Metal',
  [FenceType.CHAIN_LINK]: 'Chain Link',
  [FenceType.VINYL]: 'Vinyl',
  [FenceType.GATE]: 'Gate',
  [FenceType.OTHER]: 'Other',
};

interface TemplateForm {
  fenceType: FenceType | '';
  name: string;
  ratePerFoot: string;
  laborRatePerFoot: string;
  description: string;
}

const emptyForm: TemplateForm = {
  fenceType: '',
  name: '',
  ratePerFoot: '',
  laborRatePerFoot: '',
  description: '',
};

export function RateTemplatesSection({
  templates,
  isLoading,
  onCreate,
  onUpdate,
  onDelete,
}: RateTemplatesSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RateTemplate | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function openAdd() {
    setEditingTemplate(null);
    setForm(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(t: RateTemplate) {
    setEditingTemplate(t);
    setForm({
      fenceType: t.fenceType,
      name: t.name,
      ratePerFoot: String(t.ratePerFoot),
      laborRatePerFoot: String(t.laborRatePerFoot),
      description: t.description ?? '',
    });
    setFormError(null);
    setDialogOpen(true);
  }

  const isFormValid =
    form.fenceType !== '' &&
    form.name.trim() !== '' &&
    form.ratePerFoot !== '' &&
    form.laborRatePerFoot !== '';

  async function handleSave() {
    if (!isFormValid) return;
    setSaving(true);
    setFormError(null);
    try {
      const dto = {
        fenceType: form.fenceType as FenceType,
        name: form.name.trim(),
        ratePerFoot: parseFloat(form.ratePerFoot),
        laborRatePerFoot: parseFloat(form.laborRatePerFoot),
        description: form.description.trim() || null,
      };
      if (editingTemplate) {
        await onUpdate(editingTemplate.id, dto);
      } else {
        await onCreate(dto);
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save template');
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
      <section className="shell-panel rounded-[28px] p-6 md:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Configuration</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950">Rate Templates</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Define per-foot material and labor rates used in estimate calculations.
            </p>
          </div>
          <Button
            size="sm"
            onClick={openAdd}
            className="rounded-2xl bg-slate-950 px-5 text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Template
          </Button>
        </div>

        <div className="mt-6">
          {isLoading ? (
            <p className="text-sm text-slate-500 text-center py-6">Loading…</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">
              No rate templates yet. Add one to enable rate-based estimates.
            </p>
          ) : (
            <div className="rounded-[28px] border border-black/5 bg-white/55 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/5 text-slate-500">
                      <th className="text-left py-3 px-4 font-medium">Type</th>
                      <th className="text-left py-3 px-4 font-medium">Name</th>
                      <th className="text-right py-3 px-4 font-medium">Materials/ft</th>
                      <th className="text-right py-3 px-4 font-medium">Labor/ft</th>
                      <th className="text-left py-3 px-4 font-medium">Description</th>
                      <th className="py-3 px-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((t) => (
                      <tr key={t.id} className="border-b border-black/5 hover:bg-white/70 transition-colors">
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {FENCE_TYPE_LABELS[t.fenceType]}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-950">{t.name}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">{formatCurrency(t.ratePerFoot)}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">{formatCurrency(t.laborRatePerFoot)}</td>
                        <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate">
                          {t.description ?? '—'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEdit(t)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirmId(t.id)}
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
            </div>
          )}
        </div>
      </section>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[28px] border-black/5 bg-white p-0 shadow-2xl">
          <DialogHeader>
            <div className="border-b border-black/5 px-6 py-5">
              <DialogTitle className="text-lg font-semibold tracking-[-0.03em] text-slate-950">
                {editingTemplate ? 'Edit Rate Template' : 'Add Rate Template'}
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="px-6 py-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rt-fenceType">Fence Type</Label>
              <Select
                value={form.fenceType}
                onValueChange={(v) => setForm((f) => ({ ...f, fenceType: v as FenceType }))}
              >
                <SelectTrigger id="rt-fenceType" className="rounded-2xl border-black/10 bg-white shadow-sm">
                  <SelectValue placeholder="Select fence type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(FenceType).map((ft) => (
                    <SelectItem key={ft} value={ft}>
                      {FENCE_TYPE_LABELS[ft]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rt-name">Template Name</Label>
              <Input
                id="rt-name"
                placeholder="e.g. 6ft Cedar Privacy"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="rounded-2xl border-black/10 bg-white shadow-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rt-ratePerFoot">Materials $/ft</Label>
                <Input
                  id="rt-ratePerFoot"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.ratePerFoot}
                  onChange={(e) => setForm((f) => ({ ...f, ratePerFoot: e.target.value }))}
                  className="rounded-2xl border-black/10 bg-white shadow-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rt-laborRate">Labor $/ft</Label>
                <Input
                  id="rt-laborRate"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.laborRatePerFoot}
                  onChange={(e) => setForm((f) => ({ ...f, laborRatePerFoot: e.target.value }))}
                  className="rounded-2xl border-black/10 bg-white shadow-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rt-description">Description (optional)</Label>
              <Input
                id="rt-description"
                placeholder="e.g. Standard cedar 6ft privacy fence"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="rounded-2xl border-black/10 bg-white shadow-sm"
              />
            </div>
            {formError != null && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>
          <DialogFooter>
            <div className="flex items-center justify-end gap-3 border-t border-black/5 px-6 py-5">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
                className="rounded-2xl border-black/10 bg-white/70"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !isFormValid}
                className="rounded-2xl bg-slate-950 px-5 text-white hover:bg-slate-800"
              >
                {saving ? 'Saving…' : editingTemplate ? 'Save Changes' : 'Add Template'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirmId != null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-2xl rounded-[28px] border-black/5 bg-white p-0 shadow-2xl">
          <DialogHeader>
            <div className="border-b border-black/5 px-6 py-5">
              <DialogTitle className="text-lg font-semibold tracking-[-0.03em] text-slate-950">
                Deactivate Rate Template?
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="px-6 py-6">
            <p className="text-sm text-slate-600">
              The template will be hidden from new estimates. Existing projects using it are unaffected.
            </p>
          </div>
          <DialogFooter>
            <div className="flex items-center justify-end gap-3 border-t border-black/5 px-6 py-5">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmId(null)}
                disabled={saving}
                className="rounded-2xl border-black/10 bg-white/70"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                disabled={saving}
                className="rounded-2xl px-5"
              >
                {saving ? 'Deactivating…' : 'Deactivate'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
