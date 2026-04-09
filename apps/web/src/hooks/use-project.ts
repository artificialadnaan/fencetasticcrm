import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { ProjectDetail } from '@fencetastic/shared';

const POLLING_INTERVAL_MS = 30000;

interface UseProjectReturn {
  project: ProjectDetail | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useProject(projectId: string | undefined): UseProjectReturn {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    try {
      setError(null);
      const res = await api.get(`/projects/${projectId}`);
      setProject(res.data.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load project';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setIsLoading(true);
    fetchProject();
  }, [fetchProject]);

  // Polling — paused when tab is backgrounded; refetch immediately on tab focus
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchProject();
      }
    }, POLLING_INTERVAL_MS);

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        fetchProject();
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchProject]);

  return { project, isLoading, error, refetch: fetchProject };
}
