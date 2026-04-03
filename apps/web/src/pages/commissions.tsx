import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign } from 'lucide-react';

export default function CommissionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Commissions</h1>
        <p className="text-muted-foreground mt-1">Track commission payouts and Aimann debt balance.</p>
      </div>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-24">
          <DollarSign className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <Badge variant="secondary" className="mb-2">Phase 5</Badge>
          <p className="text-muted-foreground">Commission summaries, debt tracker, and pipeline projections coming in a future phase.</p>
        </CardContent>
      </Card>
    </div>
  );
}
