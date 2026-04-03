import { CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/formatters';
import type { DashboardUpcomingInstall } from '@fencetastic/shared';

const FENCE_TYPE_LABELS: Record<string, string> = {
  WOOD: 'Wood',
  METAL: 'Metal',
  CHAIN_LINK: 'Chain Link',
  VINYL: 'Vinyl',
  GATE: 'Gate',
  OTHER: 'Other',
};

interface UpcomingInstallsProps {
  installs: DashboardUpcomingInstall[];
  isLoading: boolean;
}

export function UpcomingInstalls({ installs, isLoading }: UpcomingInstallsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <CalendarDays className="h-4 w-4 text-[#7C3AED]" />
        <CardTitle className="text-base font-semibold">Upcoming Installs</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : installs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No upcoming installs scheduled
          </p>
        ) : (
          <ul className="space-y-2">
            {installs.map((install) => (
              <li key={install.id}>
                <Link
                  to={`/projects/${install.id}`}
                  className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{install.customer}</p>
                    <p className="text-xs text-muted-foreground truncate">{install.address}</p>
                  </div>
                  <div className="ml-3 flex flex-col items-end shrink-0 gap-1">
                    <span className="text-xs font-semibold text-[#06B6D4]">
                      {formatDate(install.installDate)}
                    </span>
                    <Badge variant="outline" className="text-[10px] py-0 h-4">
                      {FENCE_TYPE_LABELS[install.fenceType] ?? install.fenceType}
                    </Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
