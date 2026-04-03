import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { CommissionPreview } from '@fencetastic/shared';

interface ProjectFinancialsCardProps {
  projectTotal: number;
  paymentMethod: string;
  commissionPreview: CommissionPreview;
  isSnapshot: boolean;
}

export function ProjectFinancialsCard({
  projectTotal,
  paymentMethod,
  commissionPreview,
  isSnapshot,
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
        <Row label="Project Total" value={formatCurrency(projectTotal)} />
        <Row label="Payment Method" value={paymentMethod.replace('_', ' ')} />
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
