import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WEB_URL = 'https://supportive-smile-production.up.railway.app';
const API_URL = 'https://fencetasticcrm-production.up.railway.app/api';
const DEFAULT_PASSWORD = 'Fencetastic2024!';
const ADNAAN_EMAIL = 'adnaan@fencetastic.com';

const runId = `PW-AUDIT-${Date.now()}`;
function log(step, detail) {
  console.log(`[${step}] ${detail}`);
}

function roundMoney(value) {
  return Number(value.toFixed(2));
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function spreadsheetMath({
  projectTotal,
  paymentMethod,
  forecastedExpenses,
  aimannDebtBalance = 0,
  commissionOwed = roundMoney(projectTotal * 0.1),
  memeCommission = roundMoney(projectTotal * 0.05),
}) {
  const moneyReceived = roundMoney(
    paymentMethod === 'CREDIT_CARD' ? projectTotal * 0.97 : projectTotal
  );
  const grossProfit = roundMoney(moneyReceived - forecastedExpenses - commissionOwed);
  const aimannDeduction =
    aimannDebtBalance > 0 ? roundMoney(Math.max(grossProfit, 0) * 0.25) : 0;
  const netProfit = roundMoney(grossProfit - memeCommission - aimannDeduction);

  return {
    moneyReceived,
    commissionOwed,
    grossProfit,
    memeCommission,
    aimannDeduction,
    netProfit,
  };
}

function assertMoney(label, actual, expected) {
  assert.equal(
    roundMoney(actual),
    roundMoney(expected),
    `${label} mismatch: expected ${expected}, received ${actual}`
  );
}

async function apiLogin(password = DEFAULT_PASSWORD, email = ADNAAN_EMAIL) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(res.status, 200, `Login failed for ${email}: ${res.status}`);
  const json = await res.json();
  return json.data.token;
}

async function apiRequest(token, method, route, body) {
  const res = await fetch(`${API_URL}${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

async function waitForText(page, text) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 20000 });
}

function pageOption(page, optionText) {
  return page.locator('[role="option"]').filter({ hasText: optionText }).first();
}

async function editField(page, label, value, expectedText) {
  await page.getByLabel(`Edit ${label}`).click();
  const input = page.locator(
    `input[aria-label="${label}"], textarea[aria-label="${label}"], select[aria-label="${label}"]`
  );
  await input.fill(String(value));
  await input.press('Enter');
  await input.waitFor({ state: 'detached', timeout: 20000 });
  if (expectedText) {
    await waitForText(page, expectedText);
  }
}

async function loginWithButton(page, label) {
  await page.goto(`${WEB_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: new RegExp(label, 'i') }).click();
  await waitForText(page, 'Dashboard');
}

async function ensureProjectCreateDetailsVisible(page) {
  const toggle = page.getByRole('button', { name: /show financial & schedule details/i });
  if (await toggle.count()) {
    await toggle.click();
  }
}

async function assertProjectMatchesSpreadsheet(page, token, projectId, expected) {
  const detail = await apiRequest(token, 'GET', `/projects/${projectId}`);
  assert.equal(detail.status, 200, `Failed to fetch project ${projectId}`);
  const project = detail.json?.data;
  assert.ok(project, `Project detail missing for ${projectId}`);

  assertMoney('moneyReceived', project.moneyReceived, expected.moneyReceived);
  assertMoney('grossProfit', project.commissionPreview.grossProfit, expected.grossProfit);
  assertMoney('adnaanCommission', project.commissionPreview.adnaanCommission, expected.commissionOwed);
  assertMoney('memeCommission', project.commissionPreview.memeCommission, expected.memeCommission);
  assertMoney('aimannDeduction', project.commissionPreview.aimannDeduction, expected.aimannDeduction);
  assertMoney('netProfit', project.commissionPreview.netProfit, expected.netProfit);

  await page.goto(`${WEB_URL}/projects/${projectId}?tab=commission`);
  await waitForText(page, 'Finance Trust');
  await waitForText(page, formatCurrency(expected.moneyReceived));
  await waitForText(page, formatCurrency(expected.grossProfit));
  await waitForText(page, formatCurrency(expected.netProfit));
  await page.goto(`${WEB_URL}/projects/${projectId}`);
  await waitForText(page, 'Project Detail');
}

async function getAimannDebtBalance(token) {
  const balance = await apiRequest(token, 'GET', '/debt/balance');
  assert.equal(balance.status, 200, 'Failed to fetch Aimann debt balance');
  return Number(balance.json?.data?.balance ?? 0);
}

async function waitForWorkOrder(token, projectId) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const workOrder = await apiRequest(token, 'GET', `/projects/${projectId}/work-order`);
    if (workOrder.status === 200 && workOrder.json?.data?.id) {
      return workOrder.json.data;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Work order was not persisted for project ${projectId}`);
}

async function main() {
  let token = await apiLogin();
  let tempProjectId = null;
  let tempCalendarEventId = null;
  let tempFinanceTransactionId = null;
  let tempProjectNoteId = null;
  let tempWorkOrderId = null;
  const tempProjectTransactionDescriptions = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  const dialogs = [];

  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.accept();
  });

  try {
    log('setup', `Starting audit run ${runId}`);

    await loginWithButton(page, 'Adnaan');
    await waitForText(page, 'Live view of revenue, pipeline, follow-ups, and install readiness.');

    log('dashboard', 'Verified dashboard loads');

    await page.getByRole('link', { name: 'Projects', exact: true }).click();
    await waitForText(page, 'Search the live project pipeline, switch status tabs, and export the current filtered view.');

    await page.getByRole('button', { name: /new project/i }).click();
    await ensureProjectCreateDetailsVisible(page);
    await page.locator('#customer').fill(`${runId} Customer`);
    await page.locator('#address').fill(`100 ${runId} Lane`);
    await page.locator('#description').fill(`Automation project ${runId}`);
    await page.locator('#projectTotal').fill('4321.09');
    await page.locator('#materialsCost').fill('1200');
    await page.locator('#forecastedExpenses').fill('2000');
    await page.locator('#contractDate').fill('2026-04-04');
    await page.locator('#installDate').fill('2026-04-10');
    await page.locator('#estimateDate').fill('2026-04-03');
    await page.locator('#linearFeet').fill('150');
    await page.locator('#subcontractor').fill('Audit Crew');
    await page.locator('#notes').fill(`Created by ${runId}`);
    await page.locator('label:has-text("Fence Type")').locator('..').locator('[role="combobox"]').click();
    await pageOption(page, 'Wood').click();
    await page.locator('label:has-text("Status")').locator('..').locator('[role="combobox"]').click();
    await pageOption(page, 'Open').click();
    await page.locator('label:has-text("Payment Method")').locator('..').locator('[role="combobox"]').click();
    await pageOption(page, 'Check').click();
    await page.getByRole('button', { name: /create project/i }).click();
    await page.getByPlaceholder('Search customer or address...').first().fill(runId);
    await waitForText(page, `${runId} Customer`);
    const aimannDebtBalance = await getAimannDebtBalance(token);
    const createdProjects = await apiRequest(token, 'GET', `/projects?page=1&limit=20&search=${encodeURIComponent(runId)}`);
    const createdProject = (createdProjects.json?.data ?? []).find((item) => item.customer === `${runId} Customer`);
    assert.ok(createdProject?.id, 'Created project was not returned by the API search');
    tempProjectId = createdProject.id;
    assert.ok(tempProjectId, 'Project ID was not captured from URL');
    await page.goto(`${WEB_URL}/projects/${tempProjectId}`);
    await waitForText(page, `${runId} Customer`);
    await assertProjectMatchesSpreadsheet(page, token, tempProjectId, spreadsheetMath({
      projectTotal: 4321.09,
      paymentMethod: 'CHECK',
      forecastedExpenses: 2000,
      aimannDebtBalance,
    }));
    log('projects', `Created temp project ${tempProjectId}`);

    await editField(page, 'Description', `Updated ${runId} Description`, `Updated ${runId} Description`);
    await editField(page, 'Notes', `Updated notes for ${runId}`, `Updated notes for ${runId}`);
    await editField(page, 'Project Total', '4500', '$4,500.00');
    await editField(page, 'Customer Paid', '500', '$500.00');
    await assertProjectMatchesSpreadsheet(page, token, tempProjectId, spreadsheetMath({
      projectTotal: 4500,
      paymentMethod: 'CHECK',
      forecastedExpenses: 2000,
      aimannDebtBalance,
    }));

    const statusCombobox = page.locator('[role="combobox"]').filter({ hasText: /open|in progress|completed|estimate|warranty|closed/i }).first();
    await statusCombobox.click();
    await pageOption(page, 'In Progress').click();
    await waitForText(page, 'In Progress');
    await statusCombobox.click();
    await pageOption(page, 'Open').click();
    await waitForText(page, 'Open');

    await page.getByRole('tab', { name: 'Activity' }).click();
    const auditNote = `Initial note ${runId}`;
    await page.getByPlaceholder('Add a note…').fill(auditNote);
    await page.getByRole('button', { name: /add note/i }).click();
    await waitForText(page, auditNote);
    const notes = await apiRequest(token, 'GET', `/projects/${tempProjectId}/notes`);
    tempProjectNoteId = (notes.json?.data ?? []).find((note) => note.content === auditNote)?.id ?? null;
    log('notes', 'Created project note');

    await page.getByRole('tab', { name: 'Payments' }).click();
    await page.getByRole('button', { name: /^add$/i }).click();
    await page.locator('[role="combobox"]').filter({ hasText: 'Category' }).first().click();
    await pageOption(page, 'Deposit').click();
    const incomeDescription = `Income ${runId}`;
    tempProjectTransactionDescriptions.push(incomeDescription);
    await page.getByPlaceholder('Description').fill(incomeDescription);
    await page.getByPlaceholder('Amount').fill('123.45');
    await page.locator('input[type="date"]').last().fill('2026-04-04');
    await page.getByRole('button', { name: /^save$/i }).click();
    await waitForText(page, incomeDescription);

    await page.getByRole('tab', { name: 'Expenses' }).click();
    await page.getByRole('button', { name: /^add$/i }).click();
    await page.locator('[role="combobox"]').filter({ hasText: 'Category' }).first().click();
    await pageOption(page, 'Fuel').click();
    const expenseDescription = `Expense ${runId}`;
    tempProjectTransactionDescriptions.push(expenseDescription);
    await page.getByPlaceholder('Description').fill(expenseDescription);
    await page.getByPlaceholder('Amount').fill('54.32');
    await page.locator('input[type="date"]').last().fill('2026-04-04');
    await page.getByRole('button', { name: /^save$/i }).click();
    await waitForText(page, expenseDescription);
    log('project-financials', 'Created project income/expense entries');

    await page.getByRole('button', { name: /work order/i }).click();
    await waitForText(page, 'Work Order');
    const canvas = page.locator('canvas').first();
    await page.locator('button[title="Fence"]').click();
    await canvas.click({ position: { x: 220, y: 220 } });
    await canvas.click({ position: { x: 360, y: 220 } });
    await canvas.dblclick({ position: { x: 360, y: 220 } });
    await page.locator('button[title="Gate"]').click();
    await canvas.click({ position: { x: 300, y: 240 } });
    await page.locator('button[title="Label"]').click();
    await canvas.click({ position: { x: 280, y: 180 } });
    await page.getByPlaceholder('Enter label text...').fill(`Label ${runId}`);
    await page.getByRole('button', { name: /^add$/i }).click();
    await page.getByRole('button', { name: /save/i }).click();
    const workOrder = await waitForWorkOrder(token, tempProjectId);
    tempWorkOrderId = workOrder.id;
    await page.goto(`${WEB_URL}/projects/${tempProjectId}`);
    log('work-order', 'Saved work order with fence, gate, and label');

    await page.getByRole('link', { name: 'Calendar', exact: true }).click();
    await waitForText(page, 'Schedule installs, estimates, and follow-ups with a live month view and direct project lookup.');
    await page.getByRole('button', { name: /add event/i }).first().click();
    const eventDialog = page.locator('[role="dialog"]').filter({ hasText: 'Add Calendar Event' }).first();
    await eventDialog.locator('#event-title').fill(`${runId} Calendar Event`);
    await eventDialog.locator('#event-date').fill('2026-04-15');
    await eventDialog.locator('[role="combobox"]').first().click();
    await pageOption(page, 'Meeting').click();
    await eventDialog.getByRole('button', { name: /save event/i }).click();
    await waitForText(page, `${runId} Calendar Event`);
    log('calendar', 'Created calendar event');

    await page.goto(`${WEB_URL}/finances`);
    await waitForText(page, 'Live view of revenue, pipeline spend, and ledger activity.');
    await page.getByRole('button', { name: /add transaction/i }).click();
    const txDialog = page.locator('[role="dialog"]').filter({ hasText: 'Add Transaction' }).first();
    await txDialog.locator('input[type="number"]').fill('88.88');
    await txDialog.locator('input[type="date"]').fill('2026-04-04');
    await txDialog.locator('input[placeholder="Materials, labor, revenue..."]').fill(`Audit ${runId}`);
    await txDialog.locator('input[placeholder="Short description"]').fill(`Finance ${runId}`);
    await txDialog.locator('textarea[placeholder="Vendor or customer name"]').fill('Playwright Audit');
    await txDialog.getByRole('button', { name: /save transaction/i }).click();
    await waitForText(page, 'Transaction saved');
    const financeTransactions = await apiRequest(token, 'GET', '/transactions?page=1&limit=100');
    const createdFinanceTx = (financeTransactions.json?.data ?? []).find((item) => item.description === `Finance ${runId}`);
    assert.ok(createdFinanceTx?.id, 'Finance transaction was not returned by the API');
    log('finances', 'Created finance transaction');

    await page.getByRole('link', { name: 'Reports', exact: true }).click();
    await waitForText(page, 'P&L, job costing, commissions, expenses, and cash flow.');
    await page.getByRole('button', { name: /quarterly/i }).click();
    await page.getByRole('button', { name: /annual/i }).click();
    await page.getByRole('button', { name: /^pdf$/i }).click();
    log('reports', 'Verified reports page and print action');

    token = await apiLogin();
    const calendarEvents = await apiRequest(token, 'GET', '/calendar/events?start=2026-04-01&end=2026-04-30');
    const event = (calendarEvents.json?.data ?? []).find((item) => item.title === `${runId} Calendar Event`);
    if (event) {
      tempCalendarEventId = event.id;
      const deleted = await apiRequest(token, 'DELETE', `/calendar/events/${event.id}`);
      assert.ok(deleted.status === 204 || deleted.status === 200, 'Failed to delete calendar event cleanup');
    }

    const txRes = await apiRequest(token, 'GET', '/transactions?page=1&limit=100');
    const tx = (txRes.json?.data ?? []).find((item) => item.description === `Finance ${runId}`);
    if (tx) {
      tempFinanceTransactionId = tx.id;
      const deleted = await apiRequest(token, 'DELETE', `/transactions/${tx.id}`);
      assert.equal(deleted.status, 200, 'Failed to delete finance transaction cleanup');
    }

      log('result', JSON.stringify({
        runId,
        tempProjectId,
        tempCalendarEventId,
        tempFinanceTransactionId,
        dialogs,
      }, null, 2));
  } finally {
    try {
      token = await apiLogin();

      if (!tempCalendarEventId) {
        const calendarEvents = await apiRequest(token, 'GET', '/calendar/events?start=2026-04-01&end=2026-04-30');
        const event = (calendarEvents.json?.data ?? []).find((item) => item.title === `${runId} Calendar Event`);
        if (event) tempCalendarEventId = event.id;
      }
      if (tempCalendarEventId) {
        await apiRequest(token, 'DELETE', `/calendar/events/${tempCalendarEventId}`);
      }

      if (!tempFinanceTransactionId) {
        const txRes = await apiRequest(token, 'GET', '/transactions?page=1&limit=100');
        const tx = (txRes.json?.data ?? []).find((item) => item.description === `Finance ${runId}`);
        if (tx) tempFinanceTransactionId = tx.id;
      }
      if (tempFinanceTransactionId) {
        await apiRequest(token, 'DELETE', `/transactions/${tempFinanceTransactionId}`);
      }

      if (tempProjectTransactionDescriptions.length > 0) {
        const txRes = await apiRequest(token, 'GET', '/transactions?page=1&limit=200');
        for (const tx of (txRes.json?.data ?? []).filter((item) =>
          tempProjectTransactionDescriptions.includes(item.description)
        )) {
          await apiRequest(token, 'DELETE', `/transactions/${tx.id}`);
        }
      }

      if (!tempProjectNoteId && tempProjectId) {
        const notes = await apiRequest(token, 'GET', `/projects/${tempProjectId}/notes`);
        tempProjectNoteId = (notes.json?.data ?? []).find((note) => note.content === `Initial note ${runId}`)?.id ?? null;
      }
      if (tempProjectNoteId) {
        await apiRequest(token, 'DELETE', `/notes/${tempProjectNoteId}`);
      }

      if (!tempWorkOrderId && tempProjectId) {
        const workOrder = await apiRequest(token, 'GET', `/projects/${tempProjectId}/work-order`);
        tempWorkOrderId = workOrder.json?.data?.id ?? null;
      }
      if (tempWorkOrderId) {
        await apiRequest(token, 'DELETE', `/work-orders/${tempWorkOrderId}`);
      }

      if (tempProjectId) {
        await apiRequest(token, 'DELETE', `/projects/${tempProjectId}`);
      }
    } catch (cleanupError) {
      console.error('Cleanup failure', cleanupError);
    }

    await page.close().catch(() => {});
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
