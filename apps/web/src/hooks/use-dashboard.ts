import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { DashboardData } from '@fencetastic/shared';

const POLLING_INTERVAL_MS = 30000;

interface UseDashboardReturn {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDashboard(): UseDashboardReturn {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/dashboard');
      setData(res.data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetch();
  }, [fetch]);

  useEffect(() => {
    const interval = setInterval(fetch, POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}
