import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DebtAdjustmentDTO } from '@fencetastic/shared';

interface DebtAdjustmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (dto: DebtAdjustmentDTO) => Promise<void>;
  isSubmitting: boolean;
}

export function DebtAdjustmentDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: DebtAdjustmentDialogProps) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleClose() {
    setAmount('');
    setNote('');
    setDate('');
    setValidationError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed === 0) {
      setValidationError('Enter a non-zero amount. Use positive to add debt, negative to remove it.');
      return;
    }
    if (!note.trim()) {
      setValidationError('Note is required.');
      return;
    }

    await onSubmit({
      amount: parsed,
      note: note.trim(),
      date: date || undefined,
    });

    handleClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-2xl rounded-[28px] border-black/5 bg-white p-0 shadow-2xl">
        <div className="border-b border-black/5 px-6 py-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-[-0.03em] text-slate-950">
              Manual Debt Adjustment
            </DialogTitle>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="adj-amount" className="text-sm font-medium text-slate-700">
                Amount
              </Label>
              <Input
                id="adj-amount"
                type="number"
                step="0.01"
                placeholder="e.g. 250.00 (positive = add debt, negative = reduce)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isSubmitting}
                autoFocus
                className="rounded-2xl"
              />
              <p className="text-xs text-slate-500">
                Positive adds debt, negative reduces it.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adj-note" className="text-sm font-medium text-slate-700">
                Note
              </Label>
              <Input
                id="adj-note"
                type="text"
                placeholder="e.g. Manual correction — CC payment made"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={isSubmitting}
                className="rounded-2xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adj-date" className="text-sm font-medium text-slate-700">
                Date (optional)
              </Label>
              <Input
                id="adj-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isSubmitting}
                className="rounded-2xl"
              />
            </div>

            {validationError && (
              <p className="text-sm text-red-600">{validationError}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-black/5 px-6 py-5">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-2xl bg-slate-950 px-5 text-white hover:bg-slate-800"
            >
              {isSubmitting ? 'Saving...' : 'Save Adjustment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
