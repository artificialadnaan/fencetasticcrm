import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { CommissionByProject, PaginatedResponse } from '@fencetastic/shared';

interface ProjectBreakdownTableProps {
  data: CommissionByProject[];
  pagination: PaginatedResponse<CommissionByProject>['pagination'] | null;
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
}

export function ProjectBreakdownTable({
  data,
  pagination,
  isLoading,
  page,
  onPageChange,
}: ProjectBreakdownTableProps) {
  return (
    <section className="shell-panel rounded-[28px] p-6 md:p-8">
      <h2 className="text-2xl font-semibold tracking-[-0.05em] text-slate-950">
        Per-Project Breakdown
      </h2>

      <div className="mt-6 rounded-[28px] border border-black/5 bg-white/55 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 bg-slate-50/80">
                <th className="px-4 py-3 text-left font-medium text-slate-500">Customer</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Project Total</th>
                <th className="hidden md:table-cell px-4 py-3 text-right font-medium text-slate-500">Adnaan</th>
                <th className="hidden md:table-cell px-4 py-3 text-right font-medium text-slate-500">Meme</th>
                <th className="hidden md:table-cell px-4 py-3 text-right font-medium text-slate-500">Aimann</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Net Profit</th>
                <th className="hidden lg:table-cell px-4 py-3 text-right font-medium text-slate-500">Completed</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-black/5">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className={j >= 2 && j <= 4 ? 'hidden md:table-cell px-4 py-3' : j === 6 ? 'hidden lg:table-cell px-4 py-3' : 'px-4 py-3'}>
                        <div className="h-4 animate-pulse rounded-[28px] bg-slate-200" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No completed projects yet.
                  </td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <tr
                    key={row.projectId}
                    className={`border-b border-black/5 transition-colors hover:bg-slate-50/60 ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-950">{row.customer}</td>
                    <td className="px-4 py-3 text-right text-slate-950">{formatCurrency(row.projectTotal)}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-right text-green-600">
                      {formatCurrency(row.adnaanCommission)}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-right text-blue-600">
                      {formatCurrency(row.memeCommission)}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-right text-amber-600">
                      {formatCurrency(row.aimannDeduction)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-950">
                      {formatCurrency(row.netProfit)}
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3 text-right text-slate-500">
                      {formatDate(row.completedDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-black/5">
            <p className="text-sm text-slate-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} projects)
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="rounded-2xl"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => onPageChange(page + 1)}
                className="rounded-2xl"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
