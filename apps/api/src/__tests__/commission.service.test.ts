import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinanceProjectMode } from '@fencetastic/shared';

const prismaMock = vi.hoisted(() => ({
  prisma: {
    commissionSnapshot: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    transaction: {
      groupBy: vi.fn(),
    },
    project: {
      findMany: vi.fn(),
    },
    aimannDebtLedger: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('../lib/prisma', () => ({
  prisma: prismaMock.prisma,
}));

describe('commission.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes finance provenance for per-project commission rows', async () => {
    prismaMock.prisma.commissionSnapshot.findMany.mockResolvedValue([
      {
        projectId: 'project-1',
        adnaanCommission: { toNumber: () => 1200 },
        memeCommission: { toNumber: () => 450 },
        aimannDeduction: { toNumber: () => 200 },
        netProfit: { toNumber: () => 1800 },
        settledAt: new Date('2026-04-08T00:00:00.000Z'),
        project: {
          customer: 'Jane Doe',
          completedDate: new Date('2026-04-07T00:00:00.000Z'),
          projectTotal: { toNumber: () => 9000 },
          financeProjectMode: FinanceProjectMode.IMPORTED,
          importedSource: 'Completed Projects',
        },
      },
    ]);
    prismaMock.prisma.commissionSnapshot.count.mockResolvedValue(1);

    const { getCommissionsByProject } = await import('../services/commission.service');
    const result = await getCommissionsByProject(1, 20);

    expect(result.data).toEqual([
      {
        projectId: 'project-1',
        customer: 'Jane Doe',
        projectTotal: 9000,
        adnaanCommission: 1200,
        memeCommission: 450,
        aimannDeduction: 200,
        netProfit: 1800,
        completedDate: '2026-04-07',
        financeProjectMode: FinanceProjectMode.IMPORTED,
        importedSource: 'Completed Projects',
      },
    ]);
  });
});
