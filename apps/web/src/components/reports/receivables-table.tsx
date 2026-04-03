import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { ReceivablesAgingData, ReceivablesProject } from '@fencetastic/shared';

interface ReceivablesTableProps {
  data: ReceivablesAgingData | null;
  isLoading: boolean;
}

const FENCE_TYPE_LABELS: Record<string, string> = {
  WOOD: 'Wood',
  METAL: 'Metal',
  CHAIN_LINK: 'Chain Link',
  VINYL: 'Vinyl',
  GATE: 'Gate',
  OTHER: 'Other',
};

const BUCKET_CONFIG = [
  { key: 'bucket0_30' as const, label: '0-30 Days', color: 'text-emerald-400' },
  { key: 'bucket31_60' as const, label: '31-60 Days', color: 'text-amber-400' },
  { key: 'bucket61_90' as const, label: '61-90 Days', color: 'text-orange-400' },
  { key: 'bucket90plus' as const, label: '90+ Days', color: 'text-red-400' },
];

function BucketTable({
  label,
  projects,
  total,
  colorClass,
}: {
  label: string;
  projects: ReceivablesProject[];
  total: number;
  colorClass: string;
}) {
  if (projects.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className={`text-sm font-semibold ${colorClass}`}>{label}</h3>
        <span className={`text-sm font-bold ${colorClass}`}>{formatCurrency(total)}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="text-left py-2 pr-4">Customer</th>
              <th className="text-left py-2 pr-4 hidden sm:table-cell">Address</th>
              <th className="text-left py-2 pr-4 hidden md:table-cell">Type</th>
              <th className="text-right py-2 pr-4">Total</th>
              <th className="text-right py-2 pr-4">Paid</th>
              <th className="text-right py-2">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-b hover:bg-muted/30 transition-colors">
                <td className="py-2 pr-4">
                  <Link
                    to={`/projects/${p.id}`}
                    className="font-medium hover:text-[#7C3AED] transition-colors"
                  >
                    {p.customer}
                  </Link>
                  <p className="text-xs text-muted-foreground">{formatDate(p.contractDate)}</p>
                </td>
                <td className="py-2 pr-4 text-muted-foreground text-xs hidden sm:table-cell truncate max-w-[160px]">
                  {p.address}
                </td>
                <td className="py-2 pr-4 hidden md:table-cell">
                  <Badge variant="outline" className="text-xs">
                    {FENCE_TYPE_LABELS[p.fenceType] ?? p.fenceType}
                  </Badge>
                </td>
                <td className="py-2 pr-4 text-right">{formatCurrency(p.projectTotal)}</td>
                <td className="py-2 pr-4 text-right text-emerald-400">
                  {formatCurrency(p.customerPaid)}
                </td>
                <td className={`py-2 text-right font-semibold ${colorClass}`}>
                  {formatCurrency(p.outstanding)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ReceivablesTable({ data, isLoading }: ReceivablesTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Receivables Aging</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasAny = data
    ? BUCKET_CONFIG.some((b) => (data[b.key] as ReceivablesProject[]).length > 0)
    : false;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">Receivables Aging</CardTitle>
        {data && (
          <span className="text-sm font-bold text-red-400">
            Total: {formatCurrency(data.totals.overall)}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {!hasAny ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No outstanding receivables
          </p>
        ) : (
          <div className="space-y-6">
            {BUCKET_CONFIG.map((bucket) => {
              const projects = data![bucket.key] as ReceivablesProject[];
              const total = data!.totals[bucket.key];
              return (
                <BucketTable
                  key={bucket.key}
                  label={bucket.label}
                  projects={projects}
                  total={total}
                  colorClass={bucket.color}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
