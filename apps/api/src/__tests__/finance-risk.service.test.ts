import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  prisma: {
    project: {
      findMany: vi.fn(),
    },
    aimannDebtLedger: {
      findMany: vi.fn(),
    },
  },
}));

const reportsMock = vi.hoisted(() => ({
  getReceivablesAging: vi.fn(),
}));

const debtMock = vi.hoisted(() => ({
  getDebtBalance: vi.fn(),
}));

vi.mock('../lib/prisma', () => ({
  prisma: prismaMock.prisma,
}));

vi.mock('../services/report.service', () => ({
  getReceivablesAging: reportsMock.getReceivablesAging,
}));

vi.mock('../services/debt.service', () => ({
  getDebtBalance: debtMock.getDebtBalance,
}));

describe('finance-risk.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T12:00:00.000Z'));
  });

  it('combines receivables aging, unpaid commissions, and 30-day debt movement into one cash-risk overview', async () => {
    reportsMock.getReceivablesAging.mockResolvedValue({
      bucket0_30: [
        {
          id: 'project-fresh',
          customer: 'Fresh Fence',
          address: '1 New St',
          fenceType: 'WOOD',
          contractDate: '2026-04-01',
          projectTotal: 5000,
          customerPaid: 3000,
          outstanding: 2000,
          ageDays: 12,
        },
      ],
      bucket31_60: [],
      bucket61_90: [
        {
          id: 'project-aged',
          customer: 'Aged Receivable',
          address: '90 Old Rd',
          fenceType: 'WOOD',
          contractDate: '2026-01-10',
          projectTotal: 10000,
          customerPaid: 6500,
          outstanding: 3500,
          ageDays: 74,
        },
      ],
      bucket90plus: [
        {
          id: 'project-critical',
          customer: 'Critical Balance',
          address: '321 River Meadows Ln',
          fenceType: 'WOOD',
          contractDate: '2025-12-10',
          projectTotal: 12000,
          customerPaid: 7800,
          outstanding: 4200,
          ageDays: 118,
        },
      ],
      totals: {
        bucket0_30: 2000,
        bucket31_60: 0,
        bucket61_90: 3500,
        bucket90plus: 4200,
        overall: 9700,
      },
    });

    prismaMock.prisma.project.findMany.mockResolvedValue([
      {
        id: 'project-pay-1',
        customer: 'Will & Marta (phase 1)',
        address: '1141 Macgregor Ln',
        status: 'OPEN',
        commissionOwed: 1800,
        commissionPaid: 600,
      },
      {
        id: 'project-pay-2',
        customer: 'Joshu Dunn. Honda Dealership',
        address: '601 S Central Expressway',
        status: 'IN_PROGRESS',
        commissionOwed: 900,
        commissionPaid: 300,
      },
      {
        id: 'project-paid',
        customer: 'Closed Out',
        address: '22 Paid Ave',
        status: 'COMPLETED',
        commissionOwed: 500,
        commissionPaid: 500,
      },
    ]);

    debtMock.getDebtBalance.mockResolvedValue({
      balance: 42000,
    });

    prismaMock.prisma.aimannDebtLedger.findMany.mockResolvedValue([
      {
        amount: -1000,
        note: 'Aimann commission applied',
        date: new Date('2026-04-10T00:00:00.000Z'),
      },
      {
        amount: -500,
        note: 'Aimann commission applied',
        date: new Date('2026-03-25T00:00:00.000Z'),
      },
      {
        amount: 250,
        note: 'Manual debt adjustment',
        date: new Date('2026-04-01T00:00:00.000Z'),
      },
      {
        amount: -999,
        note: 'Old movement outside window',
        date: new Date('2026-02-01T00:00:00.000Z'),
      },
    ]);

    const { getFinanceRiskOverview } = await import('../services/finance-risk.service');
    const result = await getFinanceRiskOverview();

    expect(result).toEqual({
      receivables: {
        overallOutstanding: 9700,
        over60Outstanding: 7700,
        buckets: [
          { label: '0-30 days', amount: 2000, count: 1 },
          { label: '31-60 days', amount: 0, count: 0 },
          { label: '61-90 days', amount: 3500, count: 1 },
          { label: '90+ days', amount: 4200, count: 1 },
        ],
        topAtRisk: [
          {
            projectId: 'project-critical',
            customer: 'Critical Balance',
            address: '321 River Meadows Ln',
            amount: 4200,
            ageDays: 118,
          },
          {
            projectId: 'project-aged',
            customer: 'Aged Receivable',
            address: '90 Old Rd',
            amount: 3500,
            ageDays: 74,
          },
          {
            projectId: 'project-fresh',
            customer: 'Fresh Fence',
            address: '1 New St',
            amount: 2000,
            ageDays: 12,
          },
        ],
      },
      payables: {
        outstandingCommissions: 1800,
        projectCount: 2,
        topUnpaid: [
          {
            projectId: 'project-pay-1',
            customer: 'Will & Marta (phase 1)',
            address: '1141 Macgregor Ln',
            status: 'OPEN',
            amountDue: 1200,
          },
          {
            projectId: 'project-pay-2',
            customer: 'Joshu Dunn. Honda Dealership',
            address: '601 S Central Expressway',
            status: 'IN_PROGRESS',
            amountDue: 600,
          },
        ],
      },
      debt: {
        currentBalance: 42000,
        paidDownLast30Days: 1500,
        adjustmentsLast30Days: 250,
        netMovementLast30Days: -1250,
      },
    });

    vi.useRealTimers();
  });
});
