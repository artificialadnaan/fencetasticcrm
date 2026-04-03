import { MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/formatters';
import type { DashboardActivityItem } from '@fencetastic/shared';

interface RecentActivityProps {
  activity: DashboardActivityItem[];
  isLoading: boolean;
}

export function RecentActivity({ activity, isLoading }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <MessageSquare className="h-4 w-4 text-[#06B6D4]" />
        <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : activity.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
        ) : (
          <ul className="divide-y divide-border">
            {activity.map((item) => (
              <li key={item.id} className="py-2 first:pt-0 last:pb-0">
                <Link
                  to={`/projects/${item.projectId}`}
                  className="block hover:text-[#7C3AED] transition-colors"
                >
                  <p className="text-xs font-semibold text-[#7C3AED]">{item.customer}</p>
                  <p className="text-sm text-foreground/90 mt-0.5 line-clamp-2">
                    {item.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(item.createdAt.split('T')[0])}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
