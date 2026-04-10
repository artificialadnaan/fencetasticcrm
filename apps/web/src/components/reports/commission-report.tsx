import { formatCurrency } from '@/lib/formatters';
import { useCommissionReport } from '@/hooks/use-financial-reports';
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
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-slate-800">{person.name}</h4>
      <div className="rounded-lg border border-black/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/5 text-xs text-slate-500">
              <th className="text-left py-2 px-4">Project</th>
              <th className="text-right py-2 px-4">Project Total</th>
              <th className="text-right py-2 px-4">Commission</th>
            </tr>
          </thead>
          <tbody>
            {person.rows.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-slate-500 text-xs">
                  No entries
                </td>
              </tr>
            )}
            {person.rows.map((row) => (
              <tr
                key={row.projectId}
                className="border-b border-black/5 hover:bg-slate-50/60 transition-colors"
              >
                <td className="py-2 px-4 font-medium">{row.customer}</td>
                <td className="py-2 px-4 text-right">{formatCurrency(row.projectTotal)}</td>
                <td className="py-2 px-4 text-right text-emerald-600">
                  {formatCurrency(row.commission)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-black/5 font-semibold text-sm">
              <td className="py-2 px-4">Period Total</td>
              <td className="py-2 px-4" />
              <td className="py-2 px-4 text-right text-emerald-600">
                {formatCurrency(person.periodTotal)}
              </td>
            </tr>
            {showAimann && person.aimannDeductions > 0 && (
              <tr className="text-sm">
                <td className="py-1 px-4 text-slate-600">Aimann Deductions</td>
                <td className="py-1 px-4" />
                <td className="py-1 px-4 text-right text-red-500">
                  -{formatCurrency(person.aimannDeductions)}
                </td>
              </tr>
            )}
            <tr className="font-bold text-sm bg-slate-50/60">
              <td className="py-2 px-4">Net Payout</td>
              <td className="py-2 px-4" />
              <td className="py-2 px-4 text-right text-emerald-600">
                {formatCurrency(person.netPayout)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export function CommissionReport({ dateFrom, dateTo }: CommissionReportProps) {
  const { data, isLoading, error } = useCommissionReport({ dateFrom, dateTo });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur-sm shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-950 mb-4">Commission Report</h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-slate-200" />
          ))}
        </div>
      </div>
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

  const totalAdnaan =
    data.settled.adnaan.netPayout + data.pending.adnaan.netPayout;
  const totalMeme =
    data.settled.meme.netPayout + data.pending.meme.netPayout;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur-sm shadow-sm p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Total Adnaan Payout
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{formatCurrency(totalAdnaan)}</p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur-sm shadow-sm p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Total Meme Payout
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{formatCurrency(totalMeme)}</p>
        </div>
      </div>

      {/* Settled Section */}
      <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur-sm shadow-sm p-6 space-y-6">
        <h3 className="text-lg font-semibold text-slate-950">Settled</h3>
        <PersonTable person={data.settled.adnaan} showAimann />
        <PersonTable person={data.settled.meme} showAimann={false} />
      </div>

      {/* Pending Section */}
      <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur-sm shadow-sm p-6 space-y-6">
        <h3 className="text-lg font-semibold text-slate-950">Pending (all unsettled)</h3>
        <PersonTable person={data.pending.adnaan} showAimann />
        <PersonTable person={data.pending.meme} showAimann={false} />
      </div>
    </div>
  );
}
