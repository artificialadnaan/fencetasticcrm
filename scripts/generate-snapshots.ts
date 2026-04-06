import * as fs from 'fs';
import * as path from 'path';
import { Prisma, PrismaClient, ProjectStatus, TransactionType } from '@prisma/client';
import { calculateCommission, PaymentMethod } from '@fencetastic/shared';

function loadEnvFromApiApp(): void {
  if (process.env.DATABASE_URL) return;

  const envPath = path.resolve(__dirname, '../apps/api/.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

function d(value: Prisma.Decimal | null | undefined): number {
  if (!value) return 0;
  if (typeof (value as unknown as { toNumber?: () => number }).toNumber === 'function') {
    return (value as unknown as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

function formatDate(date: Date | null): string {
  return date ? date.toISOString().split('T')[0] : 'n/a';
}

async function getExpenseBasis(
  prisma: PrismaClient,
  projectId: string,
  fallbackExpense: number
): Promise<number> {
  const expenseAgg = await prisma.transaction.aggregate({
    where: {
      projectId,
      type: TransactionType.EXPENSE,
    },
    _sum: { amount: true },
    _count: { _all: true },
  });

  const hasActualExpenseRows = (expenseAgg._count?._all ?? 0) > 0;
  return hasActualExpenseRows ? d(expenseAgg._sum.amount) : fallbackExpense;
}

async function main() {
  loadEnvFromApiApp();

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set.');
  }

  const dryRun = process.argv.includes('--dry-run');
  const prisma = new PrismaClient();

  try {
    const projects = await prisma.project.findMany({
      where: {
        status: ProjectStatus.COMPLETED,
        isDeleted: false,
        commissionSnapshot: null,
      },
      include: {
        subcontractorPayments: {
          select: {
            amountOwed: true,
          },
        },
      },
      orderBy: [
        { completedDate: 'asc' },
        { installDate: 'asc' },
        { contractDate: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    if (projects.length === 0) {
      console.log('No completed projects without CommissionSnapshots were found.');
      return;
    }

    console.log(`Found ${projects.length} completed projects without CommissionSnapshots.`);

    let simulatedBalance = 0;
    const latestLedger = await prisma.aimannDebtLedger.findFirst({
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      select: { runningBalance: true },
    });
    simulatedBalance = latestLedger ? d(latestLedger.runningBalance) : 0;

    console.log(`Starting Aimann debt balance: $${simulatedBalance.toFixed(2)}`);

    let createdSnapshots = 0;
    let createdLedgerEntries = 0;
    let plannedLedgerEntries = 0;

    for (const [index, project] of projects.entries()) {
      const subOwedTotal = project.subcontractorPayments.reduce(
        (sum, payment) => sum + d(payment.amountOwed),
        0
      );
      const expenseBasis = await getExpenseBasis(
        prisma,
        project.id,
        d(project.forecastedExpenses)
      );
      const debtBalanceBefore = simulatedBalance;
      const breakdown = calculateCommission({
        projectTotal: d(project.projectTotal),
        paymentMethod: project.paymentMethod as PaymentMethod,
        materialsCost: d(project.materialsCost),
        subOwedTotal,
        expenseOverride: expenseBasis,
        aimannDebtBalance: debtBalanceBefore,
      });
      const debtBalanceAfter = roundMoney(debtBalanceBefore - breakdown.aimannDeduction);
      const settledAt =
        project.completedDate ??
        project.installDate ??
        project.contractDate ??
        project.createdAt;

      console.log(
        [
          `${dryRun ? 'DRY RUN' : 'PROCESS'} ${index + 1}/${projects.length}`,
          project.customer,
          formatDate(project.completedDate ?? project.installDate ?? project.contractDate),
          `aimann=${breakdown.aimannDeduction.toFixed(2)}`,
          `balance ${debtBalanceBefore.toFixed(2)} -> ${debtBalanceAfter.toFixed(2)}`,
        ].join(' | ')
      );

      if (breakdown.aimannDeduction !== 0) {
        plannedLedgerEntries++;
      }

      if (!dryRun) {
        await prisma.$transaction(async (tx) => {
          const existingSnapshot = await tx.commissionSnapshot.findUnique({
            where: { projectId: project.id },
            select: { id: true },
          });

          if (existingSnapshot) return;

          const latestRow = await tx.aimannDebtLedger.findFirst({
            orderBy: [{ date: 'desc' }, { id: 'desc' }],
            select: { runningBalance: true },
          });
          const liveDebtBefore = latestRow ? d(latestRow.runningBalance) : 0;
          const liveExpenseAgg = await tx.transaction.aggregate({
            where: {
              projectId: project.id,
              type: TransactionType.EXPENSE,
            },
            _sum: { amount: true },
            _count: { _all: true },
          });
          const hasActualExpenseRows = (liveExpenseAgg._count?._all ?? 0) > 0;
          const liveExpenseBasis = hasActualExpenseRows
            ? d(liveExpenseAgg._sum.amount)
            : d(project.forecastedExpenses);
          const liveBreakdown = calculateCommission({
            projectTotal: d(project.projectTotal),
            paymentMethod: project.paymentMethod as PaymentMethod,
            materialsCost: d(project.materialsCost),
            subOwedTotal,
            expenseOverride: liveExpenseBasis,
            aimannDebtBalance: liveDebtBefore,
          });
          const liveDebtAfter = roundMoney(liveDebtBefore - liveBreakdown.aimannDeduction);

          await tx.commissionSnapshot.create({
            data: {
              projectId: project.id,
              moneyReceived: liveBreakdown.moneyReceived,
              totalExpenses: liveBreakdown.totalExpenses,
              adnaanCommission: liveBreakdown.adnaanCommission,
              memeCommission: liveBreakdown.memeCommission,
              grossProfit: liveBreakdown.grossProfit,
              aimannDeduction: liveBreakdown.aimannDeduction,
              debtBalanceBefore: liveDebtBefore,
              debtBalanceAfter: liveDebtAfter,
              netProfit: liveBreakdown.netProfit,
              settledAt,
            },
          });

          createdSnapshots++;

          if (liveBreakdown.aimannDeduction !== 0) {
            await tx.aimannDebtLedger.create({
              data: {
                projectId: project.id,
                amount: -liveBreakdown.aimannDeduction,
                runningBalance: liveDebtAfter,
                note: `Commission snapshot backfill for ${project.customer} (settled ${formatDate(settledAt)})`,
                date: new Date(Date.now() + index * 1000),
              },
            });

            createdLedgerEntries++;
          }
        });
      }

      simulatedBalance = debtBalanceAfter;
    }

    console.log(
      dryRun
        ? `Dry run complete. Would create ${projects.length} snapshots and ${plannedLedgerEntries} ledger entries.`
        : `Created ${createdSnapshots} snapshots and ${createdLedgerEntries} ledger entries.`
    );

    console.log(`Ending Aimann debt balance: $${simulatedBalance.toFixed(2)}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
