import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/formatters';
import { CalendarDays } from 'lucide-react';

interface ProjectScheduleCardProps {
  contractDate: string;
  installDate: string;
  estimateDate: string | null;
  followUpDate: string | null;
  completedDate: string | null;
}

export function ProjectScheduleCard({
  contractDate,
  installDate,
  estimateDate,
  followUpDate,
  completedDate,
}: ProjectScheduleCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <DateRow label="Contract Date" value={contractDate} />
        <DateRow label="Install Date" value={installDate} />
        <DateRow label="Estimate Date" value={estimateDate} />
        <DateRow label="Follow-Up Date" value={followUpDate} />
        <DateRow label="Completed Date" value={completedDate} />
      </CardContent>
    </Card>
  );
}

function DateRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{formatDate(value)}</span>
    </div>
  );
}
