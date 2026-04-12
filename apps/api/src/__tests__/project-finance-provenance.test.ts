import { describe, expect, it } from 'vitest';
import {
  FinanceFieldSource,
  FinanceProjectMode,
  FinanceSubdomainSource,
} from '@fencetastic/shared';

describe('finance provenance shared types', () => {
  it('exports stable provenance enums', () => {
    expect(FinanceProjectMode.IMPORTED).toBe('IMPORTED');
    expect(FinanceProjectMode.MIXED).toBe('MIXED');
    expect(FinanceSubdomainSource.IMPORTED_ACTUAL).toBe('IMPORTED_ACTUAL');
    expect(FinanceFieldSource.MANUAL_OVERRIDE).toBe('MANUAL_OVERRIDE');
  });
});
