import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { RateTemplate } from '@fencetastic/shared';

interface UseRateTemplatesReturn {
  templates: RateTemplate[];
  isLoading: boolean;
}

export function useRateTemplates(): UseRateTemplatesReturn {
  const [templates, setTemplates] = useState<RateTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await api.get('/rate-templates');
        setTemplates(res.data.data);
      } catch {
        // Silently fail — template list is non-critical
        setTemplates([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  return { templates, isLoading };
}
