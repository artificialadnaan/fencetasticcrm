import { EditableField } from '@/components/ui/editable-field';
import { formatCurrency } from '@/lib/formatters';
import { Info } from 'lucide-react';

const FENCE_TYPE_OPTIONS = [
  { label: 'Wood', value: 'WOOD' },
  { label: 'Metal', value: 'METAL' },
  { label: 'Chain Link', value: 'CHAIN_LINK' },
  { label: 'Vinyl', value: 'VINYL' },
  { label: 'Gate', value: 'GATE' },
  { label: 'Other', value: 'OTHER' },
];

interface ProjectInfoCardProps {
  projectId: string;
  description: string;
  fenceType: string;
  subcontractor: string | null;
  linearFeet: number | null;
  customerPaid: number;
  forecastedExpenses: number;
  notes: string | null;
  onSave: (field: string, value: string | number | null) => Promise<void>;
}

export function ProjectInfoCard({
  projectId: _projectId,
  description,
  fenceType,
  subcontractor,
  linearFeet,
  customerPaid,
  forecastedExpenses,
  notes,
  onSave,
}: ProjectInfoCardProps) {
  return (
    <section className="shell-panel rounded-[28px] p-6 md:p-8">
      <div className="flex items-center gap-2 mb-5">
        <Info className="h-4 w-4 text-slate-400" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Project Info</p>
      </div>
      <div className="space-y-3">
        <InfoRow label="Description">
          <EditableField
            label="Description"
            value={description}
            type="text"
            onSave={(v) => onSave('description', v)}
          />
        </InfoRow>
        <InfoRow label="Fence Type">
          <EditableField
            label="Fence Type"
            value={fenceType}
            type="select"
            options={FENCE_TYPE_OPTIONS}
            formatDisplay={(v) => String(v ?? '').replace(/_/g, ' ')}
            onSave={(v) => onSave('fenceType', v)}
          />
        </InfoRow>
        <InfoRow label="Subcontractor">
          <EditableField
            label="Subcontractor"
            value={subcontractor}
            type="text"
            formatDisplay={(v) => (v != null && v !== '' ? String(v) : '—')}
            onSave={(v) => onSave('subcontractor', v)}
          />
        </InfoRow>
        <InfoRow label="Linear Feet">
          <EditableField
            label="Linear Feet"
            value={linearFeet}
            type="number"
            formatDisplay={(v) => (v != null ? `${v} ft` : '—')}
            onSave={(v) => onSave('linearFeet', v)}
          />
        </InfoRow>
        <InfoRow label="Customer Paid">
          <EditableField
            label="Customer Paid"
            value={customerPaid}
            type="currency"
            formatDisplay={(v) => formatCurrency(v as number)}
            onSave={(v) => onSave('customerPaid', v)}
          />
        </InfoRow>
        <InfoRow label="Forecasted Expenses">
          <EditableField
            label="Forecasted Expenses"
            value={forecastedExpenses}
            type="currency"
            formatDisplay={(v) => formatCurrency(v as number)}
            onSave={(v) => onSave('forecastedExpenses', v)}
          />
        </InfoRow>
        <InfoRow label="Notes">
          <EditableField
            label="Notes"
            value={notes}
            type="text"
            formatDisplay={(v) => (v != null && v !== '' ? String(v) : '—')}
            onSave={(v) => onSave('notes', v)}
          />
        </InfoRow>
      </div>
    </section>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-slate-500">{label}</span>
      {children}
    </div>
  );
}
