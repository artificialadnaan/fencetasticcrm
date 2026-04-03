import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import { ProjectStatus, FenceType } from '@fencetastic/shared';

interface DataTableToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  fenceTypeFilter: string;
  onFenceTypeChange: (value: string) => void;
  onReset: () => void;
}

export function DataTableToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  fenceTypeFilter,
  onFenceTypeChange,
  onReset,
}: DataTableToolbarProps) {
  const hasFilters = search || statusFilter !== 'ALL' || fenceTypeFilter !== 'ALL';

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
      <Input
        placeholder="Search customer or address..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="h-9 w-full sm:w-[250px]"
      />
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="h-9 w-full sm:w-[150px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Statuses</SelectItem>
          {Object.values(ProjectStatus).map((s) => (
            <SelectItem key={s} value={s}>
              {s.replace('_', ' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={fenceTypeFilter} onValueChange={onFenceTypeChange}>
        <SelectTrigger className="h-9 w-full sm:w-[150px]">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Types</SelectItem>
          {Object.values(FenceType).map((t) => (
            <SelectItem key={t} value={t}>
              {t.replace('_', ' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onReset} className="h-9 px-2">
          <X className="h-4 w-4 mr-1" />
          Reset
        </Button>
      )}
    </div>
  );
}
