import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/prisma', () => ({
  prisma: {
    aimannDebtLedger: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        $queryRaw: vi.fn().mockResolvedValue([{ runningBalance: '100.00' }]),
        aimannDebtLedger: {
          create: vi.fn().mockResolvedValue({
            id: 'ledger-1',
            projectId: null,
            amount: 25.5,
            runningBalance: 125.5,
            note: 'Manual correction',
            date: new Date('2026-04-04T00:00:00.000Z'),
            project: null,
          }),
        },
      })
    ),
  },
}));

describe('Debt Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a manual debt adjustment using the latest running balance', async () => {
    const { createDebtAdjustment } = await import('../services/debt.service');

    const entry = await createDebtAdjustment(
      { amount: 25.5, note: 'Manual correction' },
      'user-1'
    );

    expect(entry.amount).toBe(25.5);
    expect(entry.runningBalance).toBe(125.5);
    expect(entry.note).toBe('Manual correction');
  });
});
