import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon } from 'lucide-react';

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground mt-1">Schedule installs, estimates, and follow-ups.</p>
      </div>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-24">
          <CalendarIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <Badge variant="secondary" className="mb-2">Phase 4</Badge>
          <p className="text-muted-foreground">react-big-calendar with color-coded events coming in a future phase.</p>
        </CardContent>
      </Card>
    </div>
  );
}
