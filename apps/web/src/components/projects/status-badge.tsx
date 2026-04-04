import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PROJECT_STATUS_META, type ProjectStatus } from '@fencetastic/shared';

interface StatusBadgeProps {
  status: ProjectStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = PROJECT_STATUS_META[status as ProjectStatus] ?? {
    label: status,
    badgeClassName: '',
  };
  return (
    <Badge variant="outline" className={cn(config.badgeClassName, className)}>
      {config.label}
    </Badge>
  );
}
