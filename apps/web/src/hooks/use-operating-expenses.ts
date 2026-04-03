import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { OperatingExpense, CreateOperatingExpenseDTO, UpdateOperatingExpenseDTO } from '@fencetastic/shared';

interface UseOperatingExpensesReturn {
  expenses: OperatingExpense[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  createExpense: (dto: CreateOperatingExpenseDTO) => Promise<void>;
  updateExpense: (id: string, dto: UpdateOperatingExpenseDTO) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
}

export function useOperatingExpenses(): UseOperatingExpensesReturn {
  const [expenses, setExpenses] = useState<OperatingExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/operating-expenses');
      setExpenses(res.data.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load operating expenses';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const createExpense = useCallback(
    async (dto: CreateOperatingExpenseDTO) => {
      await api.post('/operating-expenses', dto);
      await fetchExpenses();
    },
    [fetchExpenses]
  );

  const updateExpense = useCallback(
    async (id: string, dto: UpdateOperatingExpenseDTO) => {
      await api.patch(`/operating-expenses/${id}`, dto);
      await fetchExpenses();
    },
    [fetchExpenses]
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      await api.delete(`/operating-expenses/${id}`);
      await fetchExpenses();
    },
    [fetchExpenses]
  );

  return { expenses, isLoading, error, refetch: fetchExpenses, createExpense, updateExpense, deleteExpense };
}
