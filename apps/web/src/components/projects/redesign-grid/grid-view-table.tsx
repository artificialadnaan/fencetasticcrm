import { useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
} from '@tanstack/react-table';
import {
  PROJECT_STATUS_META,
  PROJECT_STATUS_ORDER,
  type GridProjectRow,
  type PaginatedResponse,
  type ProjectStatus,
} from '@fencetastic/shared';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface EditableCellProps {
  value: string | number | null;
  rowId: string;
  field: string;
  isNumber?: boolean;
  refetch: () => void;
  display?: string;
}

interface GridViewTableProps {
  projects: GridProjectRow[];
  pagination: PaginatedResponse<GridProjectRow>['pagination'] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onClearFilters: () => void;
  onOpenProject: (projectId: string) => void;
  rowSelection: RowSelectionState;
  onRowSelectionChange: Dispatch<SetStateAction<RowSelectionState>>;
  selectedCount: number;
}

function EditableCell({ value, rowId, field, isNumber = false, refetch, display }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraft(value != null ? String(value) : '');
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const cancel = () => setEditing(false);

  const save = async () => {
    setEditing(false);
    const payload: Record<string, unknown> = {
      [field]: isNumber ? (draft === '' ? null : Number(draft)) : draft,
    };
    try {
      await api.patch(`/projects/${rowId}`, payload);
      refetch();
    } catch (err) {
      console.error('Failed to save cell', err);
      alert('Failed to save. The field may be locked on completed projects.');
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="w-full min-w-[80px] rounded-xl border border-sky-300 bg-white px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          }
          if (event.key === 'Escape') {
            cancel();
          }
        }}
      />
    );
  }

  return (
    <button
      type="button"
      className="block min-w-[60px] rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      onClick={startEdit}
    >
      {display ?? (value != null ? String(value) : '—')}
    </button>
  );
}

const STATUS_LABELS: Record<ProjectStatus, string> = Object.fromEntries(
  PROJECT_STATUS_ORDER.map((status) => [status, PROJECT_STATUS_META[status].label])
) as Record<ProjectStatus, string>;

const STATUS_BADGE_CLASS: Record<ProjectStatus, string> = Object.fromEntries(
  PROJECT_STATUS_ORDER.map((status) => [status, PROJECT_STATUS_META[status].badgeClassName])
) as Record<ProjectStatus, string>;

const ROW_BG: Record<ProjectStatus, string> = Object.fromEntries(
  PROJECT_STATUS_ORDER.map((status) => [status, PROJECT_STATUS_META[status].rowClassName])
) as Record<ProjectStatus, string>;

const columnHelper = createColumnHelper<GridProjectRow>();

const TOTALS_COLS: Array<keyof GridProjectRow> = [
  'projectTotal',
  'moneyReceived',
  'customerPaid',
  'outstandingReceivables',
  'forecastedExpenses',
  'materialsCost',
  'subPayment1',
  'subPayment2',
  'commissionOwed',
  'commissionPaid',
  'outstandingPayables',
  'profitDollar',
  'memesCommission',
  'aimannsCommission',
  'netProfitDollar',
];

function sumCol(data: GridProjectRow[], col: keyof GridProjectRow): number {
  return data.reduce((acc, row) => acc + (Number(row[col]) || 0), 0);
}

function buildColumns(
  refetch: () => void,
  onOpenProject: (projectId: string) => void
): ColumnDef<GridProjectRow, unknown>[] {
  return [
    {
      id: 'select',
      size: 40,
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          className="cursor-pointer"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="cursor-pointer"
        />
      ),
    },
    columnHelper.accessor('installDate', {
      header: 'Install Date',
      size: 110,
      cell: info => <span className="whitespace-nowrap">{formatDate(info.getValue())}</span>,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 120,
      cell: info => {
        const s = info.getValue();
        return (
          <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]', STATUS_BADGE_CLASS[s])}>
            {STATUS_LABELS[s]}
          </span>
        );
      },
    }),
    columnHelper.accessor('contractDate', {
      header: 'Contract Date',
      size: 115,
      cell: info => <span className="whitespace-nowrap">{formatDate(info.getValue())}</span>,
    }),
    columnHelper.accessor('notes', {
      header: 'Notes',
      size: 160,
      cell: info => (
        <EditableCell
          value={info.getValue()}
          rowId={info.row.original.id}
          field="notes"
          refetch={refetch}
        />
      ),
    }),
    columnHelper.accessor('subcontractor', {
      header: 'SUB',
      size: 120,
      cell: info => (
        <EditableCell
          value={info.getValue()}
          rowId={info.row.original.id}
          field="subcontractor"
          refetch={refetch}
        />
      ),
    }),
    columnHelper.accessor('customer', {
      header: 'Customer',
      size: 140,
      cell: info => <span className="whitespace-nowrap font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor('address', {
      header: 'Address',
      size: 180,
      cell: info => <span className="whitespace-nowrap">{info.getValue()}</span>,
    }),
    columnHelper.accessor('description', {
      header: 'Description',
      size: 180,
      cell: info => <span className="whitespace-nowrap">{info.getValue()}</span>,
    }),
    columnHelper.accessor('projectTotal', {
      header: 'Project Total',
      size: 120,
      cell: info => <span className="whitespace-nowrap tabular-nums">{formatCurrency(info.getValue())}</span>,
    }),
    columnHelper.accessor('moneyReceived', {
      header: 'Money Received',
      size: 130,
      cell: info => <span className="whitespace-nowrap tabular-nums">{formatCurrency(info.getValue())}</span>,
    }),
    columnHelper.accessor('customerPaid', {
      header: 'Customer Paid',
      size: 120,
      cell: info => (
        <EditableCell
          value={info.getValue()}
          rowId={info.row.original.id}
          field="customerPaid"
          isNumber
          refetch={refetch}
          display={formatCurrency(info.getValue())}
        />
      ),
    }),
    columnHelper.accessor('paymentMethod', {
      header: 'Pmt',
      size: 90,
      cell: info => <span className="whitespace-nowrap text-xs">{info.getValue()}</span>,
    }),
    columnHelper.accessor('outstandingReceivables', {
      header: 'Outstanding Recv.',
      size: 140,
      cell: info => <span className="whitespace-nowrap tabular-nums">{formatCurrency(info.getValue())}</span>,
    }),
    columnHelper.accessor('forecastedExpenses', {
      header: 'Forecasted Exp.',
      size: 130,
      cell: info => (
        <EditableCell
          value={info.getValue()}
          rowId={info.row.original.id}
          field="forecastedExpenses"
          isNumber
          refetch={refetch}
          display={formatCurrency(info.getValue())}
        />
      ),
    }),
    columnHelper.accessor('materialsCost', {
      header: 'Materials',
      size: 110,
      cell: info => (
        <EditableCell
          value={info.getValue()}
          rowId={info.row.original.id}
          field="materialsCost"
          isNumber
          refetch={refetch}
          display={formatCurrency(info.getValue())}
        />
      ),
    }),
    columnHelper.accessor('subPayment1', {
      header: 'Sub Pmt 1',
      size: 110,
      cell: info => <span className="whitespace-nowrap tabular-nums">{formatCurrency(info.getValue())}</span>,
    }),
    columnHelper.accessor('subPayment2', {
      header: 'Sub Pmt 2',
      size: 110,
      cell: info => <span className="whitespace-nowrap tabular-nums">{formatCurrency(info.getValue())}</span>,
    }),
    columnHelper.accessor('commissionOwed', {
      header: 'Commission Owed',
      size: 140,
      cell: info => (
        <EditableCell
          value={info.getValue()}
          rowId={info.row.original.id}
          field="commissionOwed"
          isNumber
          refetch={refetch}
          display={formatCurrency(info.getValue())}
        />
      ),
    }),
    columnHelper.accessor('commissionPaid', {
      header: 'Commission Paid',
      size: 135,
      cell: info => (
        <EditableCell
          value={info.getValue()}
          rowId={info.row.original.id}
          field="commissionPaid"
          isNumber
          refetch={refetch}
          display={formatCurrency(info.getValue())}
        />
      ),
    }),
    columnHelper.accessor('outstandingPayables', {
      header: 'Outstanding Pay.',
      size: 135,
      cell: info => <span className="whitespace-nowrap tabular-nums">{formatCurrency(info.getValue())}</span>,
    }),
    columnHelper.accessor('profitDollar', {
      header: '$ Profit',
      size: 110,
      cell: info => {
        const v = info.getValue();
        return (
          <span className={cn('whitespace-nowrap tabular-nums font-semibold', v >= 0 ? 'text-emerald-700' : 'text-rose-600')}>
            {formatCurrency(v)}
          </span>
        );
      },
    }),
    columnHelper.accessor('profitPercent', {
      header: '% Profit',
      size: 90,
      cell: info => {
        const v = info.getValue();
        return (
          <span className={cn('whitespace-nowrap tabular-nums font-semibold', v >= 0 ? 'text-emerald-700' : 'text-rose-600')}>
            {v.toFixed(1)}%
          </span>
        );
      },
    }),
    columnHelper.accessor('memesCommission', {
      header: "Meme's Comm",
      size: 120,
      cell: info => (
        <EditableCell
          value={info.getValue()}
          rowId={info.row.original.id}
          field="memesCommission"
          isNumber
          refetch={refetch}
          display={formatCurrency(info.getValue())}
        />
      ),
    }),
    columnHelper.accessor('aimannsCommission', {
      header: "Aimann's Comm",
      size: 125,
      cell: info => (
        <EditableCell
          value={info.getValue()}
          rowId={info.row.original.id}
          field="aimannsCommission"
          isNumber
          refetch={refetch}
          display={formatCurrency(info.getValue())}
        />
      ),
    }),
    columnHelper.accessor('netProfitDollar', {
      header: 'NET $',
      size: 110,
      cell: info => {
        const v = info.getValue();
        return (
          <span className={cn('whitespace-nowrap tabular-nums font-semibold', v >= 0 ? 'text-emerald-700' : 'text-rose-600')}>
            {formatCurrency(v)}
          </span>
        );
      },
    }),
    columnHelper.accessor('netProfitPercent', {
      header: 'NET %',
      size: 90,
      cell: info => {
        const v = info.getValue();
        return (
          <span className={cn('whitespace-nowrap tabular-nums font-semibold', v >= 0 ? 'text-emerald-700' : 'text-rose-600')}>
            {v.toFixed(1)}%
          </span>
        );
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      size: 92,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-xl border-black/10 bg-white/80 px-3 text-slate-700 shadow-sm"
            onClick={() => onOpenProject(row.original.id)}
          >
            Open
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    }),
  ] as ColumnDef<GridProjectRow, unknown>[];
}

export function GridViewTable({
  projects,
  pagination,
  isLoading,
  error,
  refetch,
  onPageChange,
  onRetry,
  onClearFilters,
  onOpenProject,
  rowSelection,
  onRowSelectionChange,
  selectedCount,
}: GridViewTableProps) {
  const table = useReactTable({
    data: projects,
    columns: buildColumns(refetch, onOpenProject),
    state: { rowSelection },
    onRowSelectionChange,
    getCoreRowModel: getCoreRowModel(),
    getRowId: row => row.id,
  });

  const visibleRows = table.getRowModel().rows;
  const safePagination = pagination ?? {
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 1,
  };

  const showError = Boolean(error);
  const columnsLength = table.getAllColumns().length;
  const totals = TOTALS_COLS.reduce<Record<string, number>>((acc, col) => {
    acc[col] = sumCol(projects, col);
    return acc;
  }, {});

  const rowCountLabel = showError
    ? 'Project grid unavailable'
    : isLoading
      ? 'Loading live grid rows'
      : `${safePagination.total} project${safePagination.total === 1 ? '' : 's'} in the current filter set`;

  return (
    <section className="shell-panel rounded-[32px] p-4 md:p-6">
      <div className="flex flex-col gap-4 border-b border-black/5 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Project Ledger
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
            Grid view
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {rowCountLabel}. Inline edits stay active and the rightmost action opens the project workspace.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-2xl border border-black/5 bg-white/75 px-3 py-2 text-sm font-medium text-slate-700">
            Page {safePagination.page} of {safePagination.totalPages}
          </div>
          <div className="rounded-2xl border border-black/5 bg-white/75 px-3 py-2 text-sm font-medium text-slate-700">
            {safePagination.total} total
          </div>
          <div className="rounded-2xl border border-black/5 bg-white/75 px-3 py-2 text-sm font-medium text-slate-700">
            {selectedCount} selected
          </div>
        </div>
      </div>

      {showError ? (
        <div className="mt-6 rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-6">
          <p className="text-base font-semibold text-rose-900">Failed to load grid rows</p>
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
          <div className="overflow-x-auto">
            <table className="min-w-max border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-[rgba(255,255,255,0.96)] backdrop-blur">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        style={{ width: header.getSize(), minWidth: header.getSize() }}
                        className="border-b border-r border-gray-200 px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 whitespace-nowrap"
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white/90">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, rowIndex) => (
                    <tr key={`grid-skeleton-${rowIndex}`}>
                      {Array.from({ length: columnsLength }).map((__, colIndex) => (
                        <td key={`grid-skeleton-${rowIndex}-${colIndex}`} className="border-r border-gray-100 px-3 py-3">
                          <div className="h-4 w-full animate-pulse rounded-full bg-slate-200" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : visibleRows.length ? (
                  visibleRows.map((row) => (
                    <tr
                      key={row.id}
                      className={cn('hover:bg-slate-50/90', ROW_BG[row.original.status])}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          style={{ width: cell.column.getSize(), minWidth: cell.column.getSize() }}
                          className="border-r border-gray-100 px-3 py-2.5 align-middle"
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columnsLength} className="p-0">
                      <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white/55 px-6 py-16 text-center">
                        <p className="text-lg font-semibold text-slate-950">No grid rows match the current view</p>
                        <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">
                          Adjust the search or status filters to bring projects back into view.
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
                    </td>
                  </tr>
                )}

                {projects.length > 0 && !isLoading && (
                  <tr className="bg-slate-100/90 font-semibold">
                    {table.getAllColumns().map((column, index) => {
                      if (index === 0) {
                        return (
                          <td
                            key={column.id}
                            className="border-r border-gray-200 px-3 py-3 text-xs font-semibold text-slate-700 whitespace-nowrap"
                          >
                            Totals ({projects.length})
                          </td>
                        );
                      }

                      const columnId = column.id as keyof GridProjectRow;
                      if (TOTALS_COLS.includes(columnId)) {
                        const val = totals[columnId] ?? 0;
                        const isProfit =
                          columnId === 'profitDollar' ||
                          columnId === 'netProfitDollar';
                        return (
                          <td
                            key={column.id}
                            className={cn(
                              'border-r border-gray-200 px-3 py-3 text-xs tabular-nums whitespace-nowrap',
                              isProfit ? (val >= 0 ? 'text-emerald-700' : 'text-rose-600') : 'text-slate-800'
                            )}
                          >
                            {formatCurrency(val)}
                          </td>
                        );
                      }

                      return <td key={column.id} className="border-r border-gray-200 px-3 py-3" />;
                    })}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-5 flex flex-col gap-4 border-t border-black/5 pt-5 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-slate-600">
            Page {safePagination.page} of {safePagination.totalPages} • {safePagination.total} project{safePagination.total === 1 ? '' : 's'}
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
              <span className="text-sm">«</span>
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
              <span className="text-sm">‹</span>
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
              <span className="text-sm">›</span>
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
              <span className="text-sm">»</span>
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
