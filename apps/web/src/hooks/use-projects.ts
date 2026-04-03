import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { ProjectListItem, ProjectListQuery, PaginatedResponse } from '@fencetastic/shared';

const POLLING_INTERVAL_MS = 30000;

interface UseProjectsReturn {
  data: ProjectListItem[];
  pagination: PaginatedResponse<ProjectListItem>['pagination'] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useProjects(query: ProjectListQuery = {}): UseProjectsReturn {
  const [data, setData] = useState<ProjectListItem[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<ProjectListItem>['pagination'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Serialize query to a stable string for dependency tracking
  const queryKey = JSON.stringify(query);

  const fetchProjects = useCallback(async () => {
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

      const res = await api.get(`/projects?${params.toString()}`);
      setData(res.data.data);
      setPagination(res.data.pagination);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load projects';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [queryKey]);

  useEffect(() => {
    setIsLoading(true);
    fetchProjects();
  }, [fetchProjects]);

  // Polling
  useEffect(() => {
    const interval = setInterval(fetchProjects, POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchProjects]);

  return { data, pagination, isLoading, error, refetch: fetchProjects };
}
