import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ProjectStatus } from '@fencetastic/shared';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ESTIMATE: {
    label: 'Estimate',
    className: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100',
  },
  OPEN: {
    label: 'Open',
    className: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100',
  },
};

interface StatusBadgeProps {
  status: ProjectStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: '' };
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
