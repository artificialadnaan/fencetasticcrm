import { useCallback, useMemo, useState } from 'react';
import { Grid3X3, Download, Plus, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  FenceType,
  PROJECT_STATUS_META,
  PROJECT_STATUS_ORDER,
  ProjectStatus,
  type ProjectListItem,
  type ProjectListQuery,
} from '@fencetastic/shared';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProjects } from '@/hooks/use-projects';
import { usePageShell } from '@/components/layout/page-shell';
import { api } from '@/lib/api';
import { ProjectsSummaryStrip } from '@/components/projects/redesign/projects-summary-strip';
import { exportProjects } from '@/components/projects/redesign/projects-export';
import { ProjectsTableShell } from '@/components/projects/redesign/projects-table-shell';

const STATUS_TABS: Array<{ label: string; value: ProjectStatus | 'ALL' }> = [
  ...PROJECT_STATUS_ORDER.map((status) => ({
    label: PROJECT_STATUS_META[status].shortLabel,
    value: status,
  })),
  { label: 'All', value: 'ALL' },
];

const FENCE_TYPE_LABELS: Record<FenceType | 'ALL', string> = {
  ALL: 'All Types',
  [FenceType.WOOD]: 'Wood',
  [FenceType.METAL]: 'Metal',
  [FenceType.CHAIN_LINK]: 'Chain Link',
  [FenceType.VINYL]: 'Vinyl',
  [FenceType.GATE]: 'Gate',
  [FenceType.OTHER]: 'Other',
};

const DEFAULT_QUERY: ProjectListQuery = {
  page: 1,
  limit: 20,
  sortBy: 'installDate',
  sortDir: 'desc',
};

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [query, setQuery] = useState<ProjectListQuery>(DEFAULT_QUERY);

  const { data, pagination, isLoading, error, refetch } = useProjects(query);

  const activeStatus = query.status ?? 'ALL';
  const activeFenceType = query.fenceType ?? 'ALL';
  const hasActiveFilters = Boolean(query.search || query.status || query.fenceType || query.dateFrom || query.dateTo);

  const handleSearchChange = useCallback((search: string) => {
    setQuery((prev) => ({
      ...prev,
      search: search.trim() ? search : undefined,
      page: 1,
    }));
  }, []);

  const handleFenceTypeChange = useCallback((value: string) => {
    setQuery((prev) => ({
      ...prev,
      fenceType: value === 'ALL' ? undefined : (value as FenceType),
      page: 1,
    }));
  }, []);

  const handleStatusChange = useCallback((value: ProjectStatus | 'ALL') => {
    setQuery((prev) => ({
      ...prev,
      status: value === 'ALL' ? undefined : value,
      page: 1,
    }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setQuery((prev) => ({ ...prev, page }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setQuery(DEFAULT_QUERY);
  }, []);

  const handleRowClick = useCallback(
    (row: ProjectListItem) => {
      navigate(`/projects/${row.id}`);
    },
    [navigate]
  );

  const handleGridView = useCallback(() => {
    navigate('/projects/grid');
  }, [navigate]);

  const handleExport = useCallback(async () => {
    try {
      const blob = await exportProjects(query, api);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'projects.xlsx';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export projects', err);
    }
  }, [query.dateFrom, query.dateTo, query.fenceType, query.search, query.sortBy, query.sortDir, query.status]);

  const searchSlot = useMemo(
    () => (
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:w-[280px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query.search ?? ''}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Search customer or address..."
            className="h-10 rounded-2xl border-black/10 bg-white/80 pl-10 shadow-sm placeholder:text-slate-400"
          />
        </div>

        <Select value={activeFenceType} onValueChange={handleFenceTypeChange}>
          <SelectTrigger className="h-10 w-full rounded-2xl border-black/10 bg-white/80 shadow-sm sm:w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(FENCE_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleClearFilters}
            className="h-10 rounded-2xl border border-black/5 bg-white/60 px-4 text-slate-700 hover:bg-white"
          >
            <X className="h-4 w-4" />
            Reset
          </Button>
        )}
      </div>
    ),
    [activeFenceType, handleClearFilters, handleFenceTypeChange, handleSearchChange, hasActiveFilters, query.search]
  );

  const primaryActions = useMemo(
    () => (
      <Button
        type="button"
        onClick={() => setIsCreateOpen(true)}
        className="rounded-2xl bg-slate-950 px-4 text-white hover:bg-slate-800"
      >
        <Plus className="h-4 w-4" />
        New Project
      </Button>
    ),
    []
  );

  const secondaryActions = useMemo(
    () => (
      <Button
        type="button"
        variant="outline"
        onClick={handleExport}
        className="rounded-2xl border-black/10 bg-white/70 px-4 shadow-sm"
      >
        <Download className="h-4 w-4" />
        Export
      </Button>
    ),
    [handleExport]
  );

  const utilityActions = useMemo(
    () => (
      <Button
        type="button"
        variant="ghost"
        onClick={handleGridView}
        className="rounded-2xl border border-black/5 bg-white/60 px-4 text-slate-700 shadow-sm hover:bg-white"
      >
        <Grid3X3 className="h-4 w-4" />
        Grid View
      </Button>
    ),
    [handleGridView]
  );

  usePageShell({
    eyebrow: 'Command Center',
    title: 'Projects',
    subtitle: 'Search the live project pipeline, switch status tabs, and export the current filtered view.',
    searchSlot,
    primaryActions,
    secondaryActions,
    utilityActions,
  });

  return (
    <>
      <CreateProjectDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={refetch}
      />

      <div className="space-y-6">
        <div className="rounded-[28px] border border-black/5 bg-white/55 p-2 shadow-sm">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Project status filters">
            {STATUS_TABS.map((tab) => {
              const isActive = activeStatus === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => handleStatusChange(tab.value)}
                  className={`
                    rounded-2xl px-4 py-2 text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]'
                      : 'text-slate-600 hover:bg-white hover:text-slate-950'
                    }
                  `}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <ProjectsSummaryStrip
          projects={data}
          pagination={pagination}
          isLoading={isLoading}
          error={error}
        />

        <ProjectsTableShell
          projects={data}
          pagination={pagination}
          isLoading={isLoading}
          error={error}
          onRowClick={handleRowClick}
          onPageChange={handlePageChange}
          onRetry={refetch}
          onClearFilters={handleClearFilters}
        />

        <section className="shell-panel rounded-[32px] p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.8fr)] lg:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Field Ops Assist
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
                Keep the project pipeline moving from one workspace.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                The Foreman AI launch control stays visible to match the approved mock, but it is not
                wired to a live workflow yet. Use the live grid and list routes for the operational work.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                type="button"
                onClick={handleGridView}
                className="rounded-2xl bg-slate-950 px-5 text-white hover:bg-slate-800"
              >
                <Grid3X3 className="h-4 w-4" />
                Open Grid View
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled
                className="rounded-2xl border-black/10 bg-white/70 px-5 shadow-sm"
              >
                Launch Foreman AI
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
