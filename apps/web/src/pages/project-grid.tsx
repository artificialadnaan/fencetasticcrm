import { useState, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
} from '@tanstack/react-table';
import { Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useGridProjects } from '@/hooks/use-grid-projects';
import type { GridProjectRow } from '@fencetastic/shared';
import { ProjectStatus } from '@fencetastic/shared';

// ─── Editable Cell ───────────────────────────────────────────────────────────

interface EditableCellProps {
  value: string | number | null;
  rowId: string;
  field: string;
  isNumber?: boolean;
  refetch: () => void;
  display?: string;
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
        className="w-full min-w-[80px] border border-blue-400 rounded px-1 py-0.5 text-xs focus:outline-none"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.currentTarget.blur(); }
          if (e.key === 'Escape') { cancel(); }
        }}
      />
    );
  }

  return (
    <span
      className="cursor-pointer hover:bg-blue-50 rounded px-1 py-0.5 block min-w-[60px] whitespace-nowrap"
      onClick={startEdit}
    >
      {display ?? (value != null ? String(value) : '—')}
    </span>
  );
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ProjectStatus, string> = {
  [ProjectStatus.ESTIMATE]: 'Estimate',
  [ProjectStatus.OPEN]: 'Open',
  [ProjectStatus.IN_PROGRESS]: 'In Progress',
  [ProjectStatus.COMPLETED]: 'Completed',
  [ProjectStatus.CLOSED]: 'Closed',
  [ProjectStatus.WARRANTY]: 'Warranty',
};

const STATUS_BADGE_CLASS: Record<ProjectStatus, string> = {
  [ProjectStatus.ESTIMATE]: 'bg-gray-100 text-gray-700',
  [ProjectStatus.OPEN]: 'bg-amber-100 text-amber-800',
  [ProjectStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
  [ProjectStatus.COMPLETED]: 'bg-green-100 text-green-800',
  [ProjectStatus.CLOSED]: 'bg-red-100 text-red-800',
  [ProjectStatus.WARRANTY]: 'bg-purple-100 text-purple-800',
};

const ROW_BG: Record<ProjectStatus, string> = {
  [ProjectStatus.ESTIMATE]: '',
  [ProjectStatus.OPEN]: 'bg-amber-50',
  [ProjectStatus.IN_PROGRESS]: 'bg-blue-50',
  [ProjectStatus.COMPLETED]: 'bg-green-50',
  [ProjectStatus.CLOSED]: 'bg-red-50',
  [ProjectStatus.WARRANTY]: 'bg-purple-50',
};

const STATUS_TABS: Array<{ label: string; value: ProjectStatus | 'ALL' }> = [
  { label: 'Open', value: ProjectStatus.OPEN },
  { label: 'In Progress', value: ProjectStatus.IN_PROGRESS },
  { label: 'Completed', value: ProjectStatus.COMPLETED },
  { label: 'Closed', value: ProjectStatus.CLOSED },
  { label: 'Warranty', value: ProjectStatus.WARRANTY },
  { label: 'All', value: 'ALL' },
];

// ─── Column helper ────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<GridProjectRow>();

function buildColumns(refetch: () => void): ColumnDef<GridProjectRow, unknown>[] {
  return [
    // Checkbox
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
          <Badge className={`${STATUS_BADGE_CLASS[s]} border-0 text-xs whitespace-nowrap`}>
            {STATUS_LABELS[s]}
          </Badge>
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
      size: 160,
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
          <span className={`whitespace-nowrap tabular-nums font-semibold ${v >= 0 ? 'text-green-700' : 'text-red-600'}`}>
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
          <span className={`whitespace-nowrap tabular-nums font-semibold ${v >= 0 ? 'text-green-700' : 'text-red-600'}`}>
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
          <span className={`whitespace-nowrap tabular-nums font-semibold ${v >= 0 ? 'text-green-700' : 'text-red-600'}`}>
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
          <span className={`whitespace-nowrap tabular-nums font-semibold ${v >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {v.toFixed(1)}%
          </span>
        );
      },
    }),
  ] as ColumnDef<GridProjectRow, unknown>[];
}

// ─── Totals row ───────────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectGridPage() {
  const [activeTab, setActiveTab] = useState<ProjectStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rowSelection, setRowSelection] = useState({});

  const query = {
    page,
    limit: 100,
    ...(activeTab !== 'ALL' ? { status: activeTab } : {}),
    ...(search ? { search } : {}),
  };

  const { data, pagination, isLoading, error, refetch } = useGridProjects(query);

  const columns = buildColumns(refetch);

  const table = useReactTable({
    data,
    columns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getRowId: row => row.id,
  });

  const handleExport = async () => {
    try {
      const res = await api.get('/projects/export', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'projects.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  // Totals
  const totals = TOTALS_COLS.reduce<Record<string, number>>((acc, col) => {
    acc[col] = sumCol(data, col);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-gray-900">Projects Grid</h1>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1" />
          Export Excel
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 flex-wrap">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => { setActiveTab(tab.value); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative w-72">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      {error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-3">{error}</div>
      )}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading...</div>
      ) : (
        <div className="flex-1 overflow-auto border border-gray-200 rounded-lg" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          <table className="text-xs border-collapse min-w-max">
            <thead className="sticky top-0 bg-gray-50 z-10">
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(header => (
                    <th
                      key={header.id}
                      style={{ width: header.getSize(), minWidth: header.getSize() }}
                      className="px-2 py-2 text-left text-xs font-semibold text-gray-600 border-b border-r border-gray-200 whitespace-nowrap"
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className={`hover:bg-gray-50 ${ROW_BG[row.original.status] ?? ''}`}
                >
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      style={{ width: cell.column.getSize(), minWidth: cell.column.getSize() }}
                      className="px-2 py-1.5 border-r border-gray-100 align-middle"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Totals row */}
              {data.length > 0 && (
                <tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                  {table.getAllColumns().map((col, idx) => {
                    if (idx === 0) {
                      return (
                        <td key={col.id} className="px-2 py-2 text-xs text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          Totals ({data.length})
                        </td>
                      );
                    }
                    const colId = col.id as keyof GridProjectRow;
                    if (TOTALS_COLS.includes(colId)) {
                      const val = totals[colId] ?? 0;
                      const isProfit = colId === 'profitDollar' || colId === 'netProfitDollar';
                      return (
                        <td
                          key={col.id}
                          className={`px-2 py-2 text-xs tabular-nums border-r border-gray-200 whitespace-nowrap ${
                            isProfit ? (val >= 0 ? 'text-green-700' : 'text-red-600') : 'text-gray-800'
                          }`}
                        >
                          {formatCurrency(val)}
                        </td>
                      );
                    }
                    return <td key={col.id} className="px-2 py-2 border-r border-gray-200" />;
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {pagination.page} of {pagination.totalPages} &mdash; {pagination.total} projects
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
