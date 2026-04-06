import { api } from '@/lib/api';
import type { ProjectListQuery } from '@fencetastic/shared';

export function buildProjectsExportParams(query: ProjectListQuery) {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.fenceType) params.set('fenceType', query.fenceType);
  if (query.search) params.set('search', query.search);
  if (query.dateFrom) params.set('dateFrom', query.dateFrom);
  if (query.dateTo) params.set('dateTo', query.dateTo);
  if (query.sortBy) params.set('sortBy', query.sortBy);
  if (query.sortDir) params.set('sortDir', query.sortDir);
  return params;
}

export async function exportProjects(query: ProjectListQuery, client: { get: typeof api.get } = api) {
  const params = buildProjectsExportParams(query);
  const response = await client.get(`/projects/export?${params.toString()}`, {
    responseType: 'blob',
  });
  return response.data as Blob;
}
