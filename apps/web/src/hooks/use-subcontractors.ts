import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { SubcontractorPayment } from '@fencetastic/shared';

interface UseSubcontractorsReturn {
  data: SubcontractorPayment[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  addSub: (dto: {
    subcontractorName: string;
    amountOwed: number;
    amountPaid?: number;
    datePaid?: string | null;
    notes?: string | null;
  }) => Promise<void>;
  updateSub: (
    id: string,
    dto: {
      subcontractorName?: string;
      amountOwed?: number;
      amountPaid?: number;
      datePaid?: string | null;
      notes?: string | null;
    }
  ) => Promise<void>;
  deleteSub: (id: string) => Promise<void>;
}

export function useSubcontractors(projectId: string | undefined): UseSubcontractorsReturn {
  const [data, setData] = useState<SubcontractorPayment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubs = useCallback(async () => {
    if (!projectId) return;
    try {
      setError(null);
      setIsLoading(true);
      const res = await api.get(`/projects/${projectId}`);
      setData(res.data.data.subcontractorPayments ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load subcontractors';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchSubs();
  }, [fetchSubs]);

  const addSub = useCallback(
    async (dto: {
      subcontractorName: string;
      amountOwed: number;
      amountPaid?: number;
      datePaid?: string | null;
      notes?: string | null;
    }) => {
      await api.post(`/projects/${projectId}/subs`, dto);
      await fetchSubs();
    },
    [projectId, fetchSubs]
  );

  const updateSub = useCallback(
    async (
      id: string,
      dto: {
        subcontractorName?: string;
        amountOwed?: number;
        amountPaid?: number;
        datePaid?: string | null;
        notes?: string | null;
      }
    ) => {
      await api.patch(`/subs/${id}`, dto);
      await fetchSubs();
    },
    [fetchSubs]
  );

  const deleteSub = useCallback(
    async (id: string) => {
      await api.delete(`/subs/${id}`);
      await fetchSubs();
    },
    [fetchSubs]
  );

  return { data, isLoading, error, refetch: fetchSubs, addSub, updateSub, deleteSub };
}
