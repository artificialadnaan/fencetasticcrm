import { describe, expect, it } from 'vitest';
import {
  buildImportedCommissionSnapshot,
  resolveImportedSnapshotDebtBalances,
  resolveImportedSnapshotSettledAt,
  shouldBackfillCompletedImportedSnapshot,
} from '../services/imported-finance-snapshot';

describe('imported finance snapshot helpers', () => {
  it('builds a completed imported snapshot without coercing legitimate zeroes away', () => {
    const snapshot = buildImportedCommissionSnapshot({
      moneyReceived: 10000,
      commissionOwed: 1000,
      memesCommission: 500,
      aimannsCommission: 0,
      importedGrossProfit: 3500,
      importedNetProfit: 3000,
    }, {
      debtBalanceBefore: 0,
      debtBalanceAfter: 0,
    });

    expect(snapshot).toEqual({
      moneyReceived: 10000,
      totalExpenses: 6500,
      adnaanCommission: 1000,
      memeCommission: 500,
      grossProfit: 3500,
      aimannDeduction: 0,
      debtBalanceBefore: 0,
      debtBalanceAfter: 0,
      netProfit: 3000,
    });
  });

  it('keeps unresolved completed profitability out of snapshots instead of fabricating zero values', () => {
    const snapshot = buildImportedCommissionSnapshot({
      moneyReceived: 10000,
      commissionOwed: 1000,
      memesCommission: 500,
      aimannsCommission: 250,
      importedGrossProfit: null,
      importedNetProfit: null,
    });

    expect(snapshot).toBeNull();
  });

  it('backs up completed-sheet truth even when the stored project status is not completed yet', () => {
    expect(shouldBackfillCompletedImportedSnapshot('Completed Projects')).toBe(true);
    expect(shouldBackfillCompletedImportedSnapshot('Open')).toBe(false);
  });

  it('uses the historical completion date for imported snapshot settlement timing', () => {
    expect(
      resolveImportedSnapshotSettledAt({
        completedDate: new Date('2025-02-14T00:00:00.000Z'),
        installDate: new Date('2025-02-10T00:00:00.000Z'),
        contractDate: new Date('2025-01-25T00:00:00.000Z'),
      }).toISOString()
    ).toBe('2025-02-14T00:00:00.000Z');

    expect(
      resolveImportedSnapshotSettledAt({
        completedDate: null,
        installDate: new Date('2025-02-10T00:00:00.000Z'),
        contractDate: new Date('2025-01-25T00:00:00.000Z'),
      }).toISOString()
    ).toBe('2025-02-10T00:00:00.000Z');
  });

  it('derives imported debt balances from the payout timeline nearest to settlement', () => {
    expect(
      resolveImportedSnapshotDebtBalances({
        settledAt: new Date('2025-02-14T00:00:00.000Z'),
        aimannDeduction: 250,
        ledger: [
          { date: new Date('2025-02-20T00:00:00.000Z'), runningBalance: 900 },
          { date: new Date('2025-02-10T00:00:00.000Z'), runningBalance: 1400 },
        ],
      }),
    ).toEqual({
      debtBalanceBefore: 1150,
      debtBalanceAfter: 900,
    });
  });
});
