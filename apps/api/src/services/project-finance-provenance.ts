import {
  FinanceProjectMode,
  FinanceSubdomainSource,
} from '@fencetastic/shared';

type FinanceModeInput = {
  receivablesSource: FinanceSubdomainSource;
  payablesSource: FinanceSubdomainSource;
  commissionsSource: FinanceSubdomainSource;
  profitabilitySource: FinanceSubdomainSource;
  lastManualFinanceEditAt: Date | null;
};

export function deriveFinanceProjectMode(input: FinanceModeInput): FinanceProjectMode {
  const sources = [
    input.receivablesSource,
    input.payablesSource,
    input.commissionsSource,
    input.profitabilitySource,
  ];

  if (sources.includes(FinanceSubdomainSource.RECONCILIATION_REQUIRED)) {
    return FinanceProjectMode.RECONCILIATION_REQUIRED;
  }

  if (new Set(sources).size > 1) {
    return FinanceProjectMode.MIXED;
  }

  if (input.lastManualFinanceEditAt) {
    return FinanceProjectMode.MANUAL_OVERRIDE;
  }

  if (sources.every((source) => source === FinanceSubdomainSource.IMPORTED_ACTUAL)) {
    return FinanceProjectMode.IMPORTED;
  }

  return FinanceProjectMode.COMPUTED;
}
