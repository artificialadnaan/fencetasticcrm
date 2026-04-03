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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">Rate Templates</CardTitle>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Add Template
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No rate templates yet. Add one to enable rate-based estimates.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4 font-medium">Type</th>
                    <th className="text-left py-2 pr-4 font-medium">Name</th>
                    <th className="text-right py-2 pr-4 font-medium">Materials/ft</th>
                    <th className="text-right py-2 pr-4 font-medium">Labor/ft</th>
                    <th className="text-left py-2 pr-4 font-medium">Description</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => (
                    <tr key={t.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-2 pr-4">
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                          {FENCE_TYPE_LABELS[t.fenceType]}
                        </span>
                      </td>
                      <td className="py-2 pr-4 font-medium">{t.name}</td>
                      <td className="py-2 pr-4 text-right font-mono">{formatCurrency(t.ratePerFoot)}</td>
                      <td className="py-2 pr-4 text-right font-mono">{formatCurrency(t.laborRatePerFoot)}</td>
                      <td className="py-2 pr-4 text-muted-foreground max-w-[200px] truncate">
                        {t.description ?? '—'}
                      </td>
                      <td className="py-2 pl-2">
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
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Rate Template' : 'Add Rate Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="rt-fenceType">Fence Type</Label>
              <Select
                value={form.fenceType}
                onValueChange={(v) => setForm((f) => ({ ...f, fenceType: v as FenceType }))}
              >
                <SelectTrigger id="rt-fenceType">
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
              />
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
              {saving ? 'Saving…' : editingTemplate ? 'Save Changes' : 'Add Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirmId != null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Deactivate Rate Template?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            The template will be hidden from new estimates. Existing projects using it are unaffected.
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
              {saving ? 'Deactivating…' : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
