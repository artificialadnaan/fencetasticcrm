import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid3X3 } from 'lucide-react';
import { useProjects } from '@/hooks/use-projects';
import { DataTable } from '@/components/projects/data-table';
import { projectColumns } from '@/components/projects/columns';
import { DataTableToolbar } from '@/components/projects/data-table-toolbar';
import { DataTablePagination } from '@/components/projects/data-table-pagination';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { ProjectListItem, ProjectListQuery } from '@fencetastic/shared';

const STATUS_TABS = [
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Closed', value: 'CLOSED' },
  { label: 'Warranty', value: 'WARRANTY' },
  { label: 'All', value: '' },
];

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('OPEN');
  const [query, setQuery] = useState<ProjectListQuery>({
    page: 1,
    limit: 20,
    sortBy: 'installDate',
    sortDir: 'desc',
    status: 'OPEN' as ProjectListQuery['status'],
  });

  const { data, pagination, isLoading, error, refetch } = useProjects(query);

  const handleSearchChange = useCallback((search: string) => {
    setQuery((prev) => ({ ...prev, search: search || undefined, page: 1 }));
  }, []);

  const handleStatusChange = useCallback((status: string) => {
    setQuery((prev) => ({
      ...prev,
      status: status === 'ALL' ? undefined : (status as ProjectListQuery['status']),
      page: 1,
    }));
  }, []);

  const handleFenceTypeChange = useCallback((fenceType: string) => {
    setQuery((prev) => ({
      ...prev,
      fenceType: fenceType === 'ALL' ? undefined : (fenceType as ProjectListQuery['fenceType']),
      page: 1,
    }));
  }, []);

  const handleReset = useCallback(() => {
    setQuery({ page: 1, limit: 20, sortBy: 'installDate', sortDir: 'desc' });
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setQuery((prev) => ({ ...prev, page }));
  }, []);

  const handleRowClick = useCallback(
    (row: ProjectListItem) => {
      navigate(`/projects/${row.id}`);
    },
    [navigate]
  );

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground mt-1">Manage all your fencing projects.</p>
          </div>
          <CreateProjectDialog onCreated={refetch} />
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <p className="text-destructive">Failed to load projects. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage all your fencing projects.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/projects/grid')}>
            <Grid3X3 className="h-4 w-4 mr-1" />Grid View
          </Button>
          <CreateProjectDialog onCreated={refetch} />
        </div>
      </div>

      <div className="flex gap-1 border-b">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setActiveTab(tab.value);
              setQuery((prev) => ({
                ...prev,
                status: tab.value ? (tab.value as ProjectListQuery['status']) : undefined,
                page: 1,
              }));
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.value
                ? 'border-brand-purple text-brand-purple'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DataTableToolbar
        search={query.search || ''}
        onSearchChange={handleSearchChange}
        statusFilter={query.status || 'ALL'}
        onStatusChange={handleStatusChange}
        fenceTypeFilter={query.fenceType || 'ALL'}
        onFenceTypeChange={handleFenceTypeChange}
        onReset={handleReset}
      />

      <DataTable
        columns={projectColumns}
        data={data}
        isLoading={isLoading}
        onRowClick={handleRowClick}
      />

      {pagination && (
        <DataTablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
