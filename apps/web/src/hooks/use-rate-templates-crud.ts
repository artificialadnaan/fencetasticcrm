import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { RateTemplate, CreateRateTemplateDTO, UpdateRateTemplateDTO } from '@fencetastic/shared';

interface UseRateTemplatesCrudReturn {
  templates: RateTemplate[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  createTemplate: (dto: CreateRateTemplateDTO) => Promise<void>;
  updateTemplate: (id: string, dto: UpdateRateTemplateDTO) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
}

export function useRateTemplatesCrud(): UseRateTemplatesCrudReturn {
  const [templates, setTemplates] = useState<RateTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/rate-templates');
      setTemplates(res.data.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load rate templates';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = useCallback(
    async (dto: CreateRateTemplateDTO) => {
      await api.post('/rate-templates', dto);
      await fetchTemplates();
    },
    [fetchTemplates]
  );

  const updateTemplate = useCallback(
    async (id: string, dto: UpdateRateTemplateDTO) => {
      await api.patch(`/rate-templates/${id}`, dto);
      await fetchTemplates();
    },
    [fetchTemplates]
  );

  const deleteTemplate = useCallback(
    async (id: string) => {
      await api.delete(`/rate-templates/${id}`);
      await fetchTemplates();
    },
    [fetchTemplates]
  );

  return { templates, isLoading, error, refetch: fetchTemplates, createTemplate, updateTemplate, deleteTemplate };
}
