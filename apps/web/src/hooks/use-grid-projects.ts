import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { GridProjectRow, ProjectListQuery } from '@fencetastic/shared';

export function useGridProjects(query: ProjectListQuery = {}) {
  const [data, setData] = useState<GridProjectRow[]>([]);
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; totalPages: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryKey = JSON.stringify(query);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      const q: ProjectListQuery = JSON.parse(queryKey);
      if (q.page) params.set('page', String(q.page));
      if (q.limit) params.set('limit', String(q.limit));
      if (q.sortBy) params.set('sortBy', q.sortBy);
      if (q.sortDir) params.set('sortDir', q.sortDir);
      if (q.status) params.set('status', q.status);
      if (q.fenceType) params.set('fenceType', q.fenceType);
      if (q.search) params.set('search', q.search);
      if (q.dateFrom) params.set('dateFrom', q.dateFrom);
      if (q.dateTo) params.set('dateTo', q.dateTo);
      const res = await api.get(`/projects/grid?${params.toString()}`);
      setData(res.data.data);
      setPagination(res.data.pagination);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, [queryKey]);

  useEffect(() => { setIsLoading(true); fetchData(); }, [fetchData]);

  return { data, pagination, isLoading, error, refetch: fetchData };
}
