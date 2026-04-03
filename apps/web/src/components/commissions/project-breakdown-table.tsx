import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Per-Project Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Project Total</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Adnaan</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Meme</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Aimann</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Net Profit</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Completed</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No completed projects yet.
                  </td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <tr
                    key={row.projectId}
                    className={`border-b transition-colors hover:bg-muted/30 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}
                  >
                    <td className="px-4 py-3 font-medium">{row.customer}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(row.projectTotal)}</td>
                    <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                      {formatCurrency(row.adnaanCommission)}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">
                      {formatCurrency(row.memeCommission)}
                    </td>
                    <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400">
                      {formatCurrency(row.aimannDeduction)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(row.netProfit)}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {formatDate(row.completedDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} projects)
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
