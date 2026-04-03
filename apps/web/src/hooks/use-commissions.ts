import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type {
  CommissionSummary,
  CommissionByProject,
  PipelineProjectionSummary,
  PaginatedResponse,
} from '@fencetastic/shared';

const POLLING_INTERVAL_MS = 30000;

// --- Commission Summary ---

interface UseCommissionSummaryReturn {
  data: CommissionSummary | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCommissionSummary(): UseCommissionSummaryReturn {
  const [data, setData] = useState<CommissionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/commissions/summary');
      setData(res.data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load commission summary');
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

// --- Commission By Project ---

interface UseCommissionsByProjectReturn {
  data: CommissionByProject[];
  pagination: PaginatedResponse<CommissionByProject>['pagination'] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCommissionsByProject(
  page: number = 1,
  limit: number = 20
): UseCommissionsByProjectReturn {
  const [data, setData] = useState<CommissionByProject[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<CommissionByProject>['pagination'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      const res = await api.get(`/commissions/by-project?${params}`);
      setData(res.data.data);
      setPagination(res.data.pagination);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load commissions by project');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    setIsLoading(true);
    fetch();
  }, [fetch]);

  useEffect(() => {
    const interval = setInterval(fetch, POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetch]);

  return { data, pagination, isLoading, error, refetch: fetch };
}

// --- Commission Pipeline ---

interface UseCommissionPipelineReturn {
  data: PipelineProjectionSummary | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCommissionPipeline(): UseCommissionPipelineReturn {
  const [data, setData] = useState<PipelineProjectionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/commissions/pipeline');
      setData(res.data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load pipeline projections');
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
