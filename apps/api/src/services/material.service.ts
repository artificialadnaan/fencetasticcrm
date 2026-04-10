import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error-handler';
import { calculateCommission } from '@fencetastic/shared';
import type { CreateMaterialLineItemDTO, UpdateMaterialLineItemDTO, PaymentMethod } from '@fencetastic/shared';

// Helper: convert Prisma Decimal to number
function d(val: Prisma.Decimal | null | undefined): number {
  if (val == null) return 0;
  if (typeof (val as unknown as { toNumber?: () => number }).toNumber === 'function') {
    return (val as unknown as { toNumber: () => number }).toNumber();
  }
  return Number(val);
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

function mapLineItem(m: {
  id: string;
  projectId: string;
  description: string;
  category: string;
  vendor: string | null;
  quantity: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  totalCost: Prisma.Decimal;
  purchaseDate: Date;
  transactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: m.id,
    projectId: m.projectId,
    description: m.description,
    category: m.category,
    vendor: m.vendor,
    quantity: d(m.quantity),
    unitCost: d(m.unitCost),
    totalCost: d(m.totalCost),
    purchaseDate: m.purchaseDate instanceof Date ? m.purchaseDate.toISOString().split('T')[0] : m.purchaseDate,
    transactionId: m.transactionId,
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
    updatedAt: m.updatedAt instanceof Date ? m.updatedAt.toISOString() : m.updatedAt,
  };
}

export async function listByProject(projectId: string) {
  const items = await prisma.materialLineItem.findMany({
    where: { projectId },
    orderBy: { purchaseDate: 'desc' },
  });
  return items.map(mapLineItem);
}

export async function createMaterialLineItems(
  projectId: string,
  items: CreateMaterialLineItemDTO[]
) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.isDeleted) {
    throw new AppError(404, 'Project not found', 'PROJECT_NOT_FOUND');
  }

  // Run validation + inserts atomically to prevent TOCTOU races.
  // Serializable isolation ensures the allocation-cap read sees a consistent snapshot
  // even under concurrent requests — no two transactions can both pass validation
  // for the same transaction's cap.
  const created = await prisma.$transaction(async (tx) => {
    // Track cumulative allocations within this batch per transactionId
    const batchAllocations = new Map<string, number>();

    for (const item of items) {
      if (item.transactionId) {
        const batchTotal = batchAllocations.get(item.transactionId) ?? 0;
        const itemTotal = roundMoney(item.quantity * item.unitCost);
        await validateTransactionLink(projectId, item.transactionId, itemTotal + batchTotal, undefined, tx);
        batchAllocations.set(item.transactionId, batchTotal + itemTotal);
      }
    }

    return Promise.all(
      items.map((item) =>
        tx.materialLineItem.create({
          data: {
            projectId,
            description: item.description,
            category: item.category,
            vendor: item.vendor ?? null,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: roundMoney(item.quantity * item.unitCost),
            purchaseDate: new Date(item.purchaseDate),
            transactionId: item.transactionId ?? null,
          },
        })
      )
    );
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });

  return created.map(mapLineItem);
}

export async function updateMaterialLineItem(id: string, dto: UpdateMaterialLineItemDTO) {
  // Wrap validation + update in a serializable transaction to prevent concurrent
  // requests from both passing the allocation-cap check against stale data.
  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.materialLineItem.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, 'Material line item not found', 'MATERIAL_LINE_ITEM_NOT_FOUND');
    }

    const newQuantity = dto.quantity !== undefined ? dto.quantity : d(existing.quantity);
    const newUnitCost = dto.unitCost !== undefined ? dto.unitCost : d(existing.unitCost);
    const newTotalCost = roundMoney(newQuantity * newUnitCost);

    // Revalidate whenever a transactionId is set — quantity/unitCost changes affect allocation
    const effectiveTransactionId =
      dto.transactionId !== undefined ? dto.transactionId : existing.transactionId;

    if (effectiveTransactionId) {
      await validateTransactionLink(
        existing.projectId,
        effectiveTransactionId,
        newTotalCost,
        id,
        tx
      );
    }

    return tx.materialLineItem.update({
      where: { id },
      data: {
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.vendor !== undefined && { vendor: dto.vendor }),
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.unitCost !== undefined && { unitCost: dto.unitCost }),
        totalCost: newTotalCost,
        ...(dto.purchaseDate !== undefined && { purchaseDate: new Date(dto.purchaseDate) }),
        ...(dto.transactionId !== undefined && { transactionId: dto.transactionId }),
      },
    });
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });

  return mapLineItem(updated);
}

export async function deleteMaterialLineItem(id: string) {
  const existing = await prisma.materialLineItem.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'Material line item not found', 'MATERIAL_LINE_ITEM_NOT_FOUND');
  }

  await prisma.materialLineItem.delete({ where: { id } });
}

type PrismaTxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

async function validateTransactionLink(
  projectId: string,
  transactionId: string,
  newItemTotal: number,
  excludeItemId?: string,
  tx?: PrismaTxClient
) {
  const db = tx ?? prisma;

  const transaction = await db.transaction.findUnique({
    where: { id: transactionId },
  });
  if (!transaction) {
    throw new AppError(404, 'Transaction not found', 'TRANSACTION_NOT_FOUND');
  }

  if (transaction.type !== 'EXPENSE') {
    throw new AppError(
      400,
      'Transaction must be of type EXPENSE to link material line items',
      'TRANSACTION_NOT_EXPENSE'
    );
  }

  if (transaction.projectId !== null && transaction.projectId !== projectId) {
    throw new AppError(
      400,
      'Transaction belongs to a different project',
      'TRANSACTION_PROJECT_MISMATCH'
    );
  }

  const existingAgg = await db.materialLineItem.aggregate({
    where: {
      transactionId,
      ...(excludeItemId ? { id: { not: excludeItemId } } : {}),
    },
    _sum: { totalCost: true },
  });

  const existingTotal = d(existingAgg._sum.totalCost);
  const transactionAmount = d(transaction.amount);

  if (existingTotal + newItemTotal > transactionAmount) {
    throw new AppError(
      400,
      `Allocation cap exceeded: existing ${existingTotal} + new ${newItemTotal} > transaction amount ${transactionAmount}`,
      'ALLOCATION_CAP_EXCEEDED'
    );
  }
}

export async function getProjectMaterialSummary(projectId: string) {
  const items = await prisma.materialLineItem.findMany({
    where: { projectId },
    select: { totalCost: true },
  });

  if (items.length > 0) {
    const total = roundMoney(items.reduce((sum, item) => sum + d(item.totalCost), 0));
    return { total, lineItemCount: items.length, isLegacy: false };
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { materialsCost: true },
  });

  return {
    total: d(project?.materialsCost),
    lineItemCount: 0,
    isLegacy: true,
  };
}

export async function getProjectFinancialSummary(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      materialLineItems: { select: { totalCost: true } },
      subcontractorPayments: { select: { amountOwed: true, amountPaid: true } },
      transactions: {
        where: { type: 'EXPENSE' },
        select: { amount: true, materialLineItems: { select: { totalCost: true } } },
      },
      commissionSnapshot: true,
    },
  });

  if (!project) return null;

  // Materials: line items or legacy fallback
  const materialTotal = project.materialLineItems.length > 0
    ? project.materialLineItems.reduce((s, m) => s + d(m.totalCost), 0)
    : d(project.materialsCost);

  // Subs
  const subTotal = project.subcontractorPayments.reduce((s, sp) => s + d(sp.amountPaid), 0);

  // Other expenses (transaction amounts minus linked material line item totals)
  let otherExpenses = 0;
  for (const txn of project.transactions) {
    const linkedTotal = txn.materialLineItems.reduce((s, m) => s + d(m.totalCost), 0);
    otherExpenses += d(txn.amount) - linkedTotal;
  }

  // Commissions: snapshot if settled, live calc if not
  let commissionsAdnaan: number;
  let commissionsMeme: number;
  if (project.commissionSnapshot) {
    commissionsAdnaan = d(project.commissionSnapshot.adnaanCommission);
    commissionsMeme = d(project.commissionSnapshot.memeCommission);
  } else {
    const subOwedTotal = project.subcontractorPayments.reduce((s, sp) => s + d(sp.amountOwed), 0);
    const lastLedger = await prisma.aimannDebtLedger.findFirst({ orderBy: { date: 'desc' } });
    const aimannDebtBalance = lastLedger ? d(lastLedger.runningBalance) : 0;
    const projectExpenseTotal = project.transactions.reduce((s, t) => s + d(t.amount), 0);
    const expenseOverride = materialTotal + subOwedTotal > 0
      ? Math.max(projectExpenseTotal, materialTotal + subOwedTotal)
      : undefined;
    const calc = calculateCommission({
      projectTotal: d(project.projectTotal),
      paymentMethod: project.paymentMethod as PaymentMethod,
      materialsCost: materialTotal,
      subOwedTotal,
      expenseOverride,
      aimannDebtBalance,
    });
    commissionsAdnaan = calc.adnaanCommission;
    commissionsMeme = calc.memeCommission;
  }

  const revenue = d(project.moneyReceived);
  const totalCommissions = commissionsAdnaan + commissionsMeme;
  const totalCosts = materialTotal + subTotal + otherExpenses + totalCommissions;
  const profit = roundMoney(revenue - totalCosts);
  const marginPct = revenue > 0 ? roundMoney((profit / revenue) * 100) : 0;

  return {
    materials: roundMoney(materialTotal),
    materialLineItemCount: project.materialLineItems.length,
    subcontractors: roundMoney(subTotal),
    otherExpenses: roundMoney(otherExpenses),
    commissionsAdnaan: roundMoney(commissionsAdnaan),
    commissionsMeme: roundMoney(commissionsMeme),
    totalCommissions: roundMoney(totalCommissions),
    revenue: roundMoney(revenue),
    profit,
    marginPct,
    isLegacyMaterials: project.materialLineItems.length === 0,
  };
}
