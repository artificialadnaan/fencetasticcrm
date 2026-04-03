import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  type CreateWorkOrderDTO,
  type UpdateWorkOrderDTO,
} from '@fencetastic/shared';
import { AppError } from '../middleware/error-handler';

// Helper: convert Prisma Decimal to number
function d(val: Prisma.Decimal | null | undefined): number {
  if (val == null) return 0;
  if (typeof (val as unknown as { toNumber?: () => number }).toNumber === 'function') {
    return (val as unknown as { toNumber: () => number }).toNumber();
  }
  return Number(val);
}

function serializeSegments(
  segments: Array<{
    id: string;
    segmentNumber: number;
    fenceType: string;
    style: string;
    height: Prisma.Decimal;
    linearFeet: Prisma.Decimal;
    steps: Prisma.JsonValue;
    additions: Prisma.JsonValue;
    customAdditions: Prisma.JsonValue;
    notes: string | null;
  }>
) {
  return segments.map((s) => ({
    id: s.id,
    segmentNumber: s.segmentNumber,
    fenceType: s.fenceType,
    style: s.style,
    height: d(s.height),
    linearFeet: d(s.linearFeet),
    steps: s.steps as Array<{ position: number; height: number }> | null,
    additions: s.additions as string[],
    customAdditions: s.customAdditions as string[],
    notes: s.notes,
  }));
}

function buildSegmentCreateMany(segments: CreateWorkOrderDTO['segments']) {
  return segments.map((s) => ({
    segmentNumber: s.segmentNumber,
    fenceType: s.fenceType,
    style: s.style,
    height: s.height,
    linearFeet: s.linearFeet,
    steps: s.steps != null ? (s.steps as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
    additions: s.additions as unknown as Prisma.InputJsonValue,
    customAdditions: s.customAdditions as unknown as Prisma.InputJsonValue,
    notes: s.notes ?? null,
  }));
}

export async function getWorkOrder(projectId: string) {
  const workOrder = await prisma.workOrder.findFirst({
    where: { projectId },
    include: {
      segments: {
        orderBy: { segmentNumber: 'asc' },
      },
    },
  });

  if (!workOrder) return null;

  return {
    id: workOrder.id,
    projectId: workOrder.projectId,
    drawingData: workOrder.drawingData as Record<string, unknown>,
    propertyNotes: workOrder.propertyNotes,
    createdAt: workOrder.createdAt.toISOString(),
    updatedAt: workOrder.updatedAt.toISOString(),
    segments: serializeSegments(workOrder.segments),
  };
}

export async function createWorkOrder(projectId: string, dto: CreateWorkOrderDTO) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.isDeleted) {
    throw new AppError(404, 'Project not found', 'PROJECT_NOT_FOUND');
  }

  const existing = await prisma.workOrder.findFirst({ where: { projectId } });
  if (existing) {
    throw new AppError(409, 'Work order already exists for this project', 'WORK_ORDER_EXISTS');
  }

  const drawingJson = JSON.stringify(dto.drawingData);
  if (drawingJson.length > 5 * 1024 * 1024) {
    throw new AppError(400, 'Drawing data exceeds 5MB limit', 'DRAWING_TOO_LARGE');
  }

  const workOrder = await prisma.workOrder.create({
    data: {
      projectId,
      drawingData: dto.drawingData as unknown as Prisma.InputJsonValue,
      propertyNotes: dto.propertyNotes ?? null,
      segments: {
        create: buildSegmentCreateMany(dto.segments),
      },
    },
  });

  return { id: workOrder.id };
}

export async function updateWorkOrder(workOrderId: string, dto: UpdateWorkOrderDTO) {
  const existing = await prisma.workOrder.findUnique({ where: { id: workOrderId } });
  if (!existing) {
    throw new AppError(404, 'Work order not found', 'WORK_ORDER_NOT_FOUND');
  }

  if (dto.drawingData !== undefined) {
    const drawingJson = JSON.stringify(dto.drawingData);
    if (drawingJson.length > 5 * 1024 * 1024) {
      throw new AppError(400, 'Drawing data exceeds 5MB limit', 'DRAWING_TOO_LARGE');
    }
  }

  const updateData: Prisma.WorkOrderUpdateInput = {};
  if (dto.drawingData !== undefined) {
    updateData.drawingData = dto.drawingData as unknown as Prisma.InputJsonValue;
  }
  if (dto.propertyNotes !== undefined) updateData.propertyNotes = dto.propertyNotes;

  const workOrder = await prisma.$transaction(async (tx) => {
    if (dto.segments !== undefined) {
      await tx.fenceSegment.deleteMany({ where: { workOrderId } });
      updateData.segments = {
        create: buildSegmentCreateMany(dto.segments),
      };
    }

    return tx.workOrder.update({
      where: { id: workOrderId },
      data: updateData,
    });
  });

  return { id: workOrder.id };
}

export async function deleteWorkOrder(workOrderId: string) {
  const existing = await prisma.workOrder.findUnique({ where: { id: workOrderId } });
  if (!existing) {
    throw new AppError(404, 'Work order not found', 'WORK_ORDER_NOT_FOUND');
  }

  await prisma.workOrder.delete({ where: { id: workOrderId } });
}

export async function getWorkOrderForPdf(workOrderId: string) {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      project: {
        select: {
          customer: true,
          address: true,
          description: true,
        },
      },
      segments: {
        orderBy: { segmentNumber: 'asc' },
      },
    },
  });

  if (!workOrder) {
    throw new AppError(404, 'Work order not found', 'WORK_ORDER_NOT_FOUND');
  }

  return {
    id: workOrder.id,
    projectId: workOrder.projectId,
    drawingData: workOrder.drawingData as Record<string, unknown>,
    propertyNotes: workOrder.propertyNotes,
    project: workOrder.project,
    segments: serializeSegments(workOrder.segments),
  };
}
