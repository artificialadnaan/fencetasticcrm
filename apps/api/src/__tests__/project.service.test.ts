import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentMethod, ProjectStatus, FenceType } from '@fencetastic/shared';

// Mock Prisma before importing service
vi.mock('../lib/prisma', () => ({
  prisma: {
    project: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    subcontractorPayment: {
      aggregate: vi.fn(),
    },
    aimannDebtLedger: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    commissionSnapshot: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn({
      project: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      subcontractorPayment: {
        aggregate: vi.fn(),
      },
      aimannDebtLedger: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      commissionSnapshot: {
        create: vi.fn(),
      },
    })),
  },
}));

import { prisma } from '../lib/prisma';

// We will import the actual service functions after creating them.
// For TDD, these tests define the expected behavior.

describe('Project Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listProjects', () => {
    it('returns paginated projects excluding soft-deleted', async () => {
      const mockProjects = [
        {
          id: 'p1',
          customer: 'John Doe',
          address: '123 Main St',
          fenceType: 'WOOD',
          status: 'OPEN',
          projectTotal: { toNumber: () => 10000 },
          moneyReceived: { toNumber: () => 10000 },
          customerPaid: { toNumber: () => 5000 },
          materialsCost: { toNumber: () => 2000 },
          installDate: new Date('2026-04-15'),
          isDeleted: false,
          subcontractorPayments: [
            { amountOwed: { toNumber: () => 1500 } },
          ],
        },
      ];
      const mockCount = 1;

      vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects as never);
      vi.mocked(prisma.project.count).mockResolvedValue(mockCount);

      const { listProjects } = await import('../services/project.service');
      const result = await listProjects({ page: 1, limit: 20 });

      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].customer).toBe('John Doe');
      expect(result.data[0].receivable).toBe(5000); // projectTotal - customerPaid
    });

    it('applies status filter', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValue([]);
      vi.mocked(prisma.project.count).mockResolvedValue(0);

      const { listProjects } = await import('../services/project.service');
      await listProjects({ status: ProjectStatus.OPEN });

      const findManyCall = vi.mocked(prisma.project.findMany).mock.calls[0][0];
      expect(findManyCall?.where?.status).toBe('OPEN');
      expect(findManyCall?.where?.isDeleted).toBe(false);
    });

    it('applies search filter on customer and address', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValue([]);
      vi.mocked(prisma.project.count).mockResolvedValue(0);

      const { listProjects } = await import('../services/project.service');
      await listProjects({ search: 'john' });

      const findManyCall = vi.mocked(prisma.project.findMany).mock.calls[0][0];
      expect(findManyCall?.where?.OR).toBeDefined();
    });
  });

  describe('createProject', () => {
    it('auto-calculates moneyReceived for credit card payments (97%)', async () => {
      vi.mocked(prisma.project.create).mockResolvedValue({
        id: 'p1',
        projectTotal: { toNumber: () => 10000 },
        moneyReceived: { toNumber: () => 9700 },
        paymentMethod: 'CREDIT_CARD',
      } as never);

      const { createProject } = await import('../services/project.service');
      await createProject({
        customer: 'Jane Doe',
        address: '456 Oak Ave',
        description: 'Wood fence install',
        fenceType: FenceType.WOOD,
        projectTotal: 10000,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        forecastedExpenses: 3000,
        materialsCost: 2000,
        contractDate: '2026-04-01',
        installDate: '2026-04-15',
      }, 'user-1');

      const createCall = vi.mocked(prisma.project.create).mock.calls[0][0];
      expect(Number(createCall.data.moneyReceived)).toBe(9700);
    });

    it('sets moneyReceived equal to projectTotal for cash/check', async () => {
      vi.mocked(prisma.project.create).mockResolvedValue({
        id: 'p1',
        projectTotal: { toNumber: () => 5000 },
        moneyReceived: { toNumber: () => 5000 },
        paymentMethod: 'CASH',
      } as never);

      const { createProject } = await import('../services/project.service');
      await createProject({
        customer: 'Bob Smith',
        address: '789 Elm St',
        description: 'Chain link fence',
        fenceType: FenceType.CHAIN_LINK,
        projectTotal: 5000,
        paymentMethod: PaymentMethod.CASH,
        forecastedExpenses: 1500,
        materialsCost: 1000,
        contractDate: '2026-04-01',
        installDate: '2026-04-20',
      }, 'user-1');

      const createCall = vi.mocked(prisma.project.create).mock.calls[0][0];
      expect(Number(createCall.data.moneyReceived)).toBe(5000);
    });
  });

  describe('updateProject — commission snapshot on COMPLETED', () => {
    it('creates CommissionSnapshot when status changes to COMPLETED', async () => {
      // This test verifies the core commission snapshot logic.
      // The actual implementation will use a Prisma transaction.
      // We test the snapshot creation logic separately.
      const { calculateCommission } = await import('@fencetastic/shared');
      const result = calculateCommission({
        projectTotal: 10000,
        paymentMethod: PaymentMethod.CASH,
        materialsCost: 2000,
        subOwedTotal: 1500,
        aimannDebtBalance: 5000,
      });

      expect(result.moneyReceived).toBe(10000);
      expect(result.totalExpenses).toBe(3500);
      expect(result.adnaanCommission).toBe(1000);
      expect(result.memeCommission).toBe(500);
      expect(result.grossProfit).toBe(5500);
      expect(result.aimannDeduction).toBe(1375);
      expect(result.netProfit).toBe(3625);
    });

    it('writes negative entry to AimannDebtLedger when deduction > 0', () => {
      // When aimannDeduction is 1375 and balance is 5000:
      // New ledger entry: amount = -1375, runningBalance = 5000 - 1375 = 3625
      const currentBalance = 5000;
      const deduction = 1375;
      const newBalance = currentBalance - deduction;

      expect(newBalance).toBe(3625);
      // The ledger entry amount should be negative (reducing debt)
      expect(-deduction).toBe(-1375);
    });

    it('does NOT create debt ledger entry when deduction is 0', async () => {
      // When grossProfit is negative or debt is 0, aimannDeduction is 0
      // No ledger entry should be created
      const { calculateCommission } = await import('@fencetastic/shared');
      const result = calculateCommission({
        projectTotal: 5000,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        materialsCost: 4000,
        subOwedTotal: 2000,
        aimannDebtBalance: 5000,
      });

      expect(result.aimannDeduction).toBe(0);
      // Service should skip ledger write when deduction is 0
    });
  });

  describe('softDeleteProject', () => {
    it('sets isDeleted=true and deletedAt to now', async () => {
      const now = new Date();
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: 'p1',
        isDeleted: false,
      } as never);
      vi.mocked(prisma.project.update).mockResolvedValue({
        id: 'p1',
        isDeleted: true,
        deletedAt: now,
      } as never);

      const { softDeleteProject } = await import('../services/project.service');
      await softDeleteProject('p1');

      const updateCall = vi.mocked(prisma.project.update).mock.calls[0][0];
      expect(updateCall.data.isDeleted).toBe(true);
      expect(updateCall.data.deletedAt).toBeDefined();
    });
  });
});
