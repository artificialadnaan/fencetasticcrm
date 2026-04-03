import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { DashboardFollowUp } from '@fencetastic/shared';

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  OPEN: { label: 'Open', variant: 'outline' },
  IN_PROGRESS: { label: 'In Progress', variant: 'default' },
  COMPLETED: { label: 'Completed', variant: 'secondary' },
  ESTIMATE: { label: 'Estimate', variant: 'secondary' },
};

interface FollowUpsWidgetProps {
  followUps: DashboardFollowUp[];
  isLoading: boolean;
}

export function FollowUpsWidget({ followUps, isLoading }: FollowUpsWidgetProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <Bell className="h-4 w-4 text-amber-500" />
        <CardTitle className="text-base font-semibold">
          Today's Follow-Ups
          {followUps.length > 0 && (
            <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-500">
              {followUps.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : followUps.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No follow-ups scheduled for today
          </p>
        ) : (
          <ul className="space-y-2">
            {followUps.map((f) => {
              const badge = STATUS_BADGE[f.status] ?? { label: f.status, variant: 'outline' as const };
              return (
                <li key={f.id}>
                  <Link
                    to={`/projects/${f.id}`}
                    className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{f.customer}</p>
                      <p className="text-xs text-muted-foreground truncate">{f.address}</p>
                    </div>
                    <Badge variant={badge.variant} className="ml-3 shrink-0 text-xs">
                      {badge.label}
                    </Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
