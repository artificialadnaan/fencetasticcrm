import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error-handler';
import type { DebtBalanceResponse, DebtLedgerEntry, DebtAdjustmentDTO } from '@fencetastic/shared';

// Helper: Prisma Decimal → number
function d(val: Prisma.Decimal | null | undefined): number {
  if (!val) return 0;
  if (typeof (val as unknown as { toNumber?: () => number }).toNumber === 'function') {
    return (val as unknown as { toNumber: () => number }).toNumber();
  }
  return Number(val);
}

export async function getDebtBalance(): Promise<DebtBalanceResponse> {
  const latest = await prisma.aimannDebtLedger.findFirst({
    orderBy: { date: 'desc' },
    select: { runningBalance: true },
  });

  return { balance: latest ? d(latest.runningBalance) : 0 };
}

export async function getDebtLedger(): Promise<DebtLedgerEntry[]> {
  const entries = await prisma.aimannDebtLedger.findMany({
    orderBy: { date: 'desc' },
    include: {
      project: { select: { customer: true } },
    },
  });

  return entries.map((e) => ({
    id: e.id,
    projectId: e.projectId,
    projectCustomer: e.project?.customer ?? null,
    amount: d(e.amount),
    runningBalance: d(e.runningBalance),
    note: e.note,
    date: e.date.toISOString(),
  }));
}

export async function createDebtAdjustment(dto: DebtAdjustmentDTO, userId: string): Promise<DebtLedgerEntry> {
  if (dto.amount === 0) {
    throw new AppError(400, 'Adjustment amount cannot be zero', 'INVALID_AMOUNT');
  }

  console.log(`[Debt Adjustment] User ${userId} added adjustment: $${dto.amount} — "${dto.note}"`);

  return prisma.$transaction(
    async (tx) => {
      // Lock latest row to prevent race conditions
      const latestRows = await tx.$queryRaw<Array<{ runningBalance: string }>>`
        SELECT "running_balance" AS "runningBalance"
        FROM "aimann_debt_ledger"
        ORDER BY "date" DESC
        LIMIT 1
        FOR UPDATE
      `;

      const currentBalance = latestRows.length > 0 ? Number(latestRows[0].runningBalance) : 0;
      const newBalance = Number((currentBalance + dto.amount).toFixed(2));

      const entry = await tx.aimannDebtLedger.create({
        data: {
          projectId: null,
          amount: dto.amount,
          runningBalance: newBalance,
          note: dto.note,
          date: new Date(),
        },
        include: {
          project: { select: { customer: true } },
        },
      });

      return {
        id: entry.id,
        projectId: entry.projectId,
        projectCustomer: entry.project?.customer ?? null,
        amount: d(entry.amount),
        runningBalance: d(entry.runningBalance),
        note: entry.note,
        date: entry.date.toISOString(),
      };
    },
    { isolationLevel: 'Serializable' }
  );
}
