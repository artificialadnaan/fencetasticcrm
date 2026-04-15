import { type ColumnDef } from '@tanstack/react-table';
import type { ProjectListItem } from '@fencetastic/shared';
import { StatusBadge } from './status-badge';
import { formatCurrency, formatDate, formatPercent } from '@/lib/formatters';

export const projectColumns: ColumnDef<ProjectListItem>[] = [
  {
    accessorKey: 'customer',
    header: 'Customer',
    cell: ({ row }) => {
      const mode = row.original.financeProjectMode;
      const readiness = row.original.scheduleReadiness;
      return (
        <div className="space-y-1">
          <span className="font-medium">{row.getValue('customer')}</span>
          {mode ? (
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {mode.replace(/_/g, ' ')}
            </div>
          ) : null}
          {!readiness.isReady ? (
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                {readiness.blockerCount} blocker{readiness.blockerCount === 1 ? '' : 's'}
              </div>
              <div className="text-xs text-slate-500">
                {readiness.topBlockers.join(' • ')}
              </div>
            </div>
          ) : (
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Install ready
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'address',
    header: 'Address',
    meta: { className: 'hidden md:table-cell' },
    cell: ({ row }) => (
      <span className="text-muted-foreground max-w-[200px] truncate block">
        {row.getValue('address')}
      </span>
    ),
  },
  {
    accessorKey: 'fenceType',
    header: 'Type',
    meta: { className: 'hidden md:table-cell' },
    cell: ({ row }) => {
      const type = row.getValue('fenceType') as string;
      return <span className="text-sm">{type.replace('_', ' ')}</span>;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
  },
  {
    accessorKey: 'nextAction',
    header: 'Next Action',
    meta: { className: 'hidden xl:table-cell' },
    cell: ({ row }) => {
      const nextAction = row.original.nextAction;
      if (!nextAction) {
        return <span className="text-sm text-slate-400">No task set</span>;
      }

      return (
        <div className="space-y-1">
          <div className="text-sm font-medium text-slate-900">{nextAction.title}</div>
          <div className="text-xs text-slate-500">
            Due {formatDate(nextAction.dueDate)}
            {nextAction.assignedToName ? ` • ${nextAction.assignedToName}` : ' • Unassigned'}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'projectTotal',
    header: 'Project Total',
    cell: ({ row }) => (
      <span className="font-mono">{formatCurrency(row.getValue('projectTotal'))}</span>
    ),
  },
  {
    accessorKey: 'receivable',
    header: 'Receivable',
    meta: { className: 'hidden lg:table-cell' },
    cell: ({ row }) => {
      const receivable = row.getValue('receivable') as number | null;
      return (
        <span className={`font-mono ${receivable != null && receivable > 0 ? 'text-amber-600' : 'text-green-600'}`}>
          {formatCurrency(receivable)}
        </span>
      );
    },
  },
  {
    accessorKey: 'profitPercent',
    header: 'Profit %',
    meta: { className: 'hidden lg:table-cell' },
    cell: ({ row }) => {
      const pct = row.getValue('profitPercent') as number | null;
      return (
        <span className={`font-mono ${pct != null && pct < 0 ? 'text-red-600' : 'text-green-600'}`}>
          {formatPercent(pct)}
        </span>
      );
    },
  },
  {
    accessorKey: 'installDate',
    header: 'Install Date',
    cell: ({ row }) => formatDate(row.getValue('installDate')),
  },
];
