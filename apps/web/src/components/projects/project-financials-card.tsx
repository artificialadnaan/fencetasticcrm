import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { EditableField } from '@/components/ui/editable-field';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { CommissionPreview } from '@fencetastic/shared';

const PAYMENT_METHOD_OPTIONS = [
  { label: 'Cash', value: 'CASH' },
  { label: 'Check', value: 'CHECK' },
  { label: 'Credit Card', value: 'CREDIT_CARD' },
  { label: 'Zelle', value: 'ZELLE' },
  { label: 'Financing', value: 'FINANCING' },
];

interface ProjectFinancialsCardProps {
  projectId: string;
  projectTotal: number;
  paymentMethod: string;
  customerPaid: number;
  forecastedExpenses: number;
  materialsCost: number;
  commissionPreview: CommissionPreview;
  isSnapshot: boolean;
  onSave: (field: string, value: string | number | null) => Promise<void>;
}

export function ProjectFinancialsCard({
  projectId: _projectId,
  projectTotal,
  paymentMethod,
  customerPaid,
  forecastedExpenses,
  materialsCost,
  commissionPreview,
  isSnapshot,
  onSave,
}: ProjectFinancialsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Financials
          {isSnapshot && (
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
              Snapshot (locked)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <EditableRow label="Project Total">
          <EditableField
            label="Project Total"
            value={projectTotal}
            type="currency"
            formatDisplay={(v) => formatCurrency(v as number)}
            onSave={(v) => onSave('projectTotal', v)}
          />
        </EditableRow>
        <EditableRow label="Payment Method">
          <EditableField
            label="Payment Method"
            value={paymentMethod}
            type="select"
            options={PAYMENT_METHOD_OPTIONS}
            formatDisplay={(v) => String(v ?? '').replace(/_/g, ' ')}
            onSave={(v) => onSave('paymentMethod', v)}
          />
        </EditableRow>
        <EditableRow label="Customer Paid">
          <EditableField
            label="Customer Paid"
            value={customerPaid}
            type="currency"
            formatDisplay={(v) => formatCurrency(v as number)}
            onSave={(v) => onSave('customerPaid', v)}
          />
        </EditableRow>
        <EditableRow label="Materials Cost">
          <EditableField
            label="Materials Cost"
            value={materialsCost}
            type="currency"
            formatDisplay={(v) => formatCurrency(v as number)}
            onSave={(v) => onSave('materialsCost', v)}
          />
        </EditableRow>
        <EditableRow label="Forecasted Expenses">
          <EditableField
            label="Forecasted Expenses"
            value={forecastedExpenses}
            type="currency"
            formatDisplay={(v) => formatCurrency(v as number)}
            onSave={(v) => onSave('forecastedExpenses', v)}
          />
        </EditableRow>
        <Separator />
        <Row label="Money Received" value={formatCurrency(commissionPreview.moneyReceived)} />
        <Separator />
        <Row label="Total Expenses" value={formatCurrency(commissionPreview.totalExpenses)} negative />
        <Row label="Adnaan Commission (10%)" value={formatCurrency(commissionPreview.adnaanCommission)} negative />
        <Separator />
        <Row label="Gross Profit" value={formatCurrency(commissionPreview.grossProfit)} highlight />
        <Row label="Aimann Deduction (25%)" value={formatCurrency(commissionPreview.aimannDeduction)} negative />
        <Row label="Meme Commission (5%)" value={formatCurrency(commissionPreview.memeCommission)} negative />
        <Separator />
        <Row label="Net Profit" value={formatCurrency(commissionPreview.netProfit)} highlight />
        <Row label="Profit %" value={formatPercent(commissionPreview.profitPercent)} highlight />
      </CardContent>
    </Card>
  );
}

function EditableRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  negative = false,
  highlight = false,
}: {
  label: string;
  value: string;
  negative?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className={highlight ? 'font-semibold' : 'text-muted-foreground'}>
        {label}
      </span>
      <span
        className={`font-mono ${
          highlight ? 'font-semibold' : ''
        } ${negative ? 'text-red-500' : ''}`}
      >
        {negative ? `- ${value}` : value}
      </span>
    </div>
  );
}
