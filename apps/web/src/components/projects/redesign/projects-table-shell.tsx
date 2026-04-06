import { useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
} from 'lucide-react';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { PROJECT_STATUS_META, type PaginatedResponse, type ProjectListItem } from '@fencetastic/shared';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { projectColumns } from '@/components/projects/columns';

interface ProjectsTableShellProps {
  projects: ProjectListItem[];
  pagination: PaginatedResponse<ProjectListItem>['pagination'] | null;
  isLoading: boolean;
  error: string | null;
  onRowClick: (row: ProjectListItem) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onClearFilters: () => void;
}

function EmptyState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white/55 px-6 py-16 text-center">
      <p className="text-lg font-semibold text-slate-950">No projects match the current view</p>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">
        Adjust the search, status tabs, or fence type filter to bring projects back into view.
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={onClearFilters}
        className="mt-5 rounded-2xl border-black/10 bg-white/80"
      >
        Clear Filters
      </Button>
    </div>
  );
}

function TableSkeleton({ columnCount }: { columnCount: number }) {
  return Array.from({ length: 5 }).map((_, rowIndex) => (
    <TableRow key={`projects-skeleton-${rowIndex}`} className="border-slate-200/70">
      {Array.from({ length: columnCount }).map((__, colIndex) => (
        <TableCell key={`projects-skeleton-${rowIndex}-${colIndex}`} className="px-4 py-4">
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  ));
}

export function ProjectsTableShell({
  projects,
  pagination,
  isLoading,
  error,
  onRowClick,
  onPageChange,
  onRetry,
  onClearFilters,
}: ProjectsTableShellProps) {
  const table = useReactTable({
    data: projects,
    columns: projectColumns as ColumnDef<ProjectListItem, unknown>[],
    getCoreRowModel: getCoreRowModel(),
  });

  const visibleRows = table.getRowModel().rows;
  const safePagination = pagination ?? {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  };

  const showError = Boolean(error);
  const columnsLength = projectColumns.length;
  const rowCountLabel = useMemo(() => {
    const total = safePagination.total ?? 0;
    if (showError) {
      return 'Project list unavailable';
    }
    if (isLoading) {
      return 'Loading live project rows';
    }
    return `${total} project${total === 1 ? '' : 's'} in the current filter set`;
  }, [isLoading, safePagination.total, showError]);

  return (
    <section className="shell-panel rounded-[32px] p-4 md:p-6">
      <div className="flex flex-col gap-4 border-b border-black/5 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Project Ledger
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
            Projects table
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {rowCountLabel}. Click a row to open the project detail workspace.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-2xl border border-black/5 bg-white/75 px-3 py-2 text-sm font-medium text-slate-700">
            Page {safePagination.page} of {safePagination.totalPages}
          </div>
          <div className="rounded-2xl border border-black/5 bg-white/75 px-3 py-2 text-sm font-medium text-slate-700">
            {safePagination.total} total
          </div>
        </div>
      </div>

      {showError ? (
        <div className="mt-6 rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-6">
          <p className="text-base font-semibold text-rose-900">Failed to load projects</p>
          <p className="mt-2 text-sm leading-6 text-rose-700">
            {error}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={onRetry} className="rounded-2xl bg-slate-950 px-4 text-white hover:bg-slate-800">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
            <Button type="button" variant="outline" onClick={onClearFilters} className="rounded-2xl border-black/10 bg-white/70">
              Clear Filters
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-[28px] border border-black/5 bg-white/75">
          <Table className="min-w-[1180px]">
            <TableHeader className="sticky top-0 z-10 bg-[rgba(255,255,255,0.96)] backdrop-blur">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-slate-200/70">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton columnCount={columnsLength} />
              ) : visibleRows.length ? (
                visibleRows.map((row) => {
                  const rowMeta = PROJECT_STATUS_META[row.original.status];
                  return (
                    <TableRow
                      key={row.id}
                      onClick={() => onRowClick(row.original)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onRowClick(row.original);
                        }
                      }}
                      tabIndex={0}
                      role="link"
                      aria-label={`Open project ${row.original.customer}`}
                      className={cn(
                        'cursor-pointer border-slate-200/70 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2',
                        rowMeta?.rowClassName
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="px-4 py-4 align-middle">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow className="border-slate-200/70">
                  <TableCell colSpan={columnsLength} className="p-0">
                    <EmptyState onClearFilters={onClearFilters} />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-4 border-t border-black/5 pt-5 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-slate-600">
          {showError
            ? 'The table is paused until the data load succeeds.'
            : `Page ${safePagination.page} of ${safePagination.totalPages} • ${safePagination.total} project${safePagination.total === 1 ? '' : 's'}`}
        </p>

        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-2xl border-black/10 bg-white/80"
            onClick={() => onPageChange(1)}
            disabled={safePagination.page <= 1 || showError}
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-2xl border-black/10 bg-white/80"
            onClick={() => onPageChange(safePagination.page - 1)}
            disabled={safePagination.page <= 1 || showError}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="rounded-2xl border border-black/5 bg-white/75 px-4 py-2 text-sm font-medium text-slate-700">
            {safePagination.page}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-2xl border-black/10 bg-white/80"
            onClick={() => onPageChange(safePagination.page + 1)}
            disabled={safePagination.page >= safePagination.totalPages || showError}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-2xl border-black/10 bg-white/80"
            onClick={() => onPageChange(safePagination.totalPages)}
            disabled={safePagination.page >= safePagination.totalPages || showError}
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
