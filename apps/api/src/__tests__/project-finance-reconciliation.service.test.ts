import { describe, expect, it } from 'vitest';
import { matchImportedProject } from '../services/project-finance-reconciliation.service';

describe('project finance reconciliation', () => {
  it('matches by customer+address first, then customer+contract date', () => {
    const result = matchImportedProject(
      { customer: 'Jane Smith', address: '1 Main St', contractDate: '2026-01-05' },
      [
        { id: '1', customer: 'Jane Smith', address: '1 Main St', contractDate: '2026-01-05' },
      ],
    );

    expect(result.matchType).toBe('CUSTOMER_ADDRESS');
    expect(result.status).toBe('MATCHED');
  });

  it('marks ambiguous matches as reconciliation required', () => {
    const result = matchImportedProject(
      { customer: 'Jane Smith', address: '1 Main St', contractDate: '2026-01-05' },
      [
        { id: '1', customer: 'Jane Smith', address: '1 Main St', contractDate: '2026-01-05' },
        { id: '2', customer: 'Jane Smith', address: '1 Main St', contractDate: '2026-01-05' },
      ],
    );

    expect(result.status).toBe('RECONCILIATION_REQUIRED');
  });

  it('fails closed when one matcher is ambiguous even if another matcher is unique', () => {
    const result = matchImportedProject(
      { customer: 'Jane Smith', address: '1 Main St', contractDate: '2026-01-05' },
      [
        { id: '1', customer: 'Jane Smith', address: '1 Main St', contractDate: '2026-02-01' },
        { id: '2', customer: 'Jane Smith', address: '1 Main St', contractDate: '2026-03-01' },
        { id: '3', customer: 'Jane Smith', address: '99 Other St', contractDate: '2026-01-05' },
      ],
    );

    expect(result.status).toBe('RECONCILIATION_REQUIRED');
    expect(result.projectId).toBeNull();
  });
});
