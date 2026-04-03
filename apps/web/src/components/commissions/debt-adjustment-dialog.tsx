import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manual Debt Adjustment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="adj-amount">Amount</Label>
            <Input
              id="adj-amount"
              type="number"
              step="0.01"
              placeholder="e.g. 250.00 (positive = add debt, negative = reduce)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Positive adds debt, negative reduces it.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adj-note">Note</Label>
            <Input
              id="adj-note"
              type="text"
              placeholder="e.g. Manual correction — CC payment made"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adj-date">Date (optional)</Label>
            <Input
              id="adj-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {validationError && (
            <p className="text-sm text-destructive">{validationError}</p>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Adjustment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
