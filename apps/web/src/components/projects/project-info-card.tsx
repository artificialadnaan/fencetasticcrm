import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';
import { Info } from 'lucide-react';

interface ProjectInfoCardProps {
  description: string;
  fenceType: string;
  subcontractor: string | null;
  linearFeet: number | null;
  customerPaid: number;
  forecastedExpenses: number;
  notes: string | null;
}

export function ProjectInfoCard({
  description,
  fenceType,
  subcontractor,
  linearFeet,
  customerPaid,
  forecastedExpenses,
  notes,
}: ProjectInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Info className="h-4 w-4" />
          Project Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <InfoRow label="Description" value={description} />
        <InfoRow label="Fence Type">
          <Badge variant="secondary">{fenceType.replace('_', ' ')}</Badge>
        </InfoRow>
        <InfoRow label="Subcontractor" value={subcontractor || '—'} />
        <InfoRow label="Linear Feet" value={linearFeet ? `${linearFeet} ft` : '—'} />
        <InfoRow label="Customer Paid" value={formatCurrency(customerPaid)} />
        <InfoRow label="Forecasted Expenses" value={formatCurrency(forecastedExpenses)} />
        {notes && (
          <div className="pt-2">
            <p className="text-sm text-muted-foreground mb-1">Notes</p>
            <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-md p-3">
              {notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InfoRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children || <span className="font-medium">{value}</span>}
    </div>
  );
}
