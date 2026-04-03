import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import type { PipelineProjectionSummary } from '@fencetastic/shared';

interface PipelineProjectionProps {
  data: PipelineProjectionSummary | null;
  isLoading: boolean;
}

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

export function PipelineProjection({ data, isLoading }: PipelineProjectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Pipeline Projection</CardTitle>
          {!isLoading && data && (
            <span className="text-sm text-muted-foreground">
              {data.projects.length} open project{data.projects.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Totals row */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-1">
                <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                <div className="h-5 w-20 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : data && data.projects.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Adnaan Est.</p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {formatCurrency(data.totalAdnaan)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Meme Est.</p>
                <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  {formatCurrency(data.totalMeme)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Aimann Est.</p>
                <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                  {formatCurrency(data.totalAimann)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Net Profit Est.</p>
                <p className="text-lg font-semibold">{formatCurrency(data.totalNetProfit)}</p>
              </div>
            </div>

            {/* Project list */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Customer</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Total</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Adnaan</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Meme</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {data.projects.map((p, i) => (
                    <tr
                      key={p.projectId}
                      className={`border-b transition-colors hover:bg-muted/30 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}
                    >
                      <td className="px-3 py-2 font-medium">{p.customer}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[p.status] ?? ''}`}
                        >
                          {p.status === 'IN_PROGRESS' ? 'In Progress' : p.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">{formatCurrency(p.projectTotal)}</td>
                      <td className="px-3 py-2 text-right text-green-600 dark:text-green-400">
                        {formatCurrency(p.adnaanCommission)}
                      </td>
                      <td className="px-3 py-2 text-right text-blue-600 dark:text-blue-400">
                        {formatCurrency(p.memeCommission)}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(p.netProfit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground text-sm">No open or in-progress projects.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
