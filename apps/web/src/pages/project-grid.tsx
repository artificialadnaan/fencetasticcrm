import { useCallback, useMemo, useState } from 'react';
import { Download, Plus, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  PROJECT_STATUS_META,
  PROJECT_STATUS_ORDER,
  ProjectStatus,
  type ProjectListQuery,
} from '@fencetastic/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { useGridProjects } from '@/hooks/use-grid-projects';
import { usePageShell } from '@/components/layout/page-shell';
import { api } from '@/lib/api';
import { exportProjects } from '@/components/projects/redesign/projects-export';
import { GridViewSummaryStrip } from '@/components/projects/redesign-grid/grid-view-summary';
import { GridViewTable } from '@/components/projects/redesign-grid/grid-view-table';

const STATUS_TABS: Array<{ label: string; value: ProjectStatus | 'ALL' }> = [
  ...PROJECT_STATUS_ORDER.map((status) => ({
    label: PROJECT_STATUS_META[status].shortLabel,
    value: status,
  })),
  { label: 'All', value: 'ALL' },
];

const DEFAULT_QUERY: ProjectListQuery = {
  page: 1,
  limit: 100,
  sortBy: 'installDate',
  sortDir: 'desc',
};

export default function ProjectGridPage() {
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [query, setQuery] = useState<ProjectListQuery>(DEFAULT_QUERY);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  const { data, pagination, isLoading, error, refetch } = useGridProjects(query);

  const activeStatus = query.status ?? 'ALL';
  const hasActiveFilters = Boolean(query.search || query.status || query.dateFrom || query.dateTo);
  const selectedCount = Object.keys(rowSelection).length;

  const handleSearchChange = useCallback((search: string) => {
    setQuery((prev) => ({
      ...prev,
      search: search.trim() ? search : undefined,
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

  const handleOpenProject = useCallback(
    (projectId: string) => {
      navigate(`/projects/${projectId}`);
    },
    [navigate]
  );

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
      console.error('Failed to export grid projects', err);
    }
  }, [query.dateFrom, query.dateTo, query.search, query.sortBy, query.sortDir, query.status]);

  const searchSlot = useMemo(
    () => (
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:w-[320px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query.search ?? ''}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Search customer, address, or subcontractor..."
            className="h-10 rounded-2xl border-black/10 bg-white/80 pl-10 shadow-sm placeholder:text-slate-400"
          />
        </div>

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
    [handleClearFilters, handleSearchChange, hasActiveFilters, query.search]
  );

  const primaryActions = useMemo(
    () => (
      <Button
        type="button"
        onClick={() => setIsCreateOpen(true)}
        className="rounded-2xl bg-slate-950 px-4 text-white hover:bg-slate-800"
      >
        <Plus className="h-4 w-4" />
        Add New
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

  usePageShell({
    eyebrow: 'Pipeline Operations',
    title: 'Grid View',
    subtitle: 'Spreadsheet-first project workspace with inline edits, filters, totals, and fast detail access.',
    searchSlot,
    primaryActions,
    secondaryActions,
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
                  className={[
                    'rounded-2xl px-4 py-2 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]'
                      : 'text-slate-600 hover:bg-white hover:text-slate-950',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <GridViewSummaryStrip
          projects={data}
          pagination={pagination}
          isLoading={isLoading}
          error={error}
          selectedCount={selectedCount}
        />

        <GridViewTable
          projects={data}
          pagination={pagination}
          isLoading={isLoading}
          error={error}
          refetch={refetch}
          onPageChange={handlePageChange}
          onRetry={refetch}
          onClearFilters={handleClearFilters}
          onOpenProject={handleOpenProject}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          selectedCount={selectedCount}
        />
      </div>
    </>
  );
}
