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
    <section className="shell-panel rounded-[28px] p-6 md:p-8">
      <div className="flex items-center gap-2 mb-5">
        <CalendarDays className="h-4 w-4 text-slate-400" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Schedule</p>
      </div>
      <div className="space-y-3">
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
      </div>
    </section>
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
      <span className="text-slate-500">{label}</span>
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
