export type ImportedCommissionSnapshotSeed = {
  moneyReceived: number | null;
  commissionOwed: number | null;
  memesCommission: number | null;
  aimannsCommission: number | null;
  importedGrossProfit: number | null;
  importedNetProfit: number | null;
};

export type ImportedDebtBalanceSnapshot = {
  debtBalanceBefore: number;
  debtBalanceAfter: number;
};

export type ImportedDebtLedgerPoint = {
  date: Date;
  runningBalance: number;
};

export type ImportedCommissionSnapshotData = {
  moneyReceived: number;
  totalExpenses: number;
  adnaanCommission: number;
  memeCommission: number;
  grossProfit: number;
  aimannDeduction: number;
  debtBalanceBefore: number;
  debtBalanceAfter: number;
  netProfit: number;
};

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

export function resolveImportedSnapshotSettledAt(input: {
  completedDate: Date | null;
  installDate: Date | null;
  contractDate: Date;
}) {
  return input.completedDate ?? input.installDate ?? input.contractDate;
}

export function resolveImportedSnapshotDebtBalances(input: {
  settledAt: Date;
  aimannDeduction: number;
  ledger: ImportedDebtLedgerPoint[];
}): ImportedDebtBalanceSnapshot | null {
  const ledger = [...input.ledger].sort((left, right) => left.date.getTime() - right.date.getTime());
  const nextEntry = ledger.find((entry) => entry.date.getTime() >= input.settledAt.getTime());

  if (nextEntry) {
    return {
      debtBalanceBefore: roundMoney(nextEntry.runningBalance + input.aimannDeduction),
      debtBalanceAfter: roundMoney(nextEntry.runningBalance),
    };
  }

  for (let index = ledger.length - 1; index >= 0; index -= 1) {
    const entry = ledger[index];
    if (entry.date.getTime() <= input.settledAt.getTime()) {
      return {
        debtBalanceBefore: roundMoney(entry.runningBalance),
        debtBalanceAfter: roundMoney(Math.max(entry.runningBalance - input.aimannDeduction, 0)),
      };
    }
  }

  return null;
}

export function shouldBackfillCompletedImportedSnapshot(importedSource: string) {
  return importedSource.trim().toLowerCase() === 'completed projects';
}

export function buildImportedCommissionSnapshot(
  seed: ImportedCommissionSnapshotSeed,
  debtBalances: ImportedDebtBalanceSnapshot | null = null,
): ImportedCommissionSnapshotData | null {
  if (
    seed.moneyReceived === null ||
    seed.commissionOwed === null ||
    seed.memesCommission === null ||
    seed.aimannsCommission === null ||
    seed.importedGrossProfit === null ||
    seed.importedNetProfit === null
  ) {
    return null;
  }

  if (debtBalances === null) {
    return null;
  }

  return {
    moneyReceived: seed.moneyReceived,
    totalExpenses: roundMoney(seed.moneyReceived - seed.importedGrossProfit),
    adnaanCommission: seed.commissionOwed,
    memeCommission: seed.memesCommission,
    grossProfit: seed.importedGrossProfit,
    aimannDeduction: seed.aimannsCommission,
    debtBalanceBefore: debtBalances.debtBalanceBefore,
    debtBalanceAfter: debtBalances.debtBalanceAfter,
    netProfit: seed.importedNetProfit,
  };
}
