import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { WorkOrderData, CreateWorkOrderDTO, UpdateWorkOrderDTO } from '@fencetastic/shared';

export function useWorkOrder(projectId: string) {
  const [workOrder, setWorkOrder] = useState<WorkOrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get(`/projects/${projectId}/work-order`);
      setWorkOrder(res.data.data);
    } catch {
      setWorkOrder(null);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (dto: CreateWorkOrderDTO) => {
    const res = await api.post(`/projects/${projectId}/work-order`, dto);
    await fetch();
    return res.data.data as WorkOrderData;
  };

  const update = async (workOrderId: string, dto: UpdateWorkOrderDTO) => {
    await api.patch(`/work-orders/${workOrderId}`, dto);
    await fetch();
  };

  const generatePdf = async (workOrderId: string, drawingImage: string) => {
    const res = await api.post(
      `/work-orders/${workOrderId}/pdf`,
      { drawingImage },
      { responseType: 'blob' },
    );
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `work-order-${workOrderId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return { workOrder, isLoading, create, update, generatePdf, refetch: fetch };
}
