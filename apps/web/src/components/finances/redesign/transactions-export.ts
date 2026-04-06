import { api } from '@/lib/api';
import type { TransactionListQuery } from '@fencetastic/shared';

export function buildTransactionsExportParams(query: TransactionListQuery) {
  const params = new URLSearchParams();

  if (query.type) params.set('type', query.type);
  if (query.category) params.set('category', query.category);
  if (query.search) params.set('search', query.search);
  if (query.projectId) params.set('projectId', query.projectId);
  if (query.dateFrom) params.set('dateFrom', query.dateFrom);
  if (query.dateTo) params.set('dateTo', query.dateTo);

  return params;
}

export async function exportTransactions(
  query: TransactionListQuery,
  client: { get: typeof api.get } = api
) {
  const params = buildTransactionsExportParams(query);
  const response = await client.get(`/transactions/export?${params.toString()}`, {
    responseType: 'blob',
  });

  return response.data as Blob;
}
