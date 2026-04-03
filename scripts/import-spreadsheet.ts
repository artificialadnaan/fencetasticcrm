/**
 * One-time import script: Project Schedule.xlsx → Fencetastic DB
 *
 * Run from repo root:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/import-spreadsheet.ts
 *
 * Or with an env file:
 *   export $(grep -v '^#' apps/api/.env | xargs) && npx tsx scripts/import-spreadsheet.ts
 *
 * The script:
 *  - Open sheet       → Project records (status OPEN)
 *  - Completed sheet  → Project records (status COMPLETED)
 *  - Payout sheet     → AimannDebtLedger payment entries (initial balance already seeded)
 *  - Expenses sheet   → OperatingExpense records
 *
 * Deduplication: skips if customer + address + contractDate already exists.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

// ── Load .env from apps/api/.env if DATABASE_URL not already set ──────────────
if (!process.env.DATABASE_URL) {
  const envPath = path.resolve(__dirname, '../apps/api/.env');
  if (fs.existsSync(envPath)) {
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
    console.log('Loaded env from apps/api/.env');
  }
}

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set. Export it or add it to apps/api/.env');
  process.exit(1);
}

const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert an Excel serial date number to a JS Date */
function excelDateToDate(serial: number | null | undefined): Date | null {
  if (serial == null || typeof serial !== 'number') return null;
  // Excel epoch: Dec 30, 1899. JS epoch: Jan 1, 1970.
  // Excel serial 1 = Jan 1, 1900 (Excel incorrectly treats 1900 as a leap year, so offset by 25569 days to epoch)
  const msPerDay = 86400000;
  return new Date(Math.round((serial - 25569) * msPerDay));
}

function toNum(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function toStr(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function toStrOrNull(v: unknown): string | null {
  const s = toStr(v);
  return s === '' ? null : s;
}

function toDateOrNull(v: unknown): Date | null {
  if (v == null) return null;
  if (typeof v === 'number') return excelDateToDate(v);
  if (typeof v === 'string') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Normalize payment method string from spreadsheet Pmt column */
function normalizePaymentMethod(pmt: unknown): 'CASH' | 'CHECK' | 'CREDIT_CARD' {
  const s = toStr(pmt).toUpperCase();
  if (s === 'CC' || s.includes('CREDIT') || s.includes('CARD')) return 'CREDIT_CARD';
  if (s === 'CK' || s.includes('CHECK')) return 'CHECK';
  if (s === 'CA' || s.includes('CASH')) return 'CASH';
  if (s === 'Z' || s === 'ZELLE' || s === 'VENMO' || s === 'APP') return 'CHECK'; // treat app payments as check
  return 'CHECK';
}

/** Derive moneyReceived: CC gets 97%, else equals projectTotal */
function calcMoneyReceived(projectTotal: number, paymentMethod: string): number {
  if (paymentMethod === 'CREDIT_CARD') {
    return Number((projectTotal * 0.97).toFixed(2));
  }
  return projectTotal;
}

/** Normalize fence type — we don't have it in the spreadsheet, default to OTHER */
function guessFenceType(description: string | null): string {
  if (!description) return 'OTHER';
  const d = description.toUpperCase();
  if (d.includes('WOOD') || d.includes('CEDAR') || d.includes('PINE') || d.includes('B/B') || d.includes('BOARD')) return 'WOOD';
  if (d.includes('IRON') || d.includes('METAL') || d.includes('WROUGHT')) return 'METAL';
  if (d.includes('CHAIN') || d.includes('CHAIN-LINK') || d.includes('CHAIN LINK')) return 'CHAIN_LINK';
  if (d.includes('VINYL') || d.includes('PVC')) return 'VINYL';
  if (d.includes('GATE') && !d.includes('FENCE')) return 'GATE';
  return 'OTHER';
}

// ── Column index constants ────────────────────────────────────────────────────
// Fallback hardcoded indices for Open sheet (0-based). The dynamic getColumnMap()
// function is preferred — these are only used when header-based lookup fails.
const COL_FALLBACK = {
  INSTALL_DATE: 0,
  STATUS: 1,
  CONTRACT_DATE: 2,
  NOTES: 3,
  SUB: 4,
  CUSTOMER: 5,
  ADDRESS: 6,
  DESCRIPTION: 7,
  PROJECT_TOTAL: 8,
  MONEY_RECEIVED: 9,
  CUSTOMER_PAID: 10,
  PMT: 11,
  FORECASTED_EXPENSES: 13,
  MATERIALS: 14,
  SUB_PAYMENT_1: 15,
  SUB_PAYMENT_2: 16,
};

// Header name → column index map, derived dynamically per sheet
type ColMap = Record<string, number>;

/** Read the first row of a sheet and return a lowercased header → col-index map. */
function getColumnMap(sheet: XLSX.WorkSheet): ColMap {
  const headers: ColMap = {};
  const ref = sheet['!ref'];
  if (!ref) return headers;
  const range = XLSX.utils.decode_range(ref);
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: 0, c })];
    if (cell && cell.v != null) {
      headers[String(cell.v).trim().toLowerCase()] = c;
    }
  }
  return headers;
}

/** Resolve a column index: try the dynamic header map first, fall back to hardcoded index. */
function col(map: ColMap, headerName: string, fallback: number): number {
  const idx = map[headerName.toLowerCase()];
  return idx !== undefined ? idx : fallback;
}

interface RowResult {
  imported: number;
  skipped: number;
  errors: number;
}

// ── Find seed user ────────────────────────────────────────────────────────────
async function getSeedUserId(): Promise<string> {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!user) throw new Error('No users found in DB. Run the seed script first.');
  return user.id;
}

// ── Import projects from a sheet ─────────────────────────────────────────────
async function importProjects(
  rows: unknown[][],
  sheet: XLSX.WorkSheet,
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED',
  seedUserId: string
): Promise<RowResult> {
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  // Build a dynamic column map from this sheet's header row so Open and
  // Completed Projects sheets are handled independently.
  const colMap = getColumnMap(sheet);

  const C = {
    INSTALL_DATE:       col(colMap, 'install date',            COL_FALLBACK.INSTALL_DATE),
    STATUS:             col(colMap, 'status',                  COL_FALLBACK.STATUS),
    CONTRACT_DATE:      col(colMap, 'contract date',           COL_FALLBACK.CONTRACT_DATE),
    NOTES:              col(colMap, 'notes',                   COL_FALLBACK.NOTES),
    SUB:                col(colMap, 'sub',                     COL_FALLBACK.SUB),
    CUSTOMER:           col(colMap, 'customer',                COL_FALLBACK.CUSTOMER),
    ADDRESS:            col(colMap, 'address',                 COL_FALLBACK.ADDRESS),
    DESCRIPTION:        col(colMap, 'description',             COL_FALLBACK.DESCRIPTION),
    PROJECT_TOTAL:      col(colMap, 'project total',           COL_FALLBACK.PROJECT_TOTAL),
    MONEY_RECEIVED:     col(colMap, 'money received',          COL_FALLBACK.MONEY_RECEIVED),
    CUSTOMER_PAID:      col(colMap, 'customer paid',           COL_FALLBACK.CUSTOMER_PAID),
    PMT:                col(colMap, 'pmt',                     COL_FALLBACK.PMT),
    FORECASTED_EXPENSES:col(colMap, 'forecasted expenses',     COL_FALLBACK.FORECASTED_EXPENSES),
    MATERIALS:          col(colMap, 'materials only',          COL_FALLBACK.MATERIALS),
    SUB_PAYMENT_1:      col(colMap, 'sub payment 1',           COL_FALLBACK.SUB_PAYMENT_1),
    SUB_PAYMENT_2:      col(colMap, 'sub payment 2',           COL_FALLBACK.SUB_PAYMENT_2),
  };

  // Skip header row (index 0)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const customer = toStrOrNull(row[C.CUSTOMER]);
    const address = toStrOrNull(row[C.ADDRESS]);

    // Skip rows with no customer or address
    if (!customer || !address) continue;

    const contractDateRaw = row[C.CONTRACT_DATE];
    const contractDate = toDateOrNull(contractDateRaw);

    // Skip rows with no contract date
    if (!contractDate) continue;

    const projectTotal = toNum(row[C.PROJECT_TOTAL]);
    // Skip rows with zero project total — likely empty/formula rows
    if (projectTotal <= 0) continue;

    try {
      // Deduplication check: customer + address + contractDate
      const contractDateStr = contractDate.toISOString().split('T')[0];
      const existing = await prisma.project.findFirst({
        where: {
          customer: { equals: customer, mode: 'insensitive' },
          address: { equals: address, mode: 'insensitive' },
          contractDate: contractDate,
        },
      });

      if (existing) {
        console.log(`  SKIP [row ${i + 1}]: ${customer} @ ${address} (${contractDateStr}) — already exists`);
        skipped++;
        continue;
      }

      const paymentMethod = normalizePaymentMethod(row[C.PMT]);
      const moneyReceived = toNum(row[C.MONEY_RECEIVED]) > 0
        ? toNum(row[C.MONEY_RECEIVED])
        : calcMoneyReceived(projectTotal, paymentMethod);
      const customerPaid = toNum(row[C.CUSTOMER_PAID]);
      const forecastedExpenses = toNum(row[C.FORECASTED_EXPENSES]);
      const materialsCost = toNum(row[C.MATERIALS]);
      const installDate = toDateOrNull(row[C.INSTALL_DATE]) ?? contractDate;
      const description = toStrOrNull(row[C.DESCRIPTION]) ?? 'Imported from spreadsheet';
      const subcontractor = toStrOrNull(row[C.SUB]);
      const notes = toStrOrNull(row[C.NOTES]);
      const fenceType = guessFenceType(description) as 'WOOD' | 'METAL' | 'CHAIN_LINK' | 'VINYL' | 'GATE' | 'OTHER';

      // Determine final status based on row status column
      const rowStatus = toStr(row[C.STATUS]).toUpperCase();
      let finalStatus: 'ESTIMATE' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' = status;
      if (rowStatus.includes('COMPLET')) finalStatus = 'COMPLETED';
      else if (rowStatus.includes('IN_PROGRESS') || rowStatus.includes('IN PROGRESS') || rowStatus.includes('PROGRESS')) finalStatus = 'IN_PROGRESS';
      else if (status === 'OPEN') finalStatus = 'OPEN';

      const completedDate = finalStatus === 'COMPLETED' ? (installDate ?? contractDate) : null;

      const subPay1 = toNum(row[C.SUB_PAYMENT_1]);
      const subPay2 = toNum(row[C.SUB_PAYMENT_2]);

      // Wrap project creation + sub payments in a transaction so a failed sub
      // payment rolls back the project and the row can be safely retried.
      await prisma.$transaction(async (tx) => {
        const project = await tx.project.create({
          data: {
            customer,
            address,
            description,
            fenceType,
            status: finalStatus,
            projectTotal,
            paymentMethod,
            moneyReceived,
            customerPaid,
            forecastedExpenses,
            materialsCost,
            contractDate,
            installDate,
            completedDate,
            subcontractor,
            notes,
            createdById: seedUserId,
          },
        });

        if (subPay1 > 0 && subcontractor) {
          await tx.subcontractorPayment.create({
            data: {
              projectId: project.id,
              subcontractorName: subcontractor,
              amountOwed: subPay1,
              amountPaid: subPay1, // assume paid since it's in the spreadsheet
            },
          });
        }

        if (subPay2 > 0 && subcontractor) {
          await tx.subcontractorPayment.create({
            data: {
              projectId: project.id,
              subcontractorName: subcontractor,
              amountOwed: subPay2,
              amountPaid: subPay2,
            },
          });
        }
      });

      console.log(`  OK   [row ${i + 1}]: ${customer} @ ${address} (${contractDateStr}) — ${finalStatus}`);
      imported++;
    } catch (err) {
      console.error(`  ERR  [row ${i + 1}]: ${customer} @ ${address} —`, err instanceof Error ? err.message : err);
      errors++;
    }
  }

  return { imported, skipped, errors };
}

// ── Import Payout ledger entries ──────────────────────────────────────────────
// Col: [NOTES, Date, Payment amount, Client Name, Lowes/Chase, Date Paid, notes, Running Balance, ...]
async function importPayoutLedger(rows: unknown[][], payoutSheet: XLSX.WorkSheet): Promise<RowResult> {
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  // Check if initial balance entry already exists
  const existingInitial = await prisma.aimannDebtLedger.findFirst({
    where: { note: { contains: 'Initial balance' } },
  });

  // Try to read the initial balance from the spreadsheet header row.
  // Known locations: col E (index 4) or col F (index 5) of row 0, or col H (index 7).
  // Fall back to the known historical value if none can be parsed.
  let initialBalance = 5988.41;
  const FALLBACK_BALANCE = 5988.41;
  let balanceReadFromSheet = false;
  const headerRow = (rows[0] as unknown[]) ?? [];
  for (const candidateIdx of [4, 5, 7, 3]) {
    const cellKey = XLSX.utils.encode_cell({ r: 0, c: candidateIdx });
    const rawCell = payoutSheet[cellKey];
    const rawVal = rawCell?.v ?? headerRow[candidateIdx];
    if (rawVal != null) {
      const parsed = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(/[^0-9.]/g, ''));
      if (!isNaN(parsed) && parsed > 0) {
        initialBalance = parsed;
        balanceReadFromSheet = true;
        break;
      }
    }
  }
  if (!balanceReadFromSheet) {
    console.warn(`  WARN Initial balance not found in Payout sheet header — using hardcoded fallback $${FALLBACK_BALANCE.toFixed(2)}`);
  }

  // If no initial entry exists, create it
  if (!existingInitial) {
    try {
      await prisma.aimannDebtLedger.create({
        data: {
          amount: initialBalance,
          runningBalance: initialBalance,
          note: 'Initial balance (imported from Payout sheet)',
          date: new Date('2024-01-01'), // approximate start date
        },
      });
      console.log(`  OK   Created initial Aimann debt balance: $${initialBalance.toFixed(2)}`);
      imported++;
    } catch (err) {
      console.error('  ERR  Failed to create initial balance:', err instanceof Error ? err.message : err);
      errors++;
    }
  } else {
    console.log('  SKIP Initial balance entry already exists');
    skipped++;
  }

  // Rows 1+ are payment entries
  // Columns: [NOTES=0, Date=1, Payment amount=2, Client Name=3, Lowes/Chase=4, Date Paid=5, notes2=6, Running Balance=7]
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const paymentAmount = toNum(row[2]);
    const clientName = toStrOrNull(row[3]);
    const description = toStrOrNull(row[4]);
    const rowNotes = toStrOrNull(row[6]);
    const runningBalance = toNum(row[7]);
    const datePaid = toDateOrNull(row[5]) ?? toDateOrNull(row[1]);

    // Skip rows without a payment amount or running balance
    if (paymentAmount <= 0 || !datePaid) continue;
    // Only import rows that have a running balance (the ones tracking the actual debt paydown)
    if (runningBalance <= 0 && row[7] == null) continue;

    const noteStr = [
      clientName ? `Payment from ${clientName}` : 'Payment',
      description,
      rowNotes,
    ]
      .filter(Boolean)
      .join(' — ');

    // Build a note prefix for dedup: first segment before " — " (e.g. "Payment from John")
    const notePrefix = noteStr.split(' — ')[0];

    // Check for duplicate: same amount + date + note prefix to avoid collisions
    // between different clients who paid the same amount on the same day.
    const existing = await prisma.aimannDebtLedger.findFirst({
      where: {
        amount: -paymentAmount,
        date: datePaid,
        note: { startsWith: notePrefix },
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    try {
      await prisma.aimannDebtLedger.create({
        data: {
          amount: -paymentAmount, // payments reduce the balance
          runningBalance: runningBalance > 0 ? runningBalance : 0,
          note: noteStr,
          date: datePaid,
        },
      });
      imported++;
    } catch (err) {
      console.error(`  ERR  Payout row ${i + 1}:`, err instanceof Error ? err.message : err);
      errors++;
    }
  }

  return { imported, skipped, errors };
}

// ── Import Operating Expenses ─────────────────────────────────────────────────
// Expenses sheet rows: [description, amount]
// Row 0: ["Fencetastic Monthly Expenses:", null]
// Rows 2+: [description, amount]
async function importExpenses(rows: unknown[][]): Promise<RowResult> {
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const rawDesc = toStrOrNull(row[0]);
    const amount = toNum(row[1]);

    if (!rawDesc || amount <= 0) continue;

    // Parse category from description (e.g. "Insurace - HISCOX INC" → category=Insurance, description=HISCOX INC)
    let category = 'General';
    let description = rawDesc;

    if (rawDesc.includes(' - ')) {
      const parts = rawDesc.split(' - ');
      category = parts[0].trim();
      description = parts.slice(1).join(' - ').trim();
    } else if (rawDesc.toLowerCase().includes('insur')) {
      category = 'Insurance';
    } else if (rawDesc.toLowerCase().includes('advertising') || rawDesc.toLowerCase().includes('ads')) {
      category = 'Advertising';
    } else if (rawDesc.toLowerCase().includes('accounting')) {
      category = 'Accounting';
    } else {
      category = rawDesc;
      description = rawDesc;
    }

    // Check for duplicate
    const existing = await prisma.operatingExpense.findFirst({
      where: {
        description: { equals: description, mode: 'insensitive' },
        amount: amount,
      },
    });

    if (existing) {
      console.log(`  SKIP Expense: ${description} ($${amount}) — already exists`);
      skipped++;
      continue;
    }

    try {
      await prisma.operatingExpense.create({
        data: {
          category,
          description,
          amount,
          frequency: 'MONTHLY',
          isActive: true,
        },
      });
      console.log(`  OK   Expense: ${category} / ${description} — $${amount}/mo`);
      imported++;
    } catch (err) {
      console.error(`  ERR  Expense row ${i + 1}:`, err instanceof Error ? err.message : err);
      errors++;
    }
  }

  return { imported, skipped, errors };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const xlsxPath = path.resolve(__dirname, '../Project Schedule.xlsx');
  if (!fs.existsSync(xlsxPath)) {
    console.error(`ERROR: Could not find "${xlsxPath}"`);
    console.error('Make sure Project Schedule.xlsx is in the repo root.');
    process.exit(1);
  }

  console.log('Reading workbook:', xlsxPath);
  const wb = XLSX.readFile(xlsxPath);

  const openSheet = wb.Sheets['Open'];
  const completedSheet = wb.Sheets['Completed Projects'];
  const payoutSheet = wb.Sheets['Payout'];
  const expensesSheet = wb.Sheets['Expenses'];

  if (!openSheet) { console.error('ERROR: "Open" sheet not found'); process.exit(1); }
  if (!completedSheet) { console.error('ERROR: "Completed Projects" sheet not found'); process.exit(1); }
  if (!payoutSheet) { console.error('ERROR: "Payout" sheet not found'); process.exit(1); }
  if (!expensesSheet) { console.error('ERROR: "Expenses" sheet not found'); process.exit(1); }

  const openRows = XLSX.utils.sheet_to_json<unknown[]>(openSheet, { header: 1, defval: null });
  const completedRows = XLSX.utils.sheet_to_json<unknown[]>(completedSheet, { header: 1, defval: null });
  const payoutRows = XLSX.utils.sheet_to_json<unknown[]>(payoutSheet, { header: 1, defval: null });
  const expensesRows = XLSX.utils.sheet_to_json<unknown[]>(expensesSheet, { header: 1, defval: null });

  const seedUserId = await getSeedUserId();
  console.log(`Using seed user ID: ${seedUserId}\n`);

  // ── Open projects ──
  console.log(`=== Importing Open projects (${openRows.length - 1} data rows) ===`);
  const openResult = await importProjects(openRows, openSheet, 'OPEN', seedUserId);
  console.log(`Open: imported=${openResult.imported}, skipped=${openResult.skipped}, errors=${openResult.errors}\n`);

  // ── Completed projects ──
  console.log(`=== Importing Completed projects (${completedRows.length - 1} data rows) ===`);
  const completedResult = await importProjects(completedRows, completedSheet, 'COMPLETED', seedUserId);
  console.log(`Completed: imported=${completedResult.imported}, skipped=${completedResult.skipped}, errors=${completedResult.errors}\n`);

  // ── Payout ledger ──
  console.log(`=== Importing Payout ledger (${payoutRows.length - 1} data rows) ===`);
  const payoutResult = await importPayoutLedger(payoutRows, payoutSheet);
  console.log(`Payout: imported=${payoutResult.imported}, skipped=${payoutResult.skipped}, errors=${payoutResult.errors}\n`);

  // ── Operating expenses ──
  console.log(`=== Importing Operating expenses ===`);
  const expResult = await importExpenses(expensesRows);
  console.log(`Expenses: imported=${expResult.imported}, skipped=${expResult.skipped}, errors=${expResult.errors}\n`);

  const totalImported = openResult.imported + completedResult.imported + payoutResult.imported + expResult.imported;
  const totalSkipped = openResult.skipped + completedResult.skipped + payoutResult.skipped + expResult.skipped;
  const totalErrors = openResult.errors + completedResult.errors + payoutResult.errors + expResult.errors;

  console.log('=== Import complete ===');
  console.log(`Total imported: ${totalImported}`);
  console.log(`Total skipped:  ${totalSkipped}`);
  console.log(`Total errors:   ${totalErrors}`);

  if (totalErrors > 0) {
    console.warn('\nSome rows had errors — check logs above.');
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
