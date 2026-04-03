import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3 } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground mt-1">Monthly P&L, project stats, and receivables aging.</p>
      </div>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-24">
          <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <Badge variant="secondary" className="mb-2">Phase 6</Badge>
          <p className="text-muted-foreground">Recharts reports with date range pickers and PDF export coming in a future phase.</p>
        </CardContent>
      </Card>
    </div>
  );
}
