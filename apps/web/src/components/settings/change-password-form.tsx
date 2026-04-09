import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const emptyForm: ChangePasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export function ChangePasswordForm() {
  const [form, setForm] = useState<ChangePasswordForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordMismatch =
    form.confirmPassword !== '' && form.newPassword !== form.confirmPassword;

  const isValid =
    form.currentPassword !== '' &&
    form.newPassword.length >= 8 &&
    form.newPassword === form.confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await api.patch('/auth/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess(true);
      setForm(emptyForm);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err instanceof Error ? err.message : 'Failed to change password');
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="shell-panel rounded-[28px] p-6 md:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Security</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950">Change Password</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        Update your account password. You will need your current password to make changes.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 max-w-sm">
        <div className="space-y-1.5">
          <Label htmlFor="cp-current">Current Password</Label>
          <Input
            id="cp-current"
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
            className="rounded-2xl border-black/10 bg-white shadow-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cp-new">New Password</Label>
          <Input
            id="cp-new"
            type="password"
            autoComplete="new-password"
            placeholder="Minimum 8 characters"
            value={form.newPassword}
            onChange={(e) => {
              setForm((f) => ({ ...f, newPassword: e.target.value }));
              setSuccess(false);
            }}
            className="rounded-2xl border-black/10 bg-white shadow-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cp-confirm">Confirm New Password</Label>
          <Input
            id="cp-confirm"
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) => {
              setForm((f) => ({ ...f, confirmPassword: e.target.value }));
              setSuccess(false);
            }}
            className={`rounded-2xl bg-white shadow-sm ${passwordMismatch ? 'border border-destructive' : 'border-black/10'}`}
          />
          {passwordMismatch && (
            <p className="text-xs text-destructive">Passwords do not match.</p>
          )}
        </div>
        {error != null && <p className="text-sm text-destructive">{error}</p>}
        {success && (
          <p className="text-sm text-green-600 dark:text-green-400">Password updated successfully.</p>
        )}
        <Button
          type="submit"
          disabled={saving || !isValid}
          className="rounded-2xl bg-slate-950 px-5 text-white hover:bg-slate-800"
        >
          {saving ? 'Updating…' : 'Update Password'}
        </Button>
      </form>
    </section>
  );
}
