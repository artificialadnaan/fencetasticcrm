import { formatCurrency } from '@/lib/formatters';
import { useCommissionReport } from '@/hooks/use-financial-reports';
import { DataSurface } from '@/components/ui/data-surface';
import {
  DarkTable,
  DarkTableCell,
  DarkTableContainer,
  DarkTableHeader,
  DarkTableRow,
} from '@/components/ui/dark-table';
import type { CommissionSummaryPerson } from '@fencetastic/shared';

interface CommissionReportProps {
  dateFrom: string;
  dateTo: string;
}

function PersonTable({
  person,
  showAimann,
}: {
  person: CommissionSummaryPerson;
  showAimann: boolean;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#f7f8fb]">
        {person.name}
      </h4>
      <DarkTableContainer>
        <DarkTable>
          <thead>
            <tr>
              <DarkTableHeader sticky>Project</DarkTableHeader>
              <DarkTableHeader sticky className="text-right">Project Total</DarkTableHeader>
              <DarkTableHeader sticky className="text-right">Commission</DarkTableHeader>
            </tr>
          </thead>
          <tbody>
            {person.rows.length === 0 && (
              <DarkTableRow>
                <DarkTableCell colSpan={3} className="py-6 text-center text-xs text-[#8f9aae]">
                  No entries
                </DarkTableCell>
              </DarkTableRow>
            )}
            {person.rows.map((row) => (
              <DarkTableRow key={row.projectId}>
                <DarkTableCell className="font-medium">{row.customer}</DarkTableCell>
                <DarkTableCell numeric>{formatCurrency(row.projectTotal)}</DarkTableCell>
                <DarkTableCell numeric className="font-semibold text-emerald-400">
                  {formatCurrency(row.commission)}
                </DarkTableCell>
              </DarkTableRow>
            ))}
          </tbody>
          <tfoot>
            <DarkTableRow className="bg-white/[0.03] font-semibold">
              <DarkTableCell>Period Total</DarkTableCell>
              <DarkTableCell />
              <DarkTableCell numeric className="text-emerald-400">
                {formatCurrency(person.periodTotal)}
              </DarkTableCell>
            </DarkTableRow>
            {showAimann && person.aimannDeductions > 0 && (
              <DarkTableRow className="text-sm">
                <DarkTableCell className="text-[#9aa6bb]">Aimann Deductions</DarkTableCell>
                <DarkTableCell />
                <DarkTableCell numeric className="text-rose-400">
                  -{formatCurrency(person.aimannDeductions)}
                </DarkTableCell>
              </DarkTableRow>
            )}
            <DarkTableRow className="bg-white/[0.05] font-bold">
              <DarkTableCell>Net Payout</DarkTableCell>
              <DarkTableCell />
              <DarkTableCell numeric className="text-emerald-400">
                {formatCurrency(person.netPayout)}
              </DarkTableCell>
            </DarkTableRow>
          </tfoot>
        </DarkTable>
      </DarkTableContainer>
    </div>
  );
}

export function CommissionReport({ dateFrom, dateTo }: CommissionReportProps) {
  const { data, isLoading, error } = useCommissionReport({ dateFrom, dateTo });

  if (isLoading) {
    return (
      <DataSurface title="Commission Report" eyebrow="Reports">
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-white/5" />
          ))}
        </div>
      </DataSurface>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
        Failed to load commission report: {error}
      </div>
    );
  }

  if (!data) return null;

  const totalAdnaan = data.settled.adnaan.netPayout + data.pending.adnaan.netPayout;
  const totalMeme = data.settled.meme.netPayout + data.pending.meme.netPayout;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DataSurface eyebrow="Commissions" title="Total Adnaan Payout">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8f9aae]">
            Total Adnaan Payout
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-400">{formatCurrency(totalAdnaan)}</p>
        </DataSurface>
        <DataSurface eyebrow="Commissions" title="Total Meme Payout">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8f9aae]">
            Total Meme Payout
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-400">{formatCurrency(totalMeme)}</p>
        </DataSurface>
      </div>

      <DataSurface title="Settled" eyebrow="Commission Ledger" contentClassName="space-y-6">
        <PersonTable person={data.settled.adnaan} showAimann />
        <PersonTable person={data.settled.meme} showAimann={false} />
      </DataSurface>

      <DataSurface title="Pending" eyebrow="Commission Ledger" contentClassName="space-y-6">
        <p className="text-sm text-[#9aa6bb]">All unsettled commissions awaiting payout.</p>
        <PersonTable person={data.pending.adnaan} showAimann />
        <PersonTable person={data.pending.meme} showAimann={false} />
      </DataSurface>
    </div>
  );
}
