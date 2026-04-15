import { useState, useEffect, useCallback } from 'react';
import type { FinanceRiskOverview } from '@fencetastic/shared';
import { api } from '@/lib/api';

interface UseFinanceRiskReturn {
  data: FinanceRiskOverview | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFinanceRisk(): UseFinanceRiskReturn {
  const [data, setData] = useState<FinanceRiskOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/finance-risk');
      setData(res.data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load cash risk');
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
