import { describe, expect, it } from 'vitest';
import { matchImportedProject } from '../services/project-finance-reconciliation.service';

describe('project finance reconciliation', () => {
  it('matches by explicit legacy id first, then customer+address, then customer+contract date', () => {
    const result = matchImportedProject(
      { legacyId: 'A-17', customer: 'Jane Smith', address: '1 Main St', contractDate: '2026-01-05' },
      [
        { id: '1', legacyId: 'A-17', customer: 'Jane Smith', address: '1 Main St', contractDate: '2026-01-05' },
      ],
    );

    expect(result.matchType).toBe('LEGACY_ID');
    expect(result.status).toBe('MATCHED');
  });

  it('marks ambiguous matches as reconciliation required', () => {
    const result = matchImportedProject(
      { legacyId: null, customer: 'Jane Smith', address: '1 Main St', contractDate: '2026-01-05' },
      [
        { id: '1', legacyId: null, customer: 'Jane Smith', address: '1 Main St', contractDate: '2026-01-05' },
        { id: '2', legacyId: null, customer: 'Jane Smith', address: '1 Main St', contractDate: '2026-01-05' },
      ],
    );

    expect(result.status).toBe('RECONCILIATION_REQUIRED');
  });
});
