import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  calculateCommission,
  PaymentMethod,
  ProjectStatus,
  FenceType,
  CC_FEE_RATE,
  type CreateProjectDTO,
  type UpdateProjectDTO,
  type ProjectListQuery,
  type ProjectListItem,
  type CommissionPreview,
} from '@fencetastic/shared';
import { AppError } from '../middleware/error-handler';

// Helper: convert Prisma Decimal to number
function d(val: Prisma.Decimal | null | undefined): number {
  if (!val) return 0;
  // Handle Prisma Decimal objects (which have toNumber()) and plain numbers
  if (typeof (val as unknown as { toNumber?: () => number }).toNumber === 'function') {
    return (val as unknown as { toNumber: () => number }).toNumber();
  }
  return Number(val);
}

// Helper: calculate moneyReceived from projectTotal + paymentMethod
function calcMoneyReceived(projectTotal: number, paymentMethod: string): number {
  if (paymentMethod === PaymentMethod.CREDIT_CARD) {
    return Number((projectTotal * (1 - CC_FEE_RATE)).toFixed(2));
  }
  return projectTotal;
}

// Helper: build commission preview for a project
async function buildCommissionPreview(
  projectId: string,
  projectTotal: number,
  paymentMethod: string,
  materialsCost: number
): Promise<CommissionPreview> {
  const subAgg = await prisma.subcontractorPayment.aggregate({
    where: { projectId },
    _sum: { amountOwed: true },
  });
  const subOwedTotal = d(subAgg._sum.amountOwed);

  // Get current Aimann debt balance
  const lastLedger = await prisma.aimannDebtLedger.findFirst({
    orderBy: { date: 'desc' },
  });
  const aimannDebtBalance = lastLedger ? d(lastLedger.runningBalance) : 0;

  const breakdown = calculateCommission({
    projectTotal,
    paymentMethod: paymentMethod as PaymentMethod,
    materialsCost,
    subOwedTotal,
    aimannDebtBalance,
  });

  const profitPercent =
    projectTotal > 0
      ? Number(((breakdown.netProfit / projectTotal) * 100).toFixed(1))
      : 0;

  return { ...breakdown, profitPercent };
}

export async function listProjects(query: ProjectListQuery = {}) {
  const {
    page = 1,
    limit = 20,
    sortBy = 'installDate',
    sortDir = 'desc',
    status,
    fenceType,
    search,
    dateFrom,
    dateTo,
  } = query;

  const where: Prisma.ProjectWhereInput = {
    isDeleted: false,
  };

  if (status) {
    where.status = status;
  }

  if (fenceType) {
    where.fenceType = fenceType;
  }

  if (search) {
    where.OR = [
      { customer: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (dateFrom || dateTo) {
    where.installDate = {};
    if (dateFrom) {
      where.installDate.gte = new Date(dateFrom);
    }
    if (dateTo) {
      where.installDate.lte = new Date(dateTo);
    }
  }

  // Map sortBy to Prisma field names
  const sortFieldMap: Record<string, string> = {
    customer: 'customer',
    address: 'address',
    fenceType: 'fenceType',
    status: 'status',
    projectTotal: 'projectTotal',
    installDate: 'installDate',
    createdAt: 'createdAt',
  };
  const orderField = sortFieldMap[sortBy] || 'installDate';

  const [projects, total, latestDebt] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        subcontractorPayments: {
          select: { amountOwed: true },
        },
      },
      orderBy: { [orderField]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.project.count({ where }),
    prisma.aimannDebtLedger.findFirst({
      orderBy: { date: 'desc' },
      select: { runningBalance: true },
    }),
  ]);

  const currentDebtBalance = latestDebt ? d(latestDebt.runningBalance) : 0;

  const data: ProjectListItem[] = projects.map((p) => {
    const projectTotal = d(p.projectTotal);
    const moneyReceived = d(p.moneyReceived);
    const customerPaid = d(p.customerPaid);
    const materialsCost = d(p.materialsCost);
    const subOwedTotal = p.subcontractorPayments.reduce(
      (sum, sp) => sum + d(sp.amountOwed),
      0
    );

    // Commission calc for list view profit % using actual current debt balance
    const breakdown = calculateCommission({
      projectTotal,
      paymentMethod: p.paymentMethod as PaymentMethod,
      materialsCost,
      subOwedTotal,
      aimannDebtBalance: currentDebtBalance,
    });

    const profitPercent =
      projectTotal > 0
        ? Number(((breakdown.netProfit / projectTotal) * 100).toFixed(1))
        : 0;

    return {
      id: p.id,
      customer: p.customer,
      address: p.address,
      fenceType: p.fenceType as FenceType,
      status: p.status as ProjectStatus,
      projectTotal,
      moneyReceived,
      customerPaid,
      installDate: p.installDate.toISOString().split('T')[0],
      receivable: Number((projectTotal - customerPaid).toFixed(2)),
      profitPercent,
    };
  });

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getProjectById(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      subcontractorPayments: true,
      projectNotes: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
      commissionSnapshot: true,
    },
  });

  if (!project || project.isDeleted) {
    throw new AppError(404, 'Project not found', 'PROJECT_NOT_FOUND');
  }

  const projectTotal = d(project.projectTotal);
  const materialsCost = d(project.materialsCost);

  // For completed projects, use snapshot. For others, compute live.
  let commissionPreview: CommissionPreview;
  if (project.status === 'COMPLETED' && project.commissionSnapshot) {
    const snap = project.commissionSnapshot;
    commissionPreview = {
      moneyReceived: d(snap.moneyReceived),
      totalExpenses: d(snap.totalExpenses),
      adnaanCommission: d(snap.adnaanCommission),
      memeCommission: d(snap.memeCommission),
      grossProfit: d(snap.grossProfit),
      aimannDeduction: d(snap.aimannDeduction),
      netProfit: d(snap.netProfit),
      profitPercent:
        projectTotal > 0
          ? Number(((d(snap.netProfit) / projectTotal) * 100).toFixed(1))
          : 0,
    };
  } else {
    commissionPreview = await buildCommissionPreview(
      project.id,
      projectTotal,
      project.paymentMethod,
      materialsCost
    );
  }

  // Serialize the project
  return {
    id: project.id,
    customer: project.customer,
    address: project.address,
    description: project.description,
    fenceType: project.fenceType,
    status: project.status,
    projectTotal,
    paymentMethod: project.paymentMethod,
    moneyReceived: d(project.moneyReceived),
    customerPaid: d(project.customerPaid),
    forecastedExpenses: d(project.forecastedExpenses),
    materialsCost,
    contractDate: project.contractDate.toISOString().split('T')[0],
    installDate: project.installDate.toISOString().split('T')[0],
    completedDate: project.completedDate?.toISOString().split('T')[0] ?? null,
    estimateDate: project.estimateDate?.toISOString().split('T')[0] ?? null,
    followUpDate: project.followUpDate?.toISOString().split('T')[0] ?? null,
    linearFeet: project.linearFeet ? d(project.linearFeet) : null,
    rateTemplateId: project.rateTemplateId,
    subcontractor: project.subcontractor,
    notes: project.notes,
    createdById: project.createdById,
    isDeleted: project.isDeleted,
    deletedAt: project.deletedAt?.toISOString() ?? null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    subcontractorPayments: project.subcontractorPayments.map((sp) => ({
      id: sp.id,
      projectId: sp.projectId,
      subcontractorName: sp.subcontractorName,
      amountOwed: d(sp.amountOwed),
      amountPaid: d(sp.amountPaid),
      datePaid: sp.datePaid?.toISOString().split('T')[0] ?? null,
      notes: sp.notes,
    })),
    projectNotes: project.projectNotes.map((n) => ({
      id: n.id,
      projectId: n.projectId,
      authorId: n.authorId,
      content: n.content,
      photoUrls: n.photoUrls,
      createdAt: n.createdAt.toISOString(),
      author: n.author,
    })),
    commissionSnapshot: project.commissionSnapshot
      ? {
          id: project.commissionSnapshot.id,
          projectId: project.commissionSnapshot.projectId,
          moneyReceived: d(project.commissionSnapshot.moneyReceived),
          totalExpenses: d(project.commissionSnapshot.totalExpenses),
          adnaanCommission: d(project.commissionSnapshot.adnaanCommission),
          memeCommission: d(project.commissionSnapshot.memeCommission),
          grossProfit: d(project.commissionSnapshot.grossProfit),
          aimannDeduction: d(project.commissionSnapshot.aimannDeduction),
          debtBalanceBefore: d(project.commissionSnapshot.debtBalanceBefore),
          debtBalanceAfter: d(project.commissionSnapshot.debtBalanceAfter),
          netProfit: d(project.commissionSnapshot.netProfit),
          settledAt: project.commissionSnapshot.settledAt.toISOString(),
        }
      : null,
    commissionPreview,
  };
}

// Shared helper: generate commission snapshot + debt ledger entry for a completed project.
// Must be called inside a serializable Prisma interactive transaction (tx).
async function generateCommissionSnapshot(
  projectId: string,
  tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>
): Promise<void> {
  const project = await tx.project.findUnique({ where: { id: projectId } });
  if (!project) throw new AppError(404, 'Project not found', 'PROJECT_NOT_FOUND');

  const subAgg = await tx.subcontractorPayment.aggregate({
    where: { projectId },
    _sum: { amountOwed: true },
  });
  const subOwedTotal = subAgg._sum.amountOwed ? Number(subAgg._sum.amountOwed) : 0;

  // Lock the latest debt ledger row to prevent race conditions
  const lastLedgerRows = await tx.$queryRaw<Array<{ runningBalance: string }>>`
    SELECT "runningBalance"
    FROM "AimannDebtLedger"
    ORDER BY "date" DESC
    LIMIT 1
    FOR UPDATE
  `;
  const aimannDebtBalance = lastLedgerRows.length > 0 ? Number(lastLedgerRows[0].runningBalance) : 0;

  const projectTotal = Number(project.projectTotal);
  const materialsCost = Number(project.materialsCost);

  const breakdown = calculateCommission({
    projectTotal,
    paymentMethod: project.paymentMethod as PaymentMethod,
    materialsCost,
    subOwedTotal,
    aimannDebtBalance,
  });

  const debtBalanceAfter = Number(
    (aimannDebtBalance - breakdown.aimannDeduction).toFixed(2)
  );

  // Upsert commission snapshot — handles re-completion of reopened projects
  await tx.commissionSnapshot.upsert({
    where: { projectId },
    create: {
      projectId,
      moneyReceived: breakdown.moneyReceived,
      totalExpenses: breakdown.totalExpenses,
      adnaanCommission: breakdown.adnaanCommission,
      memeCommission: breakdown.memeCommission,
      grossProfit: breakdown.grossProfit,
      aimannDeduction: breakdown.aimannDeduction,
      debtBalanceBefore: aimannDebtBalance,
      debtBalanceAfter,
      netProfit: breakdown.netProfit,
    },
    update: {
      moneyReceived: breakdown.moneyReceived,
      totalExpenses: breakdown.totalExpenses,
      adnaanCommission: breakdown.adnaanCommission,
      memeCommission: breakdown.memeCommission,
      grossProfit: breakdown.grossProfit,
      aimannDeduction: breakdown.aimannDeduction,
      debtBalanceBefore: aimannDebtBalance,
      debtBalanceAfter,
      netProfit: breakdown.netProfit,
      settledAt: new Date(),
    },
  });

  // Write debt ledger entry if deduction > 0
  if (breakdown.aimannDeduction > 0) {
    await tx.aimannDebtLedger.create({
      data: {
        projectId,
        amount: -breakdown.aimannDeduction,
        runningBalance: debtBalanceAfter,
        note: `Commission deduction from project: ${project.customer} - ${project.address}`,
        date: new Date(),
      },
    });
  }
}

export async function createProject(dto: CreateProjectDTO, createdById: string) {
  const moneyReceived = calcMoneyReceived(dto.projectTotal, dto.paymentMethod);
  const status = dto.status || ProjectStatus.ESTIMATE;

  const project = await prisma.project.create({
    data: {
      customer: dto.customer,
      address: dto.address,
      description: dto.description,
      fenceType: dto.fenceType,
      status,
      projectTotal: dto.projectTotal,
      paymentMethod: dto.paymentMethod,
      moneyReceived,
      customerPaid: 0,
      forecastedExpenses: dto.forecastedExpenses,
      materialsCost: dto.materialsCost,
      contractDate: new Date(dto.contractDate),
      installDate: new Date(dto.installDate),
      completedDate: dto.completedDate ? new Date(dto.completedDate) : null,
      estimateDate: dto.estimateDate ? new Date(dto.estimateDate) : null,
      followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : null,
      linearFeet: dto.linearFeet ?? null,
      rateTemplateId: dto.rateTemplateId ?? null,
      subcontractor: dto.subcontractor ?? null,
      notes: dto.notes ?? null,
      createdById,
    },
  });

  // If created directly as COMPLETED, generate snapshot immediately
  if (status === ProjectStatus.COMPLETED) {
    await prisma.$transaction(
      async (tx) => {
        await generateCommissionSnapshot(project.id, tx);
      },
      { isolationLevel: 'Serializable' }
    );
  }

  return { id: project.id };
}

export async function updateProject(projectId: string, dto: UpdateProjectDTO) {
  // First, get current project to check status transition
  const current = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!current || current.isDeleted) {
    throw new AppError(404, 'Project not found', 'PROJECT_NOT_FOUND');
  }

  // Completed projects are locked — only allow status, notes, and followUpDate changes
  if (current.status === ProjectStatus.COMPLETED) {
    const allowedFields = ['status', 'notes', 'followUpDate'];
    const attemptedFields = Object.keys(dto);
    const blockedFields = attemptedFields.filter((f) => !allowedFields.includes(f));
    if (blockedFields.length > 0) {
      throw new AppError(
        400,
        `Cannot modify ${blockedFields.join(', ')} on a completed project`,
        'COMPLETED_LOCKED'
      );
    }
  }

  // Build update data — only set fields that were provided
  const updateData: Prisma.ProjectUpdateInput = {};

  if (dto.customer !== undefined) updateData.customer = dto.customer;
  if (dto.address !== undefined) updateData.address = dto.address;
  if (dto.description !== undefined) updateData.description = dto.description;
  if (dto.fenceType !== undefined) updateData.fenceType = dto.fenceType;
  if (dto.status !== undefined) updateData.status = dto.status;
  if (dto.projectTotal !== undefined) {
    updateData.projectTotal = dto.projectTotal;
    // Recalculate moneyReceived if projectTotal or paymentMethod changes
    const pm = dto.paymentMethod ?? current.paymentMethod;
    updateData.moneyReceived = calcMoneyReceived(dto.projectTotal, pm);
  }
  if (dto.paymentMethod !== undefined) {
    updateData.paymentMethod = dto.paymentMethod;
    // Recalculate moneyReceived if paymentMethod changes
    const pt = dto.projectTotal ?? d(current.projectTotal);
    updateData.moneyReceived = calcMoneyReceived(pt, dto.paymentMethod);
  }
  if (dto.forecastedExpenses !== undefined) updateData.forecastedExpenses = dto.forecastedExpenses;
  if (dto.materialsCost !== undefined) updateData.materialsCost = dto.materialsCost;
  if (dto.customerPaid !== undefined) updateData.customerPaid = dto.customerPaid;
  if (dto.contractDate !== undefined) updateData.contractDate = new Date(dto.contractDate);
  if (dto.installDate !== undefined) updateData.installDate = new Date(dto.installDate);
  if (dto.completedDate !== undefined) updateData.completedDate = dto.completedDate ? new Date(dto.completedDate) : null;
  if (dto.estimateDate !== undefined) updateData.estimateDate = dto.estimateDate ? new Date(dto.estimateDate) : null;
  if (dto.followUpDate !== undefined) updateData.followUpDate = dto.followUpDate ? new Date(dto.followUpDate) : null;
  if (dto.linearFeet !== undefined) updateData.linearFeet = dto.linearFeet;
  if (dto.rateTemplateId !== undefined) {
    updateData.rateTemplate = dto.rateTemplateId
      ? { connect: { id: dto.rateTemplateId } }
      : { disconnect: true };
  }
  if (dto.subcontractor !== undefined) updateData.subcontractor = dto.subcontractor;
  if (dto.notes !== undefined) updateData.notes = dto.notes;

  // Check if transitioning to COMPLETED
  const isCompletingNow =
    dto.status === ProjectStatus.COMPLETED &&
    current.status !== ProjectStatus.COMPLETED;

  if (isCompletingNow) {
    // Set completedDate if not explicitly provided
    if (!dto.completedDate) {
      updateData.completedDate = new Date();
    }

    // Use a serializable transaction: update project + upsert snapshot + write ledger
    return prisma.$transaction(
      async (tx) => {
        const updated = await tx.project.update({
          where: { id: projectId },
          data: updateData,
        });

        await generateCommissionSnapshot(projectId, tx);

        return { id: updated.id };
      },
      { isolationLevel: 'Serializable' }
    );
  }

  // Normal update (no status transition to COMPLETED)
  const updated = await prisma.project.update({
    where: { id: projectId },
    data: updateData,
  });

  return { id: updated.id };
}

export async function softDeleteProject(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project || project.isDeleted) {
    throw new AppError(404, 'Project not found', 'PROJECT_NOT_FOUND');
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });
}
