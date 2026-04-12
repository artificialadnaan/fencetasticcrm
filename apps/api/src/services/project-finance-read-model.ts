import { FinanceFieldSource } from '@fencetastic/shared';
import { deriveFinanceProjectMode } from './project-finance-provenance';

type ResolveFinanceFieldInput = {
  importedValue: number | null;
  computedValue: number | null;
  manualOverrideValue: number | null;
  fieldSource: FinanceFieldSource;
};

export function resolveFinanceField(input: ResolveFinanceFieldInput) {
  if (
    input.fieldSource === FinanceFieldSource.MANUAL_OVERRIDE &&
    input.manualOverrideValue !== null
  ) {
    return {
      value: input.manualOverrideValue,
      source: FinanceFieldSource.MANUAL_OVERRIDE,
    };
  }

  if (
    (input.fieldSource === FinanceFieldSource.IMPORTED_ACTUAL ||
      input.fieldSource === FinanceFieldSource.IMPORTED_DERIVED) &&
    input.importedValue !== null
  ) {
    return {
      value: input.importedValue,
      source: input.fieldSource,
    };
  }

  return {
    value: input.computedValue,
    source: FinanceFieldSource.CRM_COMPUTED,
  };
}

export { deriveFinanceProjectMode };
