import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EditableField } from '@/components/ui/editable-field';
import { formatDate } from '@/lib/formatters';
import { CalendarDays } from 'lucide-react';

interface ProjectScheduleCardProps {
  projectId: string;
  contractDate: string;
  installDate: string;
  estimateDate: string | null;
  followUpDate: string | null;
  completedDate: string | null;
  onSave: (field: string, value: string | number | null) => Promise<void>;
}

export function ProjectScheduleCard({
  projectId: _projectId,
  contractDate,
  installDate,
  estimateDate,
  followUpDate,
  completedDate,
  onSave,
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
        <DateRow
          label="Contract Date"
          value={contractDate}
          onSave={(v) => onSave('contractDate', v)}
        />
        <DateRow
          label="Install Date"
          value={installDate}
          onSave={(v) => onSave('installDate', v)}
        />
        <DateRow
          label="Estimate Date"
          value={estimateDate}
          onSave={(v) => onSave('estimateDate', v)}
        />
        <DateRow
          label="Follow-Up Date"
          value={followUpDate}
          onSave={(v) => onSave('followUpDate', v)}
        />
        <DateRow
          label="Completed Date"
          value={completedDate}
          onSave={(v) => onSave('completedDate', v)}
        />
      </CardContent>
    </Card>
  );
}

function DateRow({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string | null;
  onSave: (v: string | number | null) => Promise<void>;
}) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <EditableField
        label={label}
        value={value}
        type="date"
        formatDisplay={(v) => formatDate(v as string | null)}
        onSave={onSave}
      />
    </div>
  );
}
