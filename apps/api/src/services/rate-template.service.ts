import { prisma } from '../lib/prisma';

export async function listActiveRateTemplates() {
  const templates = await prisma.rateTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ fenceType: 'asc' }, { name: 'asc' }],
  });

  return templates.map((t) => ({
    id: t.id,
    fenceType: t.fenceType,
    name: t.name,
    ratePerFoot: Number(t.ratePerFoot),
    laborRatePerFoot: Number(t.laborRatePerFoot),
    description: t.description,
    isActive: t.isActive,
  }));
}
