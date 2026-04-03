import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error-handler';

function serialize(t: {
  id: string;
  fenceType: string;
  name: string;
  ratePerFoot: { toNumber?: () => number } | number;
  laborRatePerFoot: { toNumber?: () => number } | number;
  description: string | null;
  isActive: boolean;
}) {
  const toNum = (v: { toNumber?: () => number } | number) =>
    typeof v === 'object' && v != null && typeof (v as { toNumber?: () => number }).toNumber === 'function'
      ? (v as { toNumber: () => number }).toNumber()
      : Number(v);
  return {
    id: t.id,
    fenceType: t.fenceType,
    name: t.name,
    ratePerFoot: toNum(t.ratePerFoot),
    laborRatePerFoot: toNum(t.laborRatePerFoot),
    description: t.description,
    isActive: t.isActive,
  };
}

export async function listActiveRateTemplates() {
  const templates = await prisma.rateTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ fenceType: 'asc' }, { name: 'asc' }],
  });
  return templates.map(serialize);
}

export async function createRateTemplate(dto: {
  fenceType: string;
  name: string;
  ratePerFoot: number;
  laborRatePerFoot: number;
  description?: string | null;
}) {
  const t = await prisma.rateTemplate.create({
    data: {
      fenceType: dto.fenceType as 'WOOD' | 'METAL' | 'CHAIN_LINK' | 'VINYL' | 'GATE' | 'OTHER',
      name: dto.name,
      ratePerFoot: dto.ratePerFoot,
      laborRatePerFoot: dto.laborRatePerFoot,
      description: dto.description ?? null,
    },
  });
  return serialize(t);
}

export async function updateRateTemplate(
  id: string,
  dto: {
    fenceType?: string;
    name?: string;
    ratePerFoot?: number;
    laborRatePerFoot?: number;
    description?: string | null;
  }
) {
  const existing = await prisma.rateTemplate.findUnique({ where: { id } });
  if (!existing || !existing.isActive) {
    throw new AppError(404, 'Rate template not found', 'NOT_FOUND');
  }

  const data: Record<string, unknown> = {};
  if (dto.fenceType !== undefined) data.fenceType = dto.fenceType;
  if (dto.name !== undefined) data.name = dto.name;
  if (dto.ratePerFoot !== undefined) data.ratePerFoot = dto.ratePerFoot;
  if (dto.laborRatePerFoot !== undefined) data.laborRatePerFoot = dto.laborRatePerFoot;
  if (dto.description !== undefined) data.description = dto.description;

  const t = await prisma.rateTemplate.update({ where: { id }, data });
  return serialize(t);
}

export async function deactivateRateTemplate(id: string) {
  const existing = await prisma.rateTemplate.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'Rate template not found', 'NOT_FOUND');
  }
  await prisma.rateTemplate.update({
    where: { id },
    data: { isActive: false },
  });
}
