import { ADNAAN_COMMISSION_RATE, MEME_COMMISSION_RATE, AIMANN_DEDUCTION_RATE } from '@fencetastic/shared';
import { useRateTemplatesCrud } from '@/hooks/use-rate-templates-crud';
import { useOperatingExpenses } from '@/hooks/use-operating-expenses';
import { RateTemplatesSection } from '@/components/settings/rate-templates-section';
import { OperatingExpensesSection } from '@/components/settings/operating-expenses-section';
import { ChangePasswordForm } from '@/components/settings/change-password-form';
import { usePageShell } from '@/components/layout/page-shell';

export default function SettingsPage() {
  const {
    templates,
    isLoading: templatesLoading,
    error: templatesError,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  } = useRateTemplatesCrud();

  const {
    expenses,
    isLoading: expensesLoading,
    error: expensesError,
    createExpense,
    updateExpense,
    deleteExpense,
  } = useOperatingExpenses();

  usePageShell({
    eyebrow: 'Configuration',
    title: 'Settings',
    subtitle: 'Rate templates, operating expenses, commission rates, and account settings.',
  });

  return (
    <div className="space-y-8">
      {(templatesError || expensesError) && (
        <div className="rounded-[24px] border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
          Failed to load settings data. Please refresh.
        </div>
      )}

      <RateTemplatesSection
        templates={templates}
        isLoading={templatesLoading}
        onCreate={createTemplate}
        onUpdate={updateTemplate}
        onDelete={deleteTemplate}
      />

      <OperatingExpensesSection
        expenses={expenses}
        isLoading={expensesLoading}
        onCreate={createExpense}
        onUpdate={updateExpense}
        onDelete={deleteExpense}
      />

      <section className="shell-panel rounded-[28px] p-6 md:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          Rate Configuration
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
          Commission Rates
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Rates are defined in code. Contact your developer to adjust them.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-black/5 bg-white/70 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Adnaan</p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-950">{(ADNAAN_COMMISSION_RATE * 100).toFixed(0)}%</p>
            <p className="mt-2 text-sm text-slate-600">of project total</p>
          </div>
          <div className="rounded-[24px] border border-black/5 bg-white/70 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Meme</p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-950">{(MEME_COMMISSION_RATE * 100).toFixed(0)}%</p>
            <p className="mt-2 text-sm text-slate-600">of project total</p>
          </div>
          <div className="rounded-[24px] border border-black/5 bg-slate-950 px-5 py-4 text-white">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">Aimann Deduction</p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.05em]">{(AIMANN_DEDUCTION_RATE * 100).toFixed(0)}%</p>
            <p className="mt-2 text-sm text-white/70">of gross profit (when debt &gt; 0)</p>
          </div>
        </div>
      </section>

      <ChangePasswordForm />
    </div>
  );
}
