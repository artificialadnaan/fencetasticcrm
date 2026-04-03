import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ADNAAN_COMMISSION_RATE, MEME_COMMISSION_RATE, AIMANN_DEDUCTION_RATE } from '@fencetastic/shared';
import { useRateTemplatesCrud } from '@/hooks/use-rate-templates-crud';
import { useOperatingExpenses } from '@/hooks/use-operating-expenses';
import { RateTemplatesSection } from '@/components/settings/rate-templates-section';
import { OperatingExpensesSection } from '@/components/settings/operating-expenses-section';
import { ChangePasswordForm } from '@/components/settings/change-password-form';

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Rate templates, operating expenses, commission rates, and account settings.
        </p>
      </div>

      {/* Error states */}
      {(templatesError || expensesError) && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          Failed to load settings data. Please refresh.
        </div>
      )}

      {/* Rate Templates */}
      <RateTemplatesSection
        templates={templates}
        isLoading={templatesLoading}
        onCreate={createTemplate}
        onUpdate={updateTemplate}
        onDelete={deleteTemplate}
      />

      {/* Operating Expenses */}
      <OperatingExpensesSection
        expenses={expenses}
        isLoading={expensesLoading}
        onCreate={createExpense}
        onUpdate={updateExpense}
        onDelete={deleteExpense}
      />

      {/* Commission Rates (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Commission Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Rates are defined in code. Contact your developer to adjust them.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Adnaan</p>
              <p className="text-2xl font-bold">{(ADNAAN_COMMISSION_RATE * 100).toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">of project total</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Meme</p>
              <p className="text-2xl font-bold">{(MEME_COMMISSION_RATE * 100).toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">of project total</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Aimann Deduction</p>
              <p className="text-2xl font-bold">{(AIMANN_DEDUCTION_RATE * 100).toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">of gross profit (when debt &gt; 0)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <ChangePasswordForm />
    </div>
  );
}
