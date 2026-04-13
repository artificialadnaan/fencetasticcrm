import { describe, expect, it } from 'vitest';
import { FinanceFieldSource, FinanceSubdomainSource } from '@fencetastic/shared';
import {
  deriveFinanceProjectMode,
  resolveFinanceField,
} from '../services/project-finance-read-model';

describe('project finance read model', () => {
  it('marks a project for reconciliation when any subdomain is unresolved', () => {
    expect(
      deriveFinanceProjectMode({
        receivablesSource: FinanceSubdomainSource.RECONCILIATION_REQUIRED,
        payablesSource: FinanceSubdomainSource.IMPORTED_ACTUAL,
        commissionsSource: FinanceSubdomainSource.IMPORTED_ACTUAL,
        profitabilitySource: FinanceSubdomainSource.IMPORTED_ACTUAL,
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
        fieldSource: FinanceFieldSource.IMPORTED_DERIVED,
      }),
    ).toEqual({ value: 17159.52, source: 'IMPORTED_DERIVED' });
  });

  it('surfaces unset imported values instead of silently falling back to computed values', () => {
    expect(
      resolveFinanceField({
        importedValue: null,
        computedValue: 12000,
        manualOverrideValue: null,
        fieldSource: FinanceFieldSource.IMPORTED_DERIVED,
      }),
    ).toEqual({ value: null, source: 'UNSET' });
  });

  it('surfaces unset computed values instead of misreporting them as computed', () => {
    expect(
      resolveFinanceField({
        importedValue: null,
        computedValue: null,
        manualOverrideValue: null,
        fieldSource: FinanceFieldSource.CRM_COMPUTED,
      }),
    ).toEqual({ value: null, source: 'UNSET' });
  });
});
