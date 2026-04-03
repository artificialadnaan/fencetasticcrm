import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link to="/projects"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Detail</h1>
          <p className="text-muted-foreground mt-1">Project ID: {id}</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {['Financials', 'Expenses Breakdown', 'Schedule', 'Notes Timeline'].map((section) => (
          <Card key={section} className="border-dashed">
            <CardHeader><CardTitle className="text-lg">{section}</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center py-8"><Badge variant="secondary">Phase 3</Badge></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
