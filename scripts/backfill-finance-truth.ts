import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import { matchImportedProject } from '../apps/api/src/services/project-finance-reconciliation.service';
import {
  buildImportedCommissionSnapshot,
  resolveImportedSnapshotDebtBalances,
  resolveImportedSnapshotSettledAt,
  shouldBackfillCompletedImportedSnapshot,
} from '../apps/api/src/services/imported-finance-snapshot';

const prisma = new PrismaClient();

function toNullableNum(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'string' && v.trim() === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function toStr(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

function excelDateToDate(serial: number | null | undefined): Date | null {
  if (serial == null || typeof serial !== 'number') return null;
  return new Date(Math.round((serial - 25569) * 86400000));
}

function toDateString(v: unknown): string | null {
  if (typeof v === 'number') {
    const d = excelDateToDate(v);
    return d ? d.toISOString().split('T')[0] : null;
  }
  if (typeof v === 'string' && v.trim()) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  }
  return null;
}

function toDateOrNull(v: unknown): Date | null {
  if (typeof v === 'number') {
    return excelDateToDate(v);
  }
  if (typeof v === 'string' && v.trim()) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function getColumnMap(sheet: XLSX.WorkSheet) {
  const map: Record<string, number> = {};
  const ref = sheet['!ref'];
  if (!ref) return map;
  const range = XLSX.utils.decode_range(ref);
  for (let c = range.s.c; c <= range.e.c; c += 1) {
    const cell = sheet[XLSX.utils.encode_cell({ r: 0, c })];
    if (cell?.v != null) {
      map[String(cell.v).trim().toLowerCase()] = c;
    }
  }
  return map;
}

function col(map: Record<string, number>, name: string, fallback: number) {
  return map[name.toLowerCase()] ?? fallback;
}

type ImportedFinanceRow = {
  customer: string;
  address: string;
  contractDate: string;
  importedSource: string;
  moneyReceived: number | null;
  customerPaid: number | null;
  commissionOwed: number | null;
  commissionPaid: number | null;
  memesCommission: number | null;
  aimannsCommission: number | null;
  importedOutstandingReceivables: number | null;
  importedOutstandingPayables: number | null;
  importedGrossProfit: number | null;
  importedGrossProfitPercent: number | null;
  importedNetProfit: number | null;
  importedNetProfitPercent: number | null;
};

type PayoutLedgerPoint = {
  date: Date;
  runningBalance: number;
};

function extractPayoutLedgerTimeline(sheet: XLSX.WorkSheet): PayoutLedgerPoint[] {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
  const map = getColumnMap(sheet);
  const datePaid = col(map, 'date paid', 5);
  const fallbackDate = col(map, 'date', 1);
  const runningBalance = col(map, 'running balance', 7);

  return rows.slice(1)
    .map((row) => {
      const r = row as unknown[];
      const date = toDateOrNull(r[datePaid]) ?? toDateOrNull(r[fallbackDate]);
      const balance = toNullableNum(r[runningBalance]);
      if (!date || balance === null) {
        return null;
      }
      return {
        date,
        runningBalance: balance,
      };
    })
    .filter((entry): entry is PayoutLedgerPoint => entry !== null)
    .sort((left, right) => left.date.getTime() - right.date.getTime());
}

function extractRows(sheet: XLSX.WorkSheet, importedSource: string): ImportedFinanceRow[] {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
  const map = getColumnMap(sheet);
  const cols = {
    customer: col(map, 'customer', 5),
    address: col(map, 'address', 6),
    contractDate: col(map, 'contract date', 2),
    moneyReceived: col(map, 'money received', 9),
    customerPaid: col(map, 'customer paid', 10),
    outstandingReceivables: col(map, 'outstanding receivables', 17),
    commissionOwed: col(map, 'commission owed', 18),
    commissionPaid: col(map, 'commission paid', 19),
    outstandingPayables: col(map, 'outstanding payables', 20),
    grossProfit: col(map, 'gross profit', 21),
    grossProfitPercent: col(map, 'gross profit %', 22),
    memesCommission: col(map, "meme's comm", 23),
    aimannsCommission: col(map, "aimann's comm", 24),
    netProfit: col(map, 'net profit', 25),
    netProfitPercent: col(map, 'net profit %', 26),
  };

  return rows.slice(1)
    .map((row) => {
      const r = row as unknown[];
      const customer = toStr(r[cols.customer]);
      const address = toStr(r[cols.address]);
      const contractDate = toDateString(r[cols.contractDate]);
      if (!customer || !address || !contractDate) return null;

      return {
        customer,
        address,
        contractDate,
        importedSource,
        moneyReceived: toNullableNum(r[cols.moneyReceived]),
        customerPaid: toNullableNum(r[cols.customerPaid]),
        commissionOwed: toNullableNum(r[cols.commissionOwed]),
        commissionPaid: toNullableNum(r[cols.commissionPaid]),
        memesCommission: toNullableNum(r[cols.memesCommission]),
        aimannsCommission: toNullableNum(r[cols.aimannsCommission]),
        importedOutstandingReceivables: toNullableNum(r[cols.outstandingReceivables]),
        importedOutstandingPayables: toNullableNum(r[cols.outstandingPayables]),
        importedGrossProfit: toNullableNum(r[cols.grossProfit]),
        importedGrossProfitPercent: toNullableNum(r[cols.grossProfitPercent]),
        importedNetProfit: toNullableNum(r[cols.netProfit]),
        importedNetProfitPercent: toNullableNum(r[cols.netProfitPercent]),
      };
    })
    .filter((row): row is ImportedFinanceRow => row !== null);
}

async function main() {
  const workbookPath = path.resolve(__dirname, '../Project Schedule.xlsx');
  if (!fs.existsSync(workbookPath)) {
    throw new Error(`Workbook not found: ${workbookPath}`);
  }

  const workbook = XLSX.readFile(workbookPath);
  const openSheet = workbook.Sheets['Open'];
  const completedSheet = workbook.Sheets['Completed Projects'];
  const payoutSheet = workbook.Sheets['Payout'];
  if (!openSheet || !completedSheet || !payoutSheet) {
    throw new Error('Workbook must contain "Open", "Completed Projects", and "Payout" sheets');
  }
  const payoutLedgerTimeline = extractPayoutLedgerTimeline(payoutSheet);

  const importedRows = [
    ...extractRows(openSheet, 'Open'),
    ...extractRows(completedSheet, 'Completed Projects'),
  ];

  const existingProjects = await prisma.project.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      customer: true,
      address: true,
      contractDate: true,
      installDate: true,
      completedDate: true,
      status: true,
    },
  });

  let matched = 0;
  let updated = 0;
  let reconciliationRequired = 0;

  for (const row of importedRows) {
    const result = matchImportedProject(
      {
        customer: row.customer,
        address: row.address,
        contractDate: row.contractDate,
      },
      existingProjects.map((project) => ({
        id: project.id,
        customer: project.customer,
        address: project.address,
        contractDate: project.contractDate.toISOString().split('T')[0],
      })),
    );

    if (result.status !== 'MATCHED' || !result.projectId) {
      reconciliationRequired += 1;
      continue;
    }

    matched += 1;

    await prisma.project.update({
      where: { id: result.projectId },
      data: {
        moneyReceived: row.moneyReceived ?? undefined,
        customerPaid: row.customerPaid ?? undefined,
        commissionOwed: row.commissionOwed,
        commissionPaid: row.commissionPaid,
        memesCommission: row.memesCommission,
        aimannsCommission: row.aimannsCommission,
        financeProjectMode: 'IMPORTED',
        receivablesSource: 'IMPORTED_ACTUAL',
        payablesSource: 'IMPORTED_ACTUAL',
        commissionsSource: 'IMPORTED_ACTUAL',
        profitabilitySource: 'IMPORTED_ACTUAL',
        importedOutstandingReceivables: row.importedOutstandingReceivables,
        importedOutstandingPayables: row.importedOutstandingPayables,
        importedGrossProfit: row.importedGrossProfit,
        importedGrossProfitPercent: row.importedGrossProfitPercent,
        importedNetProfit: row.importedNetProfit,
        importedNetProfitPercent: row.importedNetProfitPercent,
        importedAt: new Date(),
        importedSource: row.importedSource,
        reconciliationRequiredAt: null,
        reconciliationNotes: null,
      },
    });

    if (shouldBackfillCompletedImportedSnapshot(row.importedSource)) {
      const matchedProject = existingProjects.find((project) => project.id === result.projectId);
      const settledAt = resolveImportedSnapshotSettledAt({
        completedDate: matchedProject?.completedDate ?? null,
        installDate: matchedProject?.installDate ?? null,
        contractDate: matchedProject?.contractDate ?? new Date(row.contractDate),
      });
      const debtBalances = resolveImportedSnapshotDebtBalances({
        settledAt,
        aimannDeduction: row.aimannsCommission ?? 0,
        ledger: payoutLedgerTimeline,
      });
      const snapshot = buildImportedCommissionSnapshot({
        moneyReceived: row.moneyReceived,
        commissionOwed: row.commissionOwed,
        memesCommission: row.memesCommission,
        aimannsCommission: row.aimannsCommission,
        importedGrossProfit: row.importedGrossProfit,
        importedNetProfit: row.importedNetProfit,
      }, debtBalances);

      if (snapshot) {
        await prisma.commissionSnapshot.upsert({
          where: { projectId: result.projectId },
          create: {
            projectId: result.projectId,
            ...snapshot,
            settledAt,
          },
          update: {
            ...snapshot,
            settledAt,
          },
        });
      }
    }

    updated += 1;
  }

  console.log(
    `matched=${matched} updated=${updated} reconciliation_required=${reconciliationRequired}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
