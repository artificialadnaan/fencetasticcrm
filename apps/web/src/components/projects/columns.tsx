import { type ColumnDef } from '@tanstack/react-table';
import type { ProjectListItem } from '@fencetastic/shared';
import { StatusBadge } from './status-badge';
import { formatCurrency, formatDate, formatPercent } from '@/lib/formatters';

export const projectColumns: ColumnDef<ProjectListItem>[] = [
  {
    accessorKey: 'customer',
    header: 'Customer',
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue('customer')}</span>
    ),
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
      const receivable = row.getValue('receivable') as number;
      return (
        <span className={`font-mono ${receivable > 0 ? 'text-amber-600' : 'text-green-600'}`}>
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
      const pct = row.getValue('profitPercent') as number;
      return (
        <span className={`font-mono ${pct < 0 ? 'text-red-600' : 'text-green-600'}`}>
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
