import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { MonthlyPLRow, ProjectStatsData, ReceivablesAgingData } from '@fencetastic/shared';

// --- Monthly P&L ---

interface UseMonthlyPLReturn {
  data: MonthlyPLRow[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useMonthlyPL(months: number = 6): UseMonthlyPLReturn {
  const [data, setData] = useState<MonthlyPLRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get(`/reports/monthly-pl?months=${months}`);
      setData(res.data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load monthly P&L');
    } finally {
      setIsLoading(false);
    }
  }, [months]);

  useEffect(() => {
    setIsLoading(true);
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

// --- Project Stats ---

interface UseProjectStatsReturn {
  data: ProjectStatsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useProjectStats(): UseProjectStatsReturn {
  const [data, setData] = useState<ProjectStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/reports/project-stats');
      setData(res.data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load project stats');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

// --- Receivables Aging ---

interface UseReceivablesAgingReturn {
  data: ReceivablesAgingData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useReceivablesAging(): UseReceivablesAgingReturn {
  const [data, setData] = useState<ReceivablesAgingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/reports/receivables');
      setData(res.data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load receivables aging');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}
