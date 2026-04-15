import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { FinanceTrustOverview } from '@fencetastic/shared';

interface UseFinanceTrustResult {
  data: FinanceTrustOverview | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useFinanceTrust(): UseFinanceTrustResult {
  const [data, setData] = useState<FinanceTrustOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFinanceTrust = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/finance-trust');
      setData(response.data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load finance trust data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchFinanceTrust();
  }, [fetchFinanceTrust]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchFinanceTrust,
  };
}
