import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your fencing projects and financials.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {['Revenue MTD', 'Open Projects', 'Outstanding Receivables', 'Aimann Debt Balance'].map((title) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">--</div></CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Badge variant="secondary" className="mb-2">Phase 2</Badge>
            <p className="text-muted-foreground">Charts, widgets, and live data coming in the next phase.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
