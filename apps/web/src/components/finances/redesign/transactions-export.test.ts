import { describe, expect, it } from 'vitest';
import { buildTransactionsExportParams } from './transactions-export';
import { TransactionType } from '@fencetastic/shared';

describe('buildTransactionsExportParams', () => {
  it('includes all active list filters in the export query', () => {
    const params = buildTransactionsExportParams({
      page: 2,
      limit: 20,
      type: TransactionType.EXPENSE,
      search: 'oak',
      category: 'Materials',
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
    });

    expect(params.toString()).toBe(
      'type=EXPENSE&category=Materials&search=oak&dateFrom=2026-04-01&dateTo=2026-04-30'
    );
  });
});
