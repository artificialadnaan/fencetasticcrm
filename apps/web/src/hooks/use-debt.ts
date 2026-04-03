import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { DebtBalanceResponse, DebtLedgerEntry, DebtAdjustmentDTO } from '@fencetastic/shared';

const POLLING_INTERVAL_MS = 30000;

// --- Debt Balance ---

interface UseDebtBalanceReturn {
  balance: number | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDebtBalance(): UseDebtBalanceReturn {
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get<{ data: DebtBalanceResponse }>('/debt/balance');
      setBalance(res.data.data?.balance ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load debt balance');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadData();
  }, [loadData]);

  useEffect(() => {
    const interval = setInterval(loadData, POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadData]);

  return { balance, isLoading, error, refetch: loadData };
}

// --- Debt Ledger ---

interface UseDebtLedgerReturn {
  data: DebtLedgerEntry[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDebtLedger(): UseDebtLedgerReturn {
  const [data, setData] = useState<DebtLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get<{ data: DebtLedgerEntry[] }>('/debt/ledger');
      setData(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load debt ledger');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadData();
  }, [loadData]);

  useEffect(() => {
    const interval = setInterval(loadData, POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadData]);

  return { data, isLoading, error, refetch: loadData };
}

// --- Debt Adjustment (mutation only) ---

interface UseDebtAdjustmentReturn {
  submit: (dto: DebtAdjustmentDTO) => Promise<DebtLedgerEntry>;
  isSubmitting: boolean;
  error: string | null;
}

export function useDebtAdjustment(): UseDebtAdjustmentReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (dto: DebtAdjustmentDTO): Promise<DebtLedgerEntry> => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await api.post<{ data: DebtLedgerEntry }>('/debt/adjustment', dto);
      return res.data.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save adjustment';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { submit, isSubmitting, error };
}
