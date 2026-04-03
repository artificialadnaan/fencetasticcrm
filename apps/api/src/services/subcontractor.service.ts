import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error-handler';
import type { CreateSubcontractorPaymentDTO, UpdateSubcontractorPaymentDTO } from '@fencetastic/shared';

function d(val: { toNumber?: () => number } | number | null | undefined): number {
  if (val == null) return 0;
  if (typeof (val as { toNumber?: () => number }).toNumber === 'function') {
    return (val as { toNumber: () => number }).toNumber();
  }
  return Number(val);
}

export async function addSubcontractorPayment(
  projectId: string,
  dto: CreateSubcontractorPaymentDTO
) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.isDeleted) {
    throw new AppError(404, 'Project not found', 'PROJECT_NOT_FOUND');
  }

  const sub = await prisma.subcontractorPayment.create({
    data: {
      projectId,
      subcontractorName: dto.subcontractorName,
      amountOwed: dto.amountOwed,
      amountPaid: dto.amountPaid ?? 0,
      datePaid: dto.datePaid ? new Date(dto.datePaid) : null,
      notes: dto.notes ?? null,
    },
  });

  return {
    id: sub.id,
    projectId: sub.projectId,
    subcontractorName: sub.subcontractorName,
    amountOwed: d(sub.amountOwed),
    amountPaid: d(sub.amountPaid),
    datePaid: sub.datePaid?.toISOString().split('T')[0] ?? null,
    notes: sub.notes,
  };
}

export async function updateSubcontractorPayment(
  subId: string,
  dto: UpdateSubcontractorPaymentDTO
) {
  const existing = await prisma.subcontractorPayment.findUnique({ where: { id: subId } });
  if (!existing) {
    throw new AppError(404, 'Subcontractor payment not found', 'SUB_NOT_FOUND');
  }

  const sub = await prisma.subcontractorPayment.update({
    where: { id: subId },
    data: {
      ...(dto.subcontractorName !== undefined && { subcontractorName: dto.subcontractorName }),
      ...(dto.amountOwed !== undefined && { amountOwed: dto.amountOwed }),
      ...(dto.amountPaid !== undefined && { amountPaid: dto.amountPaid }),
      ...(dto.datePaid !== undefined && { datePaid: dto.datePaid ? new Date(dto.datePaid) : null }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    },
  });

  return {
    id: sub.id,
    projectId: sub.projectId,
    subcontractorName: sub.subcontractorName,
    amountOwed: d(sub.amountOwed),
    amountPaid: d(sub.amountPaid),
    datePaid: sub.datePaid?.toISOString().split('T')[0] ?? null,
    notes: sub.notes,
  };
}

export async function deleteSubcontractorPayment(subId: string) {
  const existing = await prisma.subcontractorPayment.findUnique({ where: { id: subId } });
  if (!existing) {
    throw new AppError(404, 'Subcontractor payment not found', 'SUB_NOT_FOUND');
  }
  await prisma.subcontractorPayment.delete({ where: { id: subId } });
}
