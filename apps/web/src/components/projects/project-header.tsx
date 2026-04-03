import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { StatusBadge } from './status-badge';
import { ProjectStatus } from '@fencetastic/shared';
import { api } from '@/lib/api';

interface ProjectHeaderProps {
  projectId: string;
  customer: string;
  address: string;
  status: string;
  onStatusChange: () => void;
}

export function ProjectHeader({
  projectId,
  customer,
  address,
  status,
  onStatusChange,
}: ProjectHeaderProps) {
  async function handleStatusChange(newStatus: string) {
    try {
      await api.patch(`/projects/${projectId}`, { status: newStatus });
      onStatusChange();
    } catch (err) {
      console.error('Status change failed:', err);
      alert('Failed to update status. Please try again.');
      // Refetch to reset the dropdown
      onStatusChange();
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <Button variant="ghost" size="icon" asChild>
        <Link to="/projects">
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </Button>
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{customer}</h1>
          <StatusBadge status={status} />
        </div>
        <p className="text-muted-foreground mt-1">{address}</p>
      </div>
      <Select value={status} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Change status" />
        </SelectTrigger>
        <SelectContent>
          {Object.values(ProjectStatus).map((s) => (
            <SelectItem key={s} value={s}>
              {s.replace('_', ' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
