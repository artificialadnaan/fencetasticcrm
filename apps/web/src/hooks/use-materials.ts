import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { MaterialLineItem, CreateMaterialLineItemDTO, UpdateMaterialLineItemDTO } from '@fencetastic/shared';

// --- Project Materials ---

interface UseProjectMaterialsReturn {
  data: MaterialLineItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useProjectMaterials(projectId: string): UseProjectMaterialsReturn {
  const [data, setData] = useState<MaterialLineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get(`/projects/${projectId}/materials`);
      setData(res.data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load materials');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setIsLoading(true);
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

// --- Create Materials ---

interface UseCreateMaterialsReturn {
  mutate: (projectId: string, items: CreateMaterialLineItemDTO[]) => Promise<void>;
  isLoading: boolean;
}

export function useCreateMaterials(): UseCreateMaterialsReturn {
  const [isLoading, setIsLoading] = useState(false);

  const mutate = useCallback(async (projectId: string, items: CreateMaterialLineItemDTO[]) => {
    setIsLoading(true);
    try {
      await api.post(`/projects/${projectId}/materials`, { items });
      toast.success(`${items.length} material${items.length > 1 ? 's' : ''} added`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add materials');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, isLoading };
}

// --- Update Material ---

interface UseUpdateMaterialReturn {
  mutate: (id: string, dto: UpdateMaterialLineItemDTO) => Promise<void>;
  isLoading: boolean;
}

export function useUpdateMaterial(): UseUpdateMaterialReturn {
  const [isLoading, setIsLoading] = useState(false);

  const mutate = useCallback(async (id: string, dto: UpdateMaterialLineItemDTO) => {
    setIsLoading(true);
    try {
      await api.patch(`/materials/${id}`, dto);
      toast.success('Material updated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update material');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, isLoading };
}

// --- Delete Material ---

interface UseDeleteMaterialReturn {
  mutate: (id: string) => Promise<void>;
  isLoading: boolean;
}

export function useDeleteMaterial(): UseDeleteMaterialReturn {
  const [isLoading, setIsLoading] = useState(false);

  const mutate = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      await api.delete(`/materials/${id}`);
      toast.success('Material deleted');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete material');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, isLoading };
}

// --- Eligible Transactions ---

interface EligibleTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  payee: string | null;
  category: string;
}

export function useEligibleTransactions(projectId: string) {
  const [data, setData] = useState<EligibleTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get(`/projects/${projectId}/materials/eligible-transactions`);
      setData(res.data.data);
    } catch { /* silent — supplementary data */ }
    finally { setIsLoading(false); }
  }, [projectId]);

  useEffect(() => { setIsLoading(true); fetch(); }, [fetch]);

  return { data, isLoading, refetch: fetch };
}

// --- Project Financial Summary ---

interface ProjectFinancialSummary {
  materials: number;
  materialLineItemCount: number;
  subcontractors: number;
  otherExpenses: number;
  commissionsAdnaan: number;
  commissionsMeme: number;
  totalCommissions: number;
  revenue: number;
  profit: number;
  marginPct: number;
  isLegacyMaterials: boolean;
}

interface UseProjectFinancialSummaryReturn {
  data: ProjectFinancialSummary | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useProjectFinancialSummary(projectId: string): UseProjectFinancialSummaryReturn {
  const [data, setData] = useState<ProjectFinancialSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get(`/projects/${projectId}/materials/summary`);
      setData(res.data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load financial summary');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setIsLoading(true);
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

/** @deprecated Use useProjectFinancialSummary instead */
export function useProjectMaterialSummary(projectId: string) {
  return useProjectFinancialSummary(projectId);
}
