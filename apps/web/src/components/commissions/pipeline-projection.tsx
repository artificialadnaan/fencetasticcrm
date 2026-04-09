import { formatCurrency } from '@/lib/formatters';
import type { PipelineProjectionSummary } from '@fencetastic/shared';

interface PipelineProjectionProps {
  data: PipelineProjectionSummary | null;
  isLoading: boolean;
}

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
};

export function PipelineProjection({ data, isLoading }: PipelineProjectionProps) {
  return (
    <section className="shell-panel rounded-[28px] p-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-[-0.05em] text-slate-950">
          Pipeline Projection
        </h2>
        {!isLoading && data && (
          <span className="text-sm text-slate-500">
            {data.projects.length} open project{data.projects.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="mt-6 space-y-4">
        {/* Totals row */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-[24px] border border-black/5 bg-white/70 px-5 py-4 space-y-1">
                <div className="h-3 w-16 animate-pulse rounded-[28px] bg-slate-200" />
                <div className="h-5 w-20 animate-pulse rounded-[28px] bg-slate-200" />
              </div>
            ))}
          </div>
        ) : data && data.projects.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-[24px] border border-black/5 bg-white/70 px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Adnaan Est.</p>
                <p className="mt-2 text-lg font-semibold tracking-[-0.05em] text-green-600">
                  {formatCurrency(data.totalAdnaan)}
                </p>
              </div>
              <div className="rounded-[24px] border border-black/5 bg-white/70 px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Meme Est.</p>
                <p className="mt-2 text-lg font-semibold tracking-[-0.05em] text-blue-600">
                  {formatCurrency(data.totalMeme)}
                </p>
              </div>
              <div className="rounded-[24px] border border-black/5 bg-white/70 px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Aimann Est.</p>
                <p className="mt-2 text-lg font-semibold tracking-[-0.05em] text-amber-600">
                  {formatCurrency(data.totalAimann)}
                </p>
              </div>
              <div className="rounded-[24px] border border-black/5 bg-white/70 px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Net Profit Est.</p>
                <p className="mt-2 text-lg font-semibold tracking-[-0.05em] text-slate-950">
                  {formatCurrency(data.totalNetProfit)}
                </p>
              </div>
            </div>

            {/* Project list */}
            <div className="rounded-[28px] border border-black/5 bg-white/55 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/5 bg-slate-50/80">
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Customer</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Status</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-500">Total</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-500">Adnaan</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-500">Meme</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-500">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.projects.map((p, i) => (
                      <tr
                        key={p.projectId}
                        className={`border-b border-black/5 transition-colors hover:bg-slate-50/60 ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}
                      >
                        <td className="px-3 py-2 font-medium text-slate-950">{p.customer}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[p.status] ?? ''}`}
                          >
                            {p.status === 'IN_PROGRESS' ? 'In Progress' : p.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-slate-950">{formatCurrency(p.projectTotal)}</td>
                        <td className="px-3 py-2 text-right text-green-600">
                          {formatCurrency(p.adnaanCommission)}
                        </td>
                        <td className="px-3 py-2 text-right text-blue-600">
                          {formatCurrency(p.memeCommission)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-slate-950">{formatCurrency(p.netProfit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-8">
            <p className="text-slate-500 text-sm">No open or in-progress projects.</p>
          </div>
        )}
      </div>
    </section>
  );
}
