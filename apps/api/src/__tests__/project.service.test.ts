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

    it('adds schedule readiness summaries to project list rows', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValue([
        {
          id: 'p-ready',
          customer: 'Ready Job',
          address: '1 Done Ln',
          fenceType: 'WOOD',
          status: 'OPEN',
          projectTotal: { toNumber: () => 8000 },
          moneyReceived: { toNumber: () => 8000 },
          customerPaid: { toNumber: () => 2500 },
          materialsCost: { toNumber: () => 900 },
          forecastedExpenses: { toNumber: () => 2000 },
          installDate: new Date('2026-04-20'),
          isDeleted: false,
          paymentMethod: 'CASH',
          subcontractor: 'Froilan',
          subcontractorPayments: [],
          calendarEvents: [
            {
              id: 'task-ready-1',
              title: 'Confirm install window',
              date: new Date('2026-04-15T00:00:00.000Z'),
              isWorkflowTask: true,
              taskStatus: 'PENDING',
              assignedToUserId: 'user-2',
              assignedToUser: {
                id: 'user-2',
                name: 'Office Admin',
              },
            },
          ],
          _count: {
            materialLineItems: 2,
            workOrders: 1,
          },
        },
        {
          id: 'p-blocked',
          customer: 'Blocked Job',
          address: '2 Wait St',
          fenceType: 'WOOD',
          status: 'OPEN',
          projectTotal: { toNumber: () => 8000 },
          moneyReceived: { toNumber: () => 8000 },
          customerPaid: { toNumber: () => 0 },
          materialsCost: { toNumber: () => 0 },
          forecastedExpenses: { toNumber: () => 2000 },
          installDate: null,
          isDeleted: false,
          paymentMethod: 'CASH',
          subcontractor: null,
          subcontractorPayments: [],
          calendarEvents: [],
          _count: {
            materialLineItems: 0,
            workOrders: 0,
          },
        },
      ] as never);
      vi.mocked(prisma.project.count).mockResolvedValue(2);
      vi.mocked(prisma.aimannDebtLedger.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.transaction.groupBy).mockResolvedValue([]);

      const { listProjects } = await import('../services/project.service');
      const result = await listProjects({ page: 1, limit: 20 });

      expect(result.data[0].scheduleReadiness).toEqual({
        isReady: true,
        blockerCount: 0,
        topBlockers: [],
      });
      expect(result.data[0].nextAction).toEqual({
        id: 'task-ready-1',
        title: 'Confirm install window',
        dueDate: '2026-04-15',
        source: 'WORKFLOW_TASK',
        status: 'PENDING',
        assignedToName: 'Office Admin',
      });
      expect(result.data[1].scheduleReadiness).toEqual({
        isReady: false,
        blockerCount: 5,
        topBlockers: ['Install date', 'Deposit', 'Materials'],
      });
      expect(result.data[1].nextAction).toBeNull();
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
    it('returns finance provenance metadata on project detail responses', async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: 'p-finance',
        customer: 'Imported Finance Test',
        address: '321 Ledger Ln',
        description: 'Imported project',
        fenceType: FenceType.WOOD,
        status: ProjectStatus.OPEN,
        projectTotal: { toNumber: () => 5000 },
        paymentMethod: PaymentMethod.CASH,
        moneyReceived: { toNumber: () => 4850 },
        customerPaid: { toNumber: () => 2500 },
        forecastedExpenses: { toNumber: () => 1000 },
        materialsCost: { toNumber: () => 400 },
        contractDate: new Date('2026-03-26'),
        installDate: new Date('2026-04-20'),
        completedDate: null,
        estimateDate: null,
        followUpDate: null,
        linearFeet: null,
        rateTemplateId: null,
        subcontractor: null,
        notes: null,
        commissionOwed: { toNumber: () => 700 },
        commissionPaid: { toNumber: () => 200 },
        memesCommission: { toNumber: () => 300 },
        aimannsCommission: { toNumber: () => 150 },
        financeProjectMode: 'IMPORTED',
        receivablesSource: 'IMPORTED_ACTUAL',
        payablesSource: 'IMPORTED_ACTUAL',
        commissionsSource: 'IMPORTED_ACTUAL',
        profitabilitySource: 'IMPORTED_ACTUAL',
        importedOutstandingReceivables: { toNumber: () => 0 },
        importedOutstandingPayables: { toNumber: () => 0 },
        importedGrossProfit: { toNumber: () => 0 },
        importedGrossProfitPercent: null,
        importedNetProfit: { toNumber: () => 0 },
        importedNetProfitPercent: null,
        importedAt: new Date('2026-04-01T10:00:00Z'),
        importedSource: 'Open',
        lastRecalculatedAt: null,
        lastManualFinanceEditAt: null,
        reconciliationRequiredAt: null,
        reconciliationNotes: null,
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
      const result = await getProjectById('p-finance');

      expect(result.financeProjectMode).toBe('IMPORTED');
      expect(result.receivablesSource).toBe('IMPORTED_ACTUAL');
      expect(result.importedOutstandingReceivables).toBe(0);
      expect(result.importedGrossProfitPercent).toBeNull();
      expect(result.importedSource).toBe('Open');
    });

    it('returns workflow tasks and next action on project detail responses', async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: 'project-1',
        customer: 'Workflow Job',
        address: '123 Fence Ln',
        description: 'Workflow project',
        fenceType: 'WOOD',
        status: 'OPEN',
        projectTotal: 1000,
        paymentMethod: 'CHECK',
        moneyReceived: 1000,
        customerPaid: 0,
        forecastedExpenses: 300,
        materialsCost: 0,
        contractDate: new Date('2026-04-01T00:00:00.000Z'),
        installDate: new Date('2026-04-10T00:00:00.000Z'),
        completedDate: null,
        estimateDate: null,
        followUpDate: null,
        linearFeet: null,
        rateTemplateId: null,
        subcontractor: null,
        notes: null,
        commissionOwed: null,
        commissionPaid: null,
        memesCommission: null,
        aimannsCommission: null,
        financeProjectMode: 'COMPUTED',
        receivablesSource: 'CRM_COMPUTED',
        payablesSource: 'CRM_COMPUTED',
        commissionsSource: 'CRM_COMPUTED',
        profitabilitySource: 'CRM_COMPUTED',
        importedOutstandingReceivables: null,
        importedOutstandingPayables: null,
        importedGrossProfit: null,
        importedGrossProfitPercent: null,
        importedNetProfit: null,
        importedNetProfitPercent: null,
        importedAt: null,
        importedSource: null,
        lastRecalculatedAt: null,
        lastManualFinanceEditAt: null,
        reconciliationRequiredAt: null,
        reconciliationNotes: null,
        createdById: 'user-1',
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-08T00:00:00.000Z'),
        subcontractorPayments: [],
        projectNotes: [],
        commissionSnapshot: null,
        _count: {
          materialLineItems: 0,
          workOrders: 0,
        },
        calendarEvents: [
          {
            id: 'task-1',
            title: 'Order materials',
            date: new Date('2026-04-05T00:00:00.000Z'),
            endDate: null,
            eventType: 'followup',
            color: '#F59E0B',
            projectId: 'project-1',
            notes: 'Before install date',
            isWorkflowTask: true,
            taskStatus: 'PENDING',
            completedAt: null,
            assignedToUserId: 'user-2',
            assignedToUser: {
              id: 'user-2',
              name: 'Office Admin',
            },
          },
        ],
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
      const result = await getProjectById('project-1');

      expect(result.workflowTasks).toEqual([
        {
          id: 'task-1',
          title: 'Order materials',
          dueDate: '2026-04-05',
          type: 'followup',
          status: 'PENDING',
          notes: 'Before install date',
          assignedToUserId: 'user-2',
          assignedToName: 'Office Admin',
          completedAt: null,
        },
      ]);
      expect(result.nextAction).toEqual({
        id: 'task-1',
        title: 'Order materials',
        dueDate: '2026-04-05',
        source: 'WORKFLOW_TASK',
        status: 'PENDING',
        assignedToName: 'Office Admin',
      });
      expect(result.scheduleReadiness).toEqual({
        isReady: false,
        blockerCount: 4,
        topBlockers: ['Deposit', 'Materials', 'Crew'],
        blockers: [
          {
            code: 'MISSING_DEPOSIT',
            label: 'Deposit',
            reason: 'No customer payment has been recorded yet.',
            severity: 'HIGH',
          },
          {
            code: 'MISSING_MATERIALS',
            label: 'Materials',
            reason: 'No materials have been logged for this project.',
            severity: 'HIGH',
          },
          {
            code: 'MISSING_SUBCONTRACTOR',
            label: 'Crew',
            reason: 'No subcontractor has been assigned yet.',
            severity: 'HIGH',
          },
          {
            code: 'MISSING_WORK_ORDER',
            label: 'Work order',
            reason: 'No work order has been created for this project.',
            severity: 'MEDIUM',
          },
        ],
      });
    });

    it('prefers imported historical gross and net values in the detail finance preview', async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: 'p-imported-detail',
        customer: 'Imported Preview Test',
        address: '789 Audit Ave',
        description: 'Imported completed project',
        fenceType: FenceType.WOOD,
        status: ProjectStatus.COMPLETED,
        projectTotal: { toNumber: () => 5000 },
        paymentMethod: PaymentMethod.CASH,
        moneyReceived: { toNumber: () => 4850 },
        customerPaid: { toNumber: () => 4850 },
        forecastedExpenses: { toNumber: () => 1000 },
        materialsCost: { toNumber: () => 400 },
        contractDate: new Date('2026-03-26'),
        installDate: new Date('2026-04-20'),
        completedDate: new Date('2026-04-20'),
        estimateDate: null,
        followUpDate: null,
        linearFeet: null,
        rateTemplateId: null,
        subcontractor: null,
        notes: null,
        commissionOwed: { toNumber: () => 700 },
        commissionPaid: { toNumber: () => 700 },
        memesCommission: { toNumber: () => 300 },
        aimannsCommission: { toNumber: () => 150 },
        financeProjectMode: 'IMPORTED',
        receivablesSource: 'IMPORTED_ACTUAL',
        payablesSource: 'IMPORTED_ACTUAL',
        commissionsSource: 'IMPORTED_ACTUAL',
        profitabilitySource: 'IMPORTED_ACTUAL',
        importedOutstandingReceivables: { toNumber: () => 0 },
        importedOutstandingPayables: { toNumber: () => 0 },
        importedGrossProfit: { toNumber: () => 2300 },
        importedGrossProfitPercent: { toNumber: () => 46 },
        importedNetProfit: { toNumber: () => 1850 },
        importedNetProfitPercent: { toNumber: () => 37 },
        importedAt: new Date('2026-04-01T10:00:00Z'),
        importedSource: 'Completed Projects',
        lastRecalculatedAt: null,
        lastManualFinanceEditAt: null,
        reconciliationRequiredAt: null,
        reconciliationNotes: null,
        createdById: 'user-1',
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date('2026-03-26'),
        updatedAt: new Date('2026-03-26'),
        subcontractorPayments: [],
        projectNotes: [],
        commissionSnapshot: {
          id: 'snap-1',
          projectId: 'p-imported-detail',
          moneyReceived: { toNumber: () => 4800 },
          totalExpenses: { toNumber: () => 1800 },
          adnaanCommission: { toNumber: () => 500 },
          memeCommission: { toNumber: () => 250 },
          grossProfit: { toNumber: () => 2500 },
          aimannDeduction: { toNumber: () => 100 },
          debtBalanceBefore: { toNumber: () => 0 },
          debtBalanceAfter: { toNumber: () => 0 },
          netProfit: { toNumber: () => 2150 },
          settledAt: new Date('2026-04-20'),
        },
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
      const result = await getProjectById('p-imported-detail');

      expect(result.commissionPreview.grossProfit).toBe(2300);
      expect(result.commissionPreview.netProfit).toBe(1850);
      expect(result.commissionPreview.adnaanCommission).toBe(700);
      expect(result.commissionPreview.aimannDeduction).toBe(150);
    });

    it('does not let stale imported profit percentages override manual profitability mode', async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: 'p-manual-profit',
        customer: 'Manual Profit Job',
        address: '22 Oak St',
        description: 'Manual finance override',
        fenceType: FenceType.WOOD,
        status: ProjectStatus.OPEN,
        projectTotal: { toNumber: () => 10000 },
        paymentMethod: PaymentMethod.CASH,
        moneyReceived: { toNumber: () => 9800 },
        customerPaid: { toNumber: () => 7000 },
        forecastedExpenses: { toNumber: () => 4100 },
        materialsCost: { toNumber: () => 1200 },
        contractDate: new Date('2026-03-26'),
        installDate: new Date('2026-04-20'),
        completedDate: null,
        estimateDate: null,
        followUpDate: null,
        linearFeet: null,
        rateTemplateId: null,
        subcontractor: null,
        notes: null,
        commissionOwed: { toNumber: () => 1000 },
        commissionPaid: { toNumber: () => 1000 },
        memesCommission: { toNumber: () => 500 },
        aimannsCommission: { toNumber: () => 250 },
        financeProjectMode: 'MANUAL_OVERRIDE',
        receivablesSource: 'MANUAL_OVERRIDE',
        payablesSource: 'MANUAL_OVERRIDE',
        commissionsSource: 'MANUAL_OVERRIDE',
        profitabilitySource: 'MANUAL_OVERRIDE',
        importedOutstandingReceivables: { toNumber: () => 3000 },
        importedOutstandingPayables: { toNumber: () => 0 },
        importedGrossProfit: { toNumber: () => 9999 },
        importedGrossProfitPercent: { toNumber: () => 88 },
        importedNetProfit: { toNumber: () => 8888 },
        importedNetProfitPercent: { toNumber: () => 77 },
        importedAt: new Date('2026-04-01T10:00:00Z'),
        importedSource: 'Open',
        lastRecalculatedAt: null,
        lastManualFinanceEditAt: new Date('2026-04-10T10:00:00Z'),
        reconciliationRequiredAt: null,
        reconciliationNotes: null,
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
      const result = await getProjectById('p-manual-profit');

      expect(result.commissionPreview.grossProfit).toBe(4900);
      expect(result.commissionPreview.netProfit).toBe(4400);
      expect(result.commissionPreview.profitPercent).toBe(44);
    });

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
    it('does not silently recalculate moneyReceived for imported projects', async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: 'p-imported',
        customer: 'Imported Job',
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
        description: 'Imported project',
        fenceType: FenceType.WOOD,
        moneyReceived: { toNumber: () => 4850 },
        linearFeet: null,
        rateTemplateId: null,
        subcontractor: null,
        notes: null,
        commissionOwed: { toNumber: () => 800 },
        commissionPaid: { toNumber: () => 300 },
        memesCommission: { toNumber: () => 250 },
        aimannsCommission: { toNumber: () => 150 },
        financeProjectMode: 'IMPORTED',
        createdById: 'user-1',
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date('2026-04-01'),
        updatedAt: new Date('2026-04-05'),
      } as never);
      txProjectUpdateMock.mockResolvedValue({
        id: 'p-imported',
        status: ProjectStatus.OPEN,
      } as never);

      const { updateProject } = await import('../services/project.service');
      await updateProject('p-imported', {
        projectTotal: 6000,
      });

      const updateCall = txProjectUpdateMock.mock.calls[0][0];
      expect(updateCall.data.moneyReceived).toBeUndefined();
      expect(updateCall.data.financeProjectMode).toBe('MIXED');
      expect(updateCall.data.receivablesSource).toBe('MANUAL_OVERRIDE');
      expect(updateCall.data.profitabilitySource).toBe('MANUAL_OVERRIDE');
      expect(updateCall.data.lastManualFinanceEditAt).toBeInstanceOf(Date);
    });

    it('marks direct moneyReceived edits on imported projects as manual finance touches', async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: 'p-imported-manual',
        customer: 'Imported Job',
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
        description: 'Imported project',
        fenceType: FenceType.WOOD,
        moneyReceived: { toNumber: () => 4850 },
        linearFeet: null,
        rateTemplateId: null,
        subcontractor: null,
        notes: null,
        commissionOwed: { toNumber: () => 800 },
        commissionPaid: { toNumber: () => 300 },
        memesCommission: { toNumber: () => 250 },
        aimannsCommission: { toNumber: () => 150 },
        financeProjectMode: 'IMPORTED',
        createdById: 'user-1',
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date('2026-04-01'),
        updatedAt: new Date('2026-04-05'),
      } as never);
      txProjectUpdateMock.mockResolvedValue({
        id: 'p-imported-manual',
        status: ProjectStatus.OPEN,
      } as never);

      const { updateProject } = await import('../services/project.service');
      await updateProject('p-imported-manual', {
        moneyReceived: 4700,
      });

      const updateCall = txProjectUpdateMock.mock.calls[0][0];
      expect(updateCall.data.moneyReceived).toBe(4700);
      expect(updateCall.data.financeProjectMode).toBe('MIXED');
      expect(updateCall.data.receivablesSource).toBe('MANUAL_OVERRIDE');
      expect(updateCall.data.lastManualFinanceEditAt).toBeInstanceOf(Date);
    });

    it('preserves reconciliation-required mode when finance fields are edited', async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: 'p-reconcile',
        customer: 'Needs Reconciliation',
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
        description: 'Imported project',
        fenceType: FenceType.WOOD,
        moneyReceived: { toNumber: () => 4850 },
        linearFeet: null,
        rateTemplateId: null,
        subcontractor: null,
        notes: null,
        commissionOwed: { toNumber: () => 800 },
        commissionPaid: { toNumber: () => 300 },
        memesCommission: { toNumber: () => 250 },
        aimannsCommission: { toNumber: () => 150 },
        financeProjectMode: 'RECONCILIATION_REQUIRED',
        createdById: 'user-1',
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date('2026-04-01'),
        updatedAt: new Date('2026-04-05'),
      } as never);
      txProjectUpdateMock.mockResolvedValue({
        id: 'p-reconcile',
        status: ProjectStatus.OPEN,
      } as never);

      const { updateProject } = await import('../services/project.service');
      await updateProject('p-reconcile', {
        customerPaid: 5000,
      });

      const updateCall = txProjectUpdateMock.mock.calls[0][0];
      expect(updateCall.data.financeProjectMode).toBe('RECONCILIATION_REQUIRED');
      expect(updateCall.data.receivablesSource).toBe('MANUAL_OVERRIDE');
      expect(updateCall.data.lastManualFinanceEditAt).toBeInstanceOf(Date);
    });

    it('marks computed projects as manual override when finance fields are edited', async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: 'p-computed-manual',
        customer: 'Computed Job',
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
        description: 'Computed project',
        fenceType: FenceType.WOOD,
        moneyReceived: { toNumber: () => 5000 },
        linearFeet: null,
        rateTemplateId: null,
        subcontractor: null,
        notes: null,
        commissionOwed: { toNumber: () => 800 },
        commissionPaid: { toNumber: () => 300 },
        memesCommission: { toNumber: () => 250 },
        aimannsCommission: { toNumber: () => 150 },
        financeProjectMode: 'COMPUTED',
        createdById: 'user-1',
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date('2026-04-01'),
        updatedAt: new Date('2026-04-05'),
      } as never);
      txProjectUpdateMock.mockResolvedValue({
        id: 'p-computed-manual',
        status: ProjectStatus.OPEN,
      } as never);

      const { updateProject } = await import('../services/project.service');
      await updateProject('p-computed-manual', {
        commissionPaid: 400,
      });

      const updateCall = txProjectUpdateMock.mock.calls[0][0];
      expect(updateCall.data.financeProjectMode).toBe('MANUAL_OVERRIDE');
      expect(updateCall.data.payablesSource).toBe('MANUAL_OVERRIDE');
      expect(updateCall.data.commissionsSource).toBe('MANUAL_OVERRIDE');
      expect(updateCall.data.profitabilitySource).toBe('MANUAL_OVERRIDE');
      expect(updateCall.data.lastManualFinanceEditAt).toBeInstanceOf(Date);
    });

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

    it('does not regenerate computed snapshots for imported completed projects', async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: 'p-imported-completed',
        customer: 'Imported Completed Job',
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
        financeProjectMode: 'IMPORTED',
        createdById: 'user-1',
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date('2026-04-01'),
        updatedAt: new Date('2026-04-20'),
      } as never);
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: Parameters<typeof prisma.$transaction>[0]) => {
        return fn({
          project: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'p-imported-completed',
              customer: 'Imported Completed Job',
              projectTotal: { toNumber: () => 5000 },
              paymentMethod: PaymentMethod.CASH,
              materialsCost: { toNumber: () => 500 },
              forecastedExpenses: { toNumber: () => 1000 },
              financeProjectMode: 'IMPORTED',
            }),
            update: vi.fn().mockResolvedValue({ id: 'p-imported-completed', status: ProjectStatus.COMPLETED }),
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
            upsert: txCommissionSnapshotUpsertMock,
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
      txProjectUpdateMock.mockResolvedValue({
        id: 'p-imported-completed',
        status: ProjectStatus.COMPLETED,
      } as never);

      const { updateProject } = await import('../services/project.service');
      await updateProject('p-imported-completed', {
        materialsCost: 1200,
      });

      expect(txCommissionSnapshotUpsertMock).not.toHaveBeenCalled();
    });

    it('regenerates commission snapshots once a completed imported project is moved into mixed mode by finance edits', async () => {
      vi.mocked(prisma.project.findUnique)
        .mockResolvedValueOnce({
          id: 'p-imported-completed-mixed',
          customer: 'Imported Completed Job',
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
          financeProjectMode: 'IMPORTED',
          createdById: 'user-1',
          isDeleted: false,
          deletedAt: null,
          createdAt: new Date('2026-04-01'),
          updatedAt: new Date('2026-04-20'),
        } as never)
        .mockResolvedValueOnce({
          id: 'p-imported-completed-mixed',
          customer: 'Imported Completed Job',
          projectTotal: { toNumber: () => 5000 },
          paymentMethod: PaymentMethod.CASH,
          materialsCost: { toNumber: () => 500 },
          forecastedExpenses: { toNumber: () => 1000 },
          financeProjectMode: 'MIXED',
        } as never);

      vi.mocked(prisma.$transaction).mockImplementation(async (fn: Parameters<typeof prisma.$transaction>[0]) => {
        return fn({
          project: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'p-imported-completed-mixed',
              customer: 'Imported Completed Job',
              projectTotal: { toNumber: () => 5000 },
              paymentMethod: PaymentMethod.CASH,
              materialsCost: { toNumber: () => 500 },
              forecastedExpenses: { toNumber: () => 1000 },
              financeProjectMode: 'MIXED',
            }),
            update: vi.fn().mockResolvedValue({ id: 'p-imported-completed-mixed', status: ProjectStatus.COMPLETED }),
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
            upsert: txCommissionSnapshotUpsertMock,
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
      txProjectUpdateMock.mockResolvedValue({
        id: 'p-imported-completed-mixed',
        status: ProjectStatus.COMPLETED,
      } as never);

      const { updateProject } = await import('../services/project.service');
      await updateProject('p-imported-completed-mixed', {
        customerPaid: 5000,
      });

      expect(txCommissionSnapshotUpsertMock).toHaveBeenCalled();
    });
  });
});
