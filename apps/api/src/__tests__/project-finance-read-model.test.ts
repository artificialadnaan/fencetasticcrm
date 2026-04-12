import { describe, expect, it } from 'vitest';
import {
  deriveFinanceProjectMode,
  resolveFinanceField,
} from '../services/project-finance-read-model';

describe('project finance read model', () => {
  it('marks a project for reconciliation when any subdomain is unresolved', () => {
    expect(
      deriveFinanceProjectMode({
        receivablesSource: 'RECONCILIATION_REQUIRED',
        payablesSource: 'IMPORTED_ACTUAL',
        commissionsSource: 'IMPORTED_ACTUAL',
        profitabilitySource: 'IMPORTED_ACTUAL',
        lastManualFinanceEditAt: null,
      }),
    ).toBe('RECONCILIATION_REQUIRED');
  });

  it('prefers imported derived outputs over computed projections for imported projects', () => {
    expect(
      resolveFinanceField({
        importedValue: 17159.52,
        computedValue: 12000,
        manualOverrideValue: null,
        fieldSource: 'IMPORTED_DERIVED',
      }),
    ).toEqual({ value: 17159.52, source: 'IMPORTED_DERIVED' });
  });
});
