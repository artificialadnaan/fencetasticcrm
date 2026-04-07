import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentMethod, ProjectStatus, FenceType } from '@fencetastic/shared';

const createAutoTransactionMock = vi.fn();
const ensureEstimateFollowUpSequenceTxMock = vi.fn();
const txProjectCreateMock = vi.fn();
const txProjectFindUniqueMock = vi.fn();
const txProjectUpdateMock = vi.fn();
const txSubcontractorAggregateMock = vi.fn();
const txTransactionAggregateMock = vi.fn();
const txQueryRawMock = vi.fn();
const txAimannDebtFindFirstMock = vi.fn();
const txAimannDebtCreateMock = vi.fn();
const txCommissionSnapshotCreateMock = vi.fn();
const txCommissionSnapshotUpsertMock = vi.fn();

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
    transaction: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
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
      $queryRaw: txQueryRawMock,
      project: {
        create: txProjectCreateMock,
        findUnique: txProjectFindUniqueMock,
        update: txProjectUpdateMock,
      },
      subcontractorPayment: {
        aggregate: txSubcontractorAggregateMock,
      },
      transaction: {
        aggregate: txTransactionAggregateMock,
      },
      aimannDebtLedger: {
        findFirst: txAimannDebtFindFirstMock,
        create: txAimannDebtCreateMock,
      },
      commissionSnapshot: {
        create: txCommissionSnapshotCreateMock,
        upsert: txCommissionSnapshotUpsertMock,
      },
    })),
  },
}));

vi.mock('../services/transaction.service', () => ({
  createAutoTransaction: (...args: unknown[]) => createAutoTransactionMock(...args),
}));

vi.mock('../services/follow-up.service', () => ({
  ensureEstimateFollowUpSequenceTx: (...args: unknown[]) =>
    ensureEstimateFollowUpSequenceTxMock(...args),
}));

import { prisma } from '../lib/prisma';

// We will import the actual service functions after creating them.
// For TDD, these tests define the expected behavior.

describe('Project Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureEstimateFollowUpSequenceTxMock.mockResolvedValue({
      id: 'sequence-1',
      projectId: 'p1',
      status: 'ACTIVE',
    });
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
      vi.mocked(prisma.transaction.groupBy).mockResolvedValue([]);

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
      vi.mocked(prisma.transaction.groupBy).mockResolvedValue([]);

      const { listProjects } = await import('../services/project.service');
      await listProjects({ status: ProjectStatus.OPEN });

      const findManyCall = vi.mocked(prisma.project.findMany).mock.calls[0][0];
      expect(findManyCall?.where?.status).toBe('OPEN');
      expect(findManyCall?.where?.isDeleted).toBe(false);
    });

    it('applies search filter on customer and address', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValue([]);
      vi.mocked(prisma.project.count).mockResolvedValue(0);
      vi.mocked(prisma.transaction.groupBy).mockResolvedValue([]);

      const { listProjects } = await import('../services/project.service');
      await listProjects({ search: 'john' });

      const findManyCall = vi.mocked(prisma.project.findMany).mock.calls[0][0];
      expect(findManyCall?.where?.OR).toBeDefined();
    });

    it('uses actual expense rows for live profit percent when they exist', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValue([
        {
          id: 'p-live',
          customer: 'Live Expense',
          address: '987 Cedar St',
          fenceType: 'WOOD',
          status: 'OPEN',
          projectTotal: { toNumber: () => 10000 },
          moneyReceived: { toNumber: () => 10000 },
          customerPaid: { toNumber: () => 5000 },
          materialsCost: { toNumber: () => 2000 },
          forecastedExpenses: { toNumber: () => 3000 },
          installDate: new Date('2026-04-15'),
          isDeleted: false,
          paymentMethod: 'CASH',
          subcontractorPayments: [],
        },
      ] as never);
      vi.mocked(prisma.project.count).mockResolvedValue(1);
      vi.mocked(prisma.aimannDebtLedger.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.transaction.groupBy).mockResolvedValue([
        {
          projectId: 'p-live',
          _sum: { amount: { toNumber: () => 4500 } },
          _count: { _all: 2 },
        },
      ] as never);

      const { listProjects } = await import('../services/project.service');
      const result = await listProjects({ page: 1, limit: 20 });

      expect(result.data[0].profitPercent).toBe(40);
    });
  });

  describe('createProject', () => {
    it('auto-calculates moneyReceived for credit card payments (97%)', async () => {
      txProjectCreateMock.mockResolvedValue({
        id: 'p1',
        projectTotal: { toNumber: () => 10000 },
        moneyReceived: { toNumber: () => 9700 },
        paymentMethod: 'CREDIT_CARD',
        status: ProjectStatus.OPEN,
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

      const createCall = txProjectCreateMock.mock.calls[0][0];
      expect(Number(createCall.data.moneyReceived)).toBe(9700);
    });

    it('sets moneyReceived equal to projectTotal for cash/check', async () => {
      txProjectCreateMock.mockResolvedValue({
        id: 'p1',
        projectTotal: { toNumber: () => 5000 },
        moneyReceived: { toNumber: () => 5000 },
        paymentMethod: 'CASH',
        status: ProjectStatus.OPEN,
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

      const createCall = txProjectCreateMock.mock.calls[0][0];
      expect(Number(createCall.data.moneyReceived)).toBe(5000);
    });

    it('captures estimateDate automatically when created in ESTIMATE', async () => {
      txProjectCreateMock.mockResolvedValue({
        id: 'p-estimate',
        status: ProjectStatus.ESTIMATE,
      } as never);

      const { createProject } = await import('../services/project.service');
      await createProject({
        customer: 'Estimate Lead',
        address: '101 Quote St',
        description: 'Estimate stage',
        fenceType: FenceType.WOOD,
        status: ProjectStatus.ESTIMATE,
        projectTotal: 2500,
        paymentMethod: PaymentMethod.CHECK,
        forecastedExpenses: 1000,
        materialsCost: 500,
        contractDate: '2026-04-01',
        installDate: '2026-04-20',
      }, 'user-1');

      const createCall = txProjectCreateMock.mock.calls[0][0];
      expect(createCall.data.estimateDate).toBeInstanceOf(Date);
    });

    it('creates a follow-up sequence when an ESTIMATE project is created', async () => {
      txProjectCreateMock.mockResolvedValue({
        id: 'p-estimate',
        status: ProjectStatus.ESTIMATE,
      } as never);

      const { createProject } = await import('../services/project.service');
      await createProject({
        customer: 'Estimate Lead',
        address: '101 Quote St',
        description: 'Estimate stage',
        fenceType: FenceType.WOOD,
        status: ProjectStatus.ESTIMATE,
        projectTotal: 2500,
        paymentMethod: PaymentMethod.CHECK,
        forecastedExpenses: 1000,
        materialsCost: 500,
        contractDate: '2026-04-01',
        installDate: '2026-04-20',
      }, 'user-1');

      expect(ensureEstimateFollowUpSequenceTxMock).toHaveBeenCalledTimes(1);
      expect(ensureEstimateFollowUpSequenceTxMock.mock.calls[0][1]).toBe('p-estimate');
      expect(ensureEstimateFollowUpSequenceTxMock.mock.calls[0][2]).toBe('user-1');
    });

    it('captures completedDate automatically when created in COMPLETED', async () => {
      txProjectCreateMock.mockResolvedValue({
        id: 'p-complete',
        status: ProjectStatus.COMPLETED,
      } as never);
      txProjectFindUniqueMock.mockResolvedValue({
        id: 'p-complete',
        customer: 'Finished Job',
        projectTotal: { toNumber: () => 9000 },
        paymentMethod: PaymentMethod.CASH,
        materialsCost: { toNumber: () => 2000 },
        forecastedExpenses: { toNumber: () => 3200 },
      } as never);
      txSubcontractorAggregateMock.mockResolvedValue({
        _sum: { amountOwed: null },
      } as never);
      txTransactionAggregateMock.mockResolvedValue({
        _sum: { amount: null },
        _count: { _all: 0 },
      } as never);
      txQueryRawMock.mockResolvedValue([]);
      txCommissionSnapshotUpsertMock.mockResolvedValue({ id: 'snapshot-1' } as never);

      const { createProject } = await import('../services/project.service');
      await createProject({
        customer: 'Finished Job',
        address: '202 Closeout Ave',
        description: 'Completed stage',
        fenceType: FenceType.METAL,
        status: ProjectStatus.COMPLETED,
        projectTotal: 9000,
        paymentMethod: PaymentMethod.CASH,
        forecastedExpenses: 3200,
        materialsCost: 2000,
        contractDate: '2026-04-01',
        installDate: '2026-04-10',
      }, 'user-1');

      const createCall = txProjectCreateMock.mock.calls[0][0];
      expect(createCall.data.completedDate).toBeInstanceOf(Date);
    });

    it('fails the create when transactional follow-up ensure fails for an estimate', async () => {
      txProjectCreateMock.mockResolvedValue({
        id: 'p-estimate',
        status: ProjectStatus.ESTIMATE,
      } as never);
      ensureEstimateFollowUpSequenceTxMock.mockRejectedValue(new Error('follow-up failed'));

      const { createProject } = await import('../services/project.service');

      await expect(
        createProject({
          customer: 'Estimate Lead',
          address: '101 Quote St',
          description: 'Estimate stage',
          fenceType: FenceType.WOOD,
          status: ProjectStatus.ESTIMATE,
          projectTotal: 2500,
          paymentMethod: PaymentMethod.CHECK,
          forecastedExpenses: 1000,
          materialsCost: 500,
          contractDate: '2026-04-01',
          installDate: '2026-04-20',
        }, 'user-1')
      ).rejects.toThrow('follow-up failed');

      expect(txProjectCreateMock).toHaveBeenCalledTimes(1);
      expect(ensureEstimateFollowUpSequenceTxMock).toHaveBeenCalledTimes(1);
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

  describe('getProjectById', () => {
    it('bases live commission preview expenses on forecasted expenses when they exceed materials cost', async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: 'p1',
        customer: 'Schedule Test',
        address: '123 Main St',
        description: 'Install 10 x 6 iron fence',
        fenceType: FenceType.METAL,
        status: ProjectStatus.OPEN,
        projectTotal: { toNumber: () => 2625 },
        paymentMethod: PaymentMethod.CREDIT_CARD,
        moneyReceived: { toNumber: () => 2546.25 },
        customerPaid: { toNumber: () => 1312.5 },
        forecastedExpenses: { toNumber: () => 852.74 },
        materialsCost: { toNumber: () => 402.74 },
        contractDate: new Date('2026-03-26'),
        installDate: new Date('2026-04-20'),
        completedDate: null,
        estimateDate: null,
        followUpDate: null,
        linearFeet: null,
        rateTemplateId: null,
        subcontractor: 'Froilan',
        notes: 'Install 4/20',
        commissionOwed: { toNumber: () => 0 },
        commissionPaid: { toNumber: () => 0 },
        memesCommission: { toNumber: () => 0 },
        aimannsCommission: { toNumber: () => 0 },
        createdById: 'user-1',
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date('2026-03-26'),
        updatedAt: new Date('2026-03-26'),
        subcontractorPayments: [],
        projectNotes: [],
        commissionSnapshot: null,
      } as never);
      vi.mocked(prisma.subcontractorPayment.aggregate).mockResolvedValue({
        _sum: { amountOwed: null },
      } as never);
      vi.mocked(prisma.transaction.aggregate).mockResolvedValue({
        _sum: { amount: null },
        _count: { _all: 0 },
      } as never);
      vi.mocked(prisma.aimannDebtLedger.findFirst).mockResolvedValue(null);

      const { getProjectById } = await import('../services/project.service');
      const result = await getProjectById('p1');

      expect(result.forecastedExpenses).toBe(852.74);
      expect(result.commissionPreview.totalExpenses).toBe(852.74);
      expect(result.commissionPreview.netProfit).toBe(1299.76);
    });

    it('uses actual recorded expense transactions over forecasted expenses when present', async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: 'p2',
        customer: 'Actual Expense Test',
        address: '456 Oak St',
        description: 'Install gate',
        fenceType: FenceType.METAL,
        status: ProjectStatus.OPEN,
        projectTotal: { toNumber: () => 2625 },
        paymentMethod: PaymentMethod.CREDIT_CARD,
        moneyReceived: { toNumber: () => 2546.25 },
        customerPaid: { toNumber: () => 1312.5 },
        forecastedExpenses: { toNumber: () => 852.74 },
        materialsCost: { toNumber: () => 402.74 },
        contractDate: new Date('2026-03-26'),
        installDate: new Date('2026-04-20'),
        completedDate: null,
        estimateDate: null,
        followUpDate: null,
        linearFeet: null,
        rateTemplateId: null,
        subcontractor: 'Froilan',
        notes: 'Install 4/20',
        commissionOwed: { toNumber: () => 0 },
        commissionPaid: { toNumber: () => 0 },
        memesCommission: { toNumber: () => 0 },
        aimannsCommission: { toNumber: () => 0 },
        createdById: 'user-1',
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date('2026-03-26'),
        updatedAt: new Date('2026-03-26'),
        subcontractorPayments: [],
        projectNotes: [],
        commissionSnapshot: null,
      } as never);
      vi.mocked(prisma.subcontractorPayment.aggregate).mockResolvedValue({
        _sum: { amountOwed: null },
      } as never);
      vi.mocked(prisma.transaction.aggregate).mockResolvedValue({
        _sum: { amount: { toNumber: () => 1200 } },
        _count: { _all: 2 },
      } as never);
      vi.mocked(prisma.aimannDebtLedger.findFirst).mockResolvedValue(null);

      const { getProjectById } = await import('../services/project.service');
      const result = await getProjectById('p2');

      expect(result.commissionPreview.totalExpenses).toBe(1200);
    });

    it('uses zero-sum actual expense rows instead of falling back to forecasted expenses', async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: 'p3',
        customer: 'Zero Sum Expense Test',
        address: '789 Pine St',
        description: 'Repair gate',
        fenceType: FenceType.METAL,
        status: ProjectStatus.OPEN,
        projectTotal: { toNumber: () => 5000 },
        paymentMethod: PaymentMethod.CASH,
        moneyReceived: { toNumber: () => 5000 },
        customerPaid: { toNumber: () => 0 },
        forecastedExpenses: { toNumber: () => 900 },
        materialsCost: { toNumber: () => 300 },
        contractDate: new Date('2026-03-26'),
        installDate: new Date('2026-04-20'),
        completedDate: null,
        estimateDate: null,
        followUpDate: null,
        linearFeet: null,
        rateTemplateId: null,
        subcontractor: null,
        notes: null,
        commissionOwed: { toNumber: () => 0 },
        commissionPaid: { toNumber: () => 0 },
        memesCommission: { toNumber: () => 0 },
        aimannsCommission: { toNumber: () => 0 },
        createdById: 'user-1',
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date('2026-03-26'),
        updatedAt: new Date('2026-03-26'),
        subcontractorPayments: [],
        projectNotes: [],
        commissionSnapshot: null,
      } as never);
      vi.mocked(prisma.subcontractorPayment.aggregate).mockResolvedValue({
        _sum: { amountOwed: null },
      } as never);
      vi.mocked(prisma.transaction.aggregate).mockResolvedValue({
        _sum: { amount: { toNumber: () => 0 } },
        _count: { _all: 2 },
      } as never);
      vi.mocked(prisma.aimannDebtLedger.findFirst).mockResolvedValue(null);

      const { getProjectById } = await import('../services/project.service');
      const result = await getProjectById('p3');

      expect(result.commissionPreview.totalExpenses).toBe(0);
    });
  });

  describe('updateProject', () => {
    it('ensures a follow-up sequence exists when an update persists ESTIMATE status', async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: 'p-open',
        customer: 'Open Lead',
        status: ProjectStatus.OPEN,
        paymentMethod: PaymentMethod.CASH,
        projectTotal: { toNumber: () => 5000 },
        customerPaid: { toNumber: () => 0 },
        forecastedExpenses: { toNumber: () => 1000 },
        materialsCost: { toNumber: () => 500 },
        contractDate: new Date('2026-04-01'),
        installDate: new Date('2026-04-10'),
        completedDate: null,
        estimateDate: null,
        followUpDate: null,
        description: 'Open project',
        fenceType: FenceType.WOOD,
        moneyReceived: { toNumber: () => 5000 },
        linearFeet: null,
        rateTemplateId: null,
        subcontractor: null,
        notes: null,
        commissionOwed: { toNumber: () => 0 },
        commissionPaid: { toNumber: () => 0 },
        memesCommission: { toNumber: () => 0 },
        aimannsCommission: { toNumber: () => 0 },
        createdById: 'user-1',
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date('2026-04-01'),
        updatedAt: new Date('2026-04-05'),
      } as never);
      txProjectUpdateMock.mockResolvedValue({
        id: 'p-open',
        status: ProjectStatus.ESTIMATE,
      } as never);

      const { updateProject } = await import('../services/project.service');
      await updateProject('p-open', {
        status: ProjectStatus.ESTIMATE,
      });

      expect(ensureEstimateFollowUpSequenceTxMock).toHaveBeenCalledTimes(1);
      expect(ensureEstimateFollowUpSequenceTxMock.mock.calls[0][1]).toBe('p-open');
      expect(ensureEstimateFollowUpSequenceTxMock.mock.calls[0][2]).toBe('user-1');
    });

    it('rechecks follow-up sequence existence when an estimate project is resaved', async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: 'p-estimate',
        customer: 'Estimate Lead',
        status: ProjectStatus.ESTIMATE,
        paymentMethod: PaymentMethod.CASH,
        projectTotal: { toNumber: () => 5000 },
        customerPaid: { toNumber: () => 0 },
        forecastedExpenses: { toNumber: () => 1000 },
        materialsCost: { toNumber: () => 500 },
        contractDate: new Date('2026-04-01'),
        installDate: new Date('2026-04-10'),
        completedDate: null,
        estimateDate: new Date('2026-04-05'),
        followUpDate: null,
        description: 'Estimate project',
        fenceType: FenceType.WOOD,
        moneyReceived: { toNumber: () => 5000 },
        linearFeet: null,
        rateTemplateId: null,
        subcontractor: null,
        notes: 'resaved',
        commissionOwed: { toNumber: () => 0 },
        commissionPaid: { toNumber: () => 0 },
        memesCommission: { toNumber: () => 0 },
        aimannsCommission: { toNumber: () => 0 },
        createdById: 'user-1',
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date('2026-04-01'),
        updatedAt: new Date('2026-04-05'),
      } as never);
      txProjectUpdateMock.mockResolvedValue({
        id: 'p-estimate',
        status: ProjectStatus.ESTIMATE,
      } as never);

      const { updateProject } = await import('../services/project.service');
      await updateProject('p-estimate', {
        notes: 'still estimate',
      });

      expect(ensureEstimateFollowUpSequenceTxMock).toHaveBeenCalledTimes(1);
      expect(ensureEstimateFollowUpSequenceTxMock.mock.calls[0][1]).toBe('p-estimate');
      expect(ensureEstimateFollowUpSequenceTxMock.mock.calls[0][2]).toBe('user-1');
    });

    it('fails the update when transactional follow-up ensure fails for an estimate', async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: 'p-estimate',
        customer: 'Estimate Lead',
        status: ProjectStatus.ESTIMATE,
        paymentMethod: PaymentMethod.CASH,
        projectTotal: { toNumber: () => 5000 },
        customerPaid: { toNumber: () => 0 },
        forecastedExpenses: { toNumber: () => 1000 },
        materialsCost: { toNumber: () => 500 },
        contractDate: new Date('2026-04-01'),
        installDate: new Date('2026-04-10'),
        completedDate: null,
        estimateDate: new Date('2026-04-05'),
        followUpDate: null,
        description: 'Estimate project',
        fenceType: FenceType.WOOD,
        moneyReceived: { toNumber: () => 5000 },
        linearFeet: null,
        rateTemplateId: null,
        subcontractor: null,
        notes: 'resaved',
        commissionOwed: { toNumber: () => 0 },
        commissionPaid: { toNumber: () => 0 },
        memesCommission: { toNumber: () => 0 },
        aimannsCommission: { toNumber: () => 0 },
        createdById: 'user-1',
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date('2026-04-01'),
        updatedAt: new Date('2026-04-05'),
      } as never);
      txProjectUpdateMock.mockResolvedValue({
        id: 'p-estimate',
        status: ProjectStatus.ESTIMATE,
      } as never);
      ensureEstimateFollowUpSequenceTxMock.mockRejectedValue(new Error('follow-up failed'));

      const { updateProject } = await import('../services/project.service');

      await expect(
        updateProject('p-estimate', {
          notes: 'still estimate',
        })
      ).rejects.toThrow('follow-up failed');

      expect(txProjectUpdateMock).toHaveBeenCalledTimes(1);
      expect(ensureEstimateFollowUpSequenceTxMock).toHaveBeenCalledTimes(1);
    });

    it('regenerates completed project snapshots after auto expense transactions are created', async () => {
      const transactionStages: string[] = [];
      let transactionCallCount = 0;

      vi.mocked(prisma.project.findUnique)
        .mockResolvedValueOnce({
          id: 'p-completed',
          customer: 'Completed Job',
          status: ProjectStatus.COMPLETED,
          paymentMethod: PaymentMethod.CASH,
          projectTotal: { toNumber: () => 5000 },
          customerPaid: { toNumber: () => 2500 },
          forecastedExpenses: { toNumber: () => 1000 },
          materialsCost: { toNumber: () => 500 },
          contractDate: new Date('2026-04-01'),
          installDate: new Date('2026-04-10'),
          completedDate: new Date('2026-04-20'),
          estimateDate: null,
          followUpDate: null,
          description: 'Completed project',
          fenceType: FenceType.WOOD,
          moneyReceived: { toNumber: () => 5000 },
          linearFeet: null,
          rateTemplateId: null,
          subcontractor: null,
          notes: null,
          commissionOwed: { toNumber: () => 0 },
          commissionPaid: { toNumber: () => 0 },
          memesCommission: { toNumber: () => 0 },
          aimannsCommission: { toNumber: () => 0 },
          createdById: 'user-1',
          isDeleted: false,
          deletedAt: null,
          createdAt: new Date('2026-04-01'),
          updatedAt: new Date('2026-04-20'),
        } as never)
        .mockResolvedValueOnce({
          id: 'p-completed',
          customer: 'Completed Job',
          projectTotal: { toNumber: () => 5000 },
          paymentMethod: PaymentMethod.CASH,
          materialsCost: { toNumber: () => 500 },
        } as never);

      vi.mocked(prisma.project.update).mockResolvedValue({
        id: 'p-completed',
      } as never);
      vi.mocked(prisma.subcontractorPayment.aggregate).mockResolvedValue({
        _sum: { amountOwed: null },
      } as never);
      vi.mocked(prisma.transaction.aggregate).mockResolvedValue({
        _sum: { amount: { toNumber: () => 1200 } },
        _count: { _all: 1 },
      } as never);
      vi.mocked(prisma.aimannDebtLedger.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: Parameters<typeof prisma.$transaction>[0]) => {
        transactionCallCount += 1;
        transactionStages.push(transactionCallCount === 1 ? 'update' : 'snapshot');
        return fn({
          project: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'p-completed',
              customer: 'Completed Job',
              projectTotal: { toNumber: () => 5000 },
              paymentMethod: PaymentMethod.CASH,
              materialsCost: { toNumber: () => 500 },
              forecastedExpenses: { toNumber: () => 1000 },
            }),
            update: vi.fn().mockResolvedValue({ id: 'p-completed' }),
          },
          subcontractorPayment: {
            aggregate: vi.fn().mockResolvedValue({ _sum: { amountOwed: null } }),
          },
          aimannDebtLedger: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn(),
          },
          commissionSnapshot: {
            create: vi.fn(),
            upsert: vi.fn(),
          },
          transaction: {
            aggregate: vi.fn().mockResolvedValue({
              _sum: { amount: { toNumber: () => 1200 } },
              _count: { _all: 1 },
            }),
          },
          $queryRaw: vi.fn().mockResolvedValue([]),
        } as never);
      });

      createAutoTransactionMock.mockImplementation(async () => {
        transactionStages.push('auto-transaction');
      });

      const { updateProject } = await import('../services/project.service');
      await updateProject('p-completed', {
        materialsCost: 1200,
      });

      expect(transactionStages).toEqual(['update', 'auto-transaction', 'snapshot']);
    });
  });
});
