import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type {
  PnlReport,
  JobCostingRow,
  CommissionSummaryReport,
  ExpenseBreakdownReport,
  CashFlowRow,
} from '@fencetastic/shared';

interface DateRange {
  dateFrom: string;
  dateTo: string;
}

// --- P&L Report ---

interface UsePnlReportReturn {
  data: PnlReport | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePnlReport(range: DateRange, period: string = 'monthly'): UsePnlReportReturn {
  const [data, setData] = useState<PnlReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get(`/reports/pnl?dateFrom=${range.dateFrom}&dateTo=${range.dateTo}&period=${period}`);
      setData(res.data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load P&L report');
    } finally {
      setIsLoading(false);
    }
  }, [JSON.stringify(range), period]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setIsLoading(true);
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

// --- Job Costing Report ---

interface JobCostingParams extends DateRange {
  status?: string;
  fenceType?: string;
}

interface UseJobCostingReportReturn {
  data: JobCostingRow[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useJobCostingReport(params: JobCostingParams): UseJobCostingReportReturn {
  const [data, setData] = useState<JobCostingRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setError(null);
      const query = new URLSearchParams({
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        ...(params.status != null && { status: params.status }),
        ...(params.fenceType != null && { fenceType: params.fenceType }),
      });
      const res = await api.get(`/reports/job-costing?${query.toString()}`);
      setData(res.data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load job costing report');
    } finally {
      setIsLoading(false);
    }
  }, [JSON.stringify(params)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setIsLoading(true);
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

// --- Commission Report ---

interface UseCommissionReportReturn {
  data: CommissionSummaryReport | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCommissionReport(range: DateRange): UseCommissionReportReturn {
  const [data, setData] = useState<CommissionSummaryReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get(`/reports/commissions?dateFrom=${range.dateFrom}&dateTo=${range.dateTo}`);
      setData(res.data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load commission report');
    } finally {
      setIsLoading(false);
    }
  }, [JSON.stringify(range)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setIsLoading(true);
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

// --- Expense Report ---

interface UseExpenseReportReturn {
  data: ExpenseBreakdownReport | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useExpenseReport(range: DateRange): UseExpenseReportReturn {
  const [data, setData] = useState<ExpenseBreakdownReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get(`/reports/expenses?dateFrom=${range.dateFrom}&dateTo=${range.dateTo}`);
      setData(res.data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load expense report');
    } finally {
      setIsLoading(false);
    }
  }, [JSON.stringify(range)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setIsLoading(true);
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

// --- Cash Flow Report ---

interface UseCashFlowReportReturn {
  data: CashFlowRow[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCashFlowReport(range: DateRange): UseCashFlowReportReturn {
  const [data, setData] = useState<CashFlowRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get(`/reports/cash-flow?dateFrom=${range.dateFrom}&dateTo=${range.dateTo}`);
      setData(res.data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load cash flow report');
    } finally {
      setIsLoading(false);
    }
  }, [JSON.stringify(range)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setIsLoading(true);
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

// --- Export Report ---

interface UseExportReportReturn {
  exportCsv: () => Promise<void>;
  isExporting: boolean;
}

export function useExportReport(type: string, range: DateRange, extraParams?: Record<string, string>): UseExportReportReturn {
  const [isExporting, setIsExporting] = useState(false);

  const exportCsv = useCallback(async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
        ...extraParams,
      });
      const res = await api.get(
        `/reports/${type}/export?${params.toString()}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}-report.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }, [type, JSON.stringify(range), JSON.stringify(extraParams)]); // eslint-disable-line react-hooks/exhaustive-deps

  return { exportCsv, isExporting };
}
