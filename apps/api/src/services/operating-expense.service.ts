import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error-handler';

function serialize(e: {
  id: string;
  category: string;
  description: string;
  amount: { toNumber?: () => number } | number;
  frequency: string;
  isActive: boolean;
}) {
  const amt = e.amount;
  const amount =
    typeof amt === 'object' && amt != null && typeof (amt as { toNumber?: () => number }).toNumber === 'function'
      ? (amt as { toNumber: () => number }).toNumber()
      : Number(amt);
  return {
    id: e.id,
    category: e.category,
    description: e.description,
    amount,
    frequency: e.frequency,
    isActive: e.isActive,
  };
}

export async function listOperatingExpenses() {
  const rows = await prisma.operatingExpense.findMany({
    where: { isActive: true },
    orderBy: [{ category: 'asc' }, { description: 'asc' }],
  });
  return rows.map(serialize);
}

export async function createOperatingExpense(dto: {
  category: string;
  description: string;
  amount: number;
  frequency: string;
}) {
  const row = await prisma.operatingExpense.create({
    data: {
      category: dto.category,
      description: dto.description,
      amount: dto.amount,
      frequency: dto.frequency as 'MONTHLY' | 'QUARTERLY' | 'ANNUAL',
    },
  });
  return serialize(row);
}

export async function updateOperatingExpense(
  id: string,
  dto: {
    category?: string;
    description?: string;
    amount?: number;
    frequency?: string;
  }
) {
  const existing = await prisma.operatingExpense.findUnique({ where: { id } });
  if (!existing || !existing.isActive) {
    throw new AppError(404, 'Operating expense not found', 'NOT_FOUND');
  }

  const data: Record<string, unknown> = {};
  if (dto.category !== undefined) data.category = dto.category;
  if (dto.description !== undefined) data.description = dto.description;
  if (dto.amount !== undefined) data.amount = dto.amount;
  if (dto.frequency !== undefined) data.frequency = dto.frequency;

  const row = await prisma.operatingExpense.update({ where: { id }, data });
  return serialize(row);
}

export async function deactivateOperatingExpense(id: string) {
  const existing = await prisma.operatingExpense.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'Operating expense not found', 'NOT_FOUND');
  }
  await prisma.operatingExpense.update({
    where: { id },
    data: { isActive: false },
  });
}
