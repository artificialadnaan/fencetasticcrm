import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '@/hooks/use-projects';
import { DataTable } from '@/components/projects/data-table';
import { projectColumns } from '@/components/projects/columns';
import { DataTableToolbar } from '@/components/projects/data-table-toolbar';
import { DataTablePagination } from '@/components/projects/data-table-pagination';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import type { ProjectListItem, ProjectListQuery } from '@fencetastic/shared';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState<ProjectListQuery>({
    page: 1,
    limit: 20,
    sortBy: 'installDate',
    sortDir: 'desc',
  });

  const { data, pagination, isLoading, refetch } = useProjects(query);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage all your fencing projects.
          </p>
        </div>
        <CreateProjectDialog onCreated={refetch} />
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
