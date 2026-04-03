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
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { SubcontractorPayment } from '@fencetastic/shared';

interface SubcontractorTableProps {
  projectId: string;
  subs: SubcontractorPayment[];
  onAdd: (dto: {
    subcontractorName: string;
    amountOwed: number;
    amountPaid?: number;
    datePaid?: string | null;
    notes?: string | null;
  }) => Promise<void>;
  onUpdate: (
    id: string,
    dto: {
      subcontractorName?: string;
      amountOwed?: number;
      amountPaid?: number;
      datePaid?: string | null;
      notes?: string | null;
    }
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

interface SubForm {
  subcontractorName: string;
  amountOwed: string;
  amountPaid: string;
  datePaid: string;
  notes: string;
}

const emptyForm: SubForm = {
  subcontractorName: '',
  amountOwed: '',
  amountPaid: '',
  datePaid: '',
  notes: '',
};

export function SubcontractorTable({
  subs,
  onAdd,
  onUpdate,
  onDelete,
}: SubcontractorTableProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<SubcontractorPayment | null>(null);
  const [form, setForm] = useState<SubForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const totalOwed = subs.reduce((sum, s) => sum + s.amountOwed, 0);
  const totalPaid = subs.reduce((sum, s) => sum + s.amountPaid, 0);
  const outstanding = totalOwed - totalPaid;

  function openAdd() {
    setEditingSub(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(sub: SubcontractorPayment) {
    setEditingSub(sub);
    setForm({
      subcontractorName: sub.subcontractorName,
      amountOwed: String(sub.amountOwed),
      amountPaid: String(sub.amountPaid),
      datePaid: sub.datePaid ?? '',
      notes: sub.notes ?? '',
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.subcontractorName.trim() || !form.amountOwed) return;
    setSaving(true);
    try {
      const dto = {
        subcontractorName: form.subcontractorName.trim(),
        amountOwed: parseFloat(form.amountOwed),
        amountPaid: form.amountPaid ? parseFloat(form.amountPaid) : 0,
        datePaid: form.datePaid || null,
        notes: form.notes || null,
      };
      if (editingSub) {
        await onUpdate(editingSub.id, dto);
      } else {
        await onAdd(dto);
      }
      setDialogOpen(false);
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
          <CardTitle className="text-lg">Subcontractor Payments</CardTitle>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Add Sub
          </Button>
        </CardHeader>
        <CardContent>
          {subs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No subcontractor payments yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4 font-medium">Name</th>
                    <th className="text-right py-2 pr-4 font-medium">Owed</th>
                    <th className="text-right py-2 pr-4 font-medium">Paid</th>
                    <th className="text-right py-2 pr-4 font-medium">Balance</th>
                    <th className="text-left py-2 pr-4 font-medium">Date Paid</th>
                    <th className="text-left py-2 font-medium">Notes</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {subs.map((sub) => (
                    <tr key={sub.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-2 pr-4 font-medium">{sub.subcontractorName}</td>
                      <td className="py-2 pr-4 text-right font-mono">
                        {formatCurrency(sub.amountOwed)}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono text-green-600">
                        {formatCurrency(sub.amountPaid)}
                      </td>
                      <td
                        className={`py-2 pr-4 text-right font-mono ${
                          sub.amountOwed - sub.amountPaid > 0
                            ? 'text-red-500'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {formatCurrency(sub.amountOwed - sub.amountPaid)}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {formatDate(sub.datePaid)}
                      </td>
                      <td className="py-2 text-muted-foreground max-w-[160px] truncate">
                        {sub.notes ?? '—'}
                      </td>
                      <td className="py-2 pl-2">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(sub)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmId(sub.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold">
                    <td className="pt-3 pr-4">Totals</td>
                    <td className="pt-3 pr-4 text-right font-mono">
                      {formatCurrency(totalOwed)}
                    </td>
                    <td className="pt-3 pr-4 text-right font-mono text-green-600">
                      {formatCurrency(totalPaid)}
                    </td>
                    <td
                      className={`pt-3 pr-4 text-right font-mono ${
                        outstanding > 0 ? 'text-red-500' : 'text-muted-foreground'
                      }`}
                    >
                      {formatCurrency(outstanding)}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{editingSub ? 'Edit Sub Payment' : 'Add Sub Payment'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="subName">Name</Label>
              <Input
                id="subName"
                placeholder="e.g. Pepino"
                value={form.subcontractorName}
                onChange={(e) => setForm((f) => ({ ...f, subcontractorName: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="amountOwed">Amount Owed ($)</Label>
                <Input
                  id="amountOwed"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amountOwed}
                  onChange={(e) => setForm((f) => ({ ...f, amountOwed: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amountPaid">Amount Paid ($)</Label>
                <Input
                  id="amountPaid"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amountPaid}
                  onChange={(e) => setForm((f) => ({ ...f, amountPaid: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="datePaid">Date Paid</Label>
              <Input
                id="datePaid"
                type="date"
                value={form.datePaid}
                onChange={(e) => setForm((f) => ({ ...f, datePaid: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subNotes">Notes</Label>
              <Input
                id="subNotes"
                placeholder="Optional notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.subcontractorName.trim() || !form.amountOwed}>
              {saving ? 'Saving…' : editingSub ? 'Save Changes' : 'Add Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirmId != null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Delete Sub Payment?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This cannot be undone. The commission waterfall will recalculate.
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
              {saving ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
