import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type {
  Transaction,
  TransactionListQuery,
  TransactionSummary,
  PaginatedResponse,
} from '@fencetastic/shared';

// ---------------------------------------------------------------------------
// useTransactions
// ---------------------------------------------------------------------------

interface UseTransactionsReturn {
  data: Transaction[];
  pagination: PaginatedResponse<Transaction>['pagination'] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTransactions(query: TransactionListQuery = {}): UseTransactionsReturn {
  const [data, setData] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<Transaction>['pagination'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryKey = JSON.stringify(query);

  const fetchTransactions = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      const q: TransactionListQuery = JSON.parse(queryKey);
      if (q.page) params.set('page', String(q.page));
      if (q.limit) params.set('limit', String(q.limit));
      if (q.type) params.set('type', q.type);
      if (q.category) params.set('category', q.category);
      if (q.projectId) params.set('projectId', q.projectId);
      if (q.dateFrom) params.set('dateFrom', q.dateFrom);
      if (q.dateTo) params.set('dateTo', q.dateTo);

      const res = await api.get(`/transactions?${params.toString()}`);
      setData(res.data.data);
      setPagination(res.data.pagination);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load transactions';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [queryKey]);

  useEffect(() => {
    setIsLoading(true);
    fetchTransactions();
  }, [fetchTransactions]);

  return { data, pagination, isLoading, error, refetch: fetchTransactions };
}

// ---------------------------------------------------------------------------
// useTransactionSummary
// ---------------------------------------------------------------------------

interface UseTransactionSummaryReturn {
  summary: TransactionSummary | null;
  isLoading: boolean;
}

export function useTransactionSummary(period: 'mtd' | 'ytd' = 'mtd'): UseTransactionSummaryReturn {
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    api
      .get(`/transactions/summary?period=${period}`)
      .then((res) => {
        if (!cancelled) setSummary(res.data.data);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  return { summary, isLoading };
}

// ---------------------------------------------------------------------------
// useMonthlyBreakdown
// ---------------------------------------------------------------------------

export interface MonthlyBreakdown {
  month: string;
  income: number;
  expenses: number;
}

interface UseMonthlyBreakdownReturn {
  data: MonthlyBreakdown[];
  isLoading: boolean;
}

export function useMonthlyBreakdown(): UseMonthlyBreakdownReturn {
  const [data, setData] = useState<MonthlyBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    api
      .get('/transactions/monthly')
      .then((res) => {
        if (!cancelled) setData(res.data.data);
      })
      .catch(() => {
        if (!cancelled) setData([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, isLoading };
}

// ---------------------------------------------------------------------------
// useCategoryBreakdown
// ---------------------------------------------------------------------------

export interface CategoryBreakdown {
  category: string;
  total: number;
}

interface UseCategoryBreakdownReturn {
  data: CategoryBreakdown[];
  isLoading: boolean;
}

export function useCategoryBreakdown(): UseCategoryBreakdownReturn {
  const [data, setData] = useState<CategoryBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    api
      .get('/transactions/categories')
      .then((res) => {
        if (!cancelled) setData(res.data.data);
      })
      .catch(() => {
        if (!cancelled) setData([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, isLoading };
}
