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
const MEME_EMAIL = 'meme@fencetastic.com';

const runId = `PW-AUDIT-${Date.now()}`;
const artifactImage = path.resolve(__dirname, '../.playwright-mcp/wo-fence.png');
const tempPassword = `Fencetastic2024!${Date.now()}`;

function log(step, detail) {
  console.log(`[${step}] ${detail}`);
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

async function editField(page, label, value) {
  await page.getByLabel(`Edit ${label}`).click();
  const input = page.getByLabel(label);
  await input.fill(String(value));
  await input.press('Enter');
}

async function loginWithButton(page, label) {
  await page.goto(`${WEB_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: new RegExp(label, 'i') }).click();
  await waitForText(page, 'Dashboard');
}

async function signOut(page) {
  await page.getByRole('button', { name: /sign out/i }).click();
  await page.waitForURL('**/login', { timeout: 20000 });
}

async function main() {
  let token = await apiLogin();
  let tempProjectId = null;
  let tempCalendarEventId = null;
  let tempFinanceTransactionId = null;
  let tempDebtAdjustmentAmount = null;
  let tempDebtAdjustmentNote = null;
  let tempProjectDeleted = false;

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
    await waitForText(page, 'Overview of your fencing projects and financials.');

    log('dashboard', 'Verified dashboard loads');

    await page.getByRole('link', { name: 'Projects', exact: true }).click();
    await waitForText(page, 'Manage all your fencing projects.');

    await page.getByRole('button', { name: /new project/i }).click();
    await page.locator('#customer').fill(`${runId} Customer`);
    await page.locator('#address').fill(`100 ${runId} Lane`);
    await page.locator('#description').fill(`Automation project ${runId}`);
    await page.locator('#projectTotal').fill('4321.09');
    await page.locator('#materialsCost').fill('1200');
    await page.locator('#forecastedExpenses').fill('2000');
    await page.locator('#contractDate').fill('2026-04-04');
    await page.locator('#installDate').fill('2026-04-10');
    await page.locator('#estimateDate').fill('2026-04-03');
    await page.locator('#followUpDate').fill('2026-04-08');
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
    await page.getByPlaceholder('Search customer or address...').fill(runId);
    await waitForText(page, `${runId} Customer`);
    const createdProjects = await apiRequest(token, 'GET', `/projects?page=1&limit=20&search=${encodeURIComponent(runId)}`);
    const createdProject = (createdProjects.json?.data ?? []).find((item) => item.customer === `${runId} Customer`);
    assert.ok(createdProject?.id, 'Created project was not returned by the API search');
    tempProjectId = createdProject.id;
    assert.ok(tempProjectId, 'Project ID was not captured from URL');
    await page.goto(`${WEB_URL}/projects/${tempProjectId}`);
    await waitForText(page, `${runId} Customer`);
    log('projects', `Created temp project ${tempProjectId}`);

    await editField(page, 'Description', `Updated ${runId} Description`);
    await editField(page, 'Notes', `Updated notes for ${runId}`);
    await editField(page, 'Project Total', '4500');
    await editField(page, 'Customer Paid', '500');

    const statusCombobox = page.locator('[role="combobox"]').filter({ hasText: /open|in progress|completed|estimate|warranty|closed/i }).first();
    await statusCombobox.click();
    await pageOption(page, 'In Progress').click();
    await waitForText(page, 'In Progress');
    await statusCombobox.click();
    await pageOption(page, 'Open').click();
    await waitForText(page, 'Open');

    await page.getByRole('button', { name: 'Activity' }).click();
    await page.getByPlaceholder('Add a note…').fill(`Initial note ${runId}`);
    await page.locator('input[type="file"]').setInputFiles(artifactImage);
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: /add note/i }).click();
    await waitForText(page, `Initial note ${runId}`);
    log('notes', 'Created note with photo upload');

    await page.getByRole('button', { name: 'Payments' }).click();
    await page.getByRole('button', { name: /^add$/i }).click();
    await page.locator('[role="combobox"]').filter({ hasText: 'Category' }).first().click();
    await pageOption(page, 'Deposit').click();
    await page.getByPlaceholder('Description').fill(`Income ${runId}`);
    await page.getByPlaceholder('Amount').fill('123.45');
    await page.locator('input[type="date"]').last().fill('2026-04-04');
    await page.getByRole('button', { name: /^save$/i }).click();
    await waitForText(page, `Income ${runId}`);
    await page.locator('tr').filter({ hasText: `Income ${runId}` }).getByRole('button').click();
    await page.getByText(`Income ${runId}`).waitFor({ state: 'detached', timeout: 20000 });

    await page.getByRole('button', { name: 'Expenses' }).click();
    await page.getByRole('button', { name: /^add$/i }).click();
    await page.locator('[role="combobox"]').filter({ hasText: 'Category' }).first().click();
    await pageOption(page, 'Fuel').click();
    await page.getByPlaceholder('Description').fill(`Expense ${runId}`);
    await page.getByPlaceholder('Amount').fill('54.32');
    await page.locator('input[type="date"]').last().fill('2026-04-04');
    await page.getByRole('button', { name: /^save$/i }).click();
    await waitForText(page, `Expense ${runId}`);
    await page.locator('tr').filter({ hasText: `Expense ${runId}` }).getByRole('button').click();
    await page.getByText(`Expense ${runId}`).waitFor({ state: 'detached', timeout: 20000 });
    log('project-financials', 'Created and deleted project income/expense entries');

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
    await page.waitForTimeout(1500);
    assert.ok(dialogs.some((msg) => msg.includes('Work order saved')), 'Work order save alert not observed');
    await page.goto(`${WEB_URL}/projects/${tempProjectId}`);
    log('work-order', 'Saved work order with fence, gate, and label');

    await page.getByRole('link', { name: 'Calendar', exact: true }).click();
    await waitForText(page, 'Schedule installs, estimates, and follow-ups.');
    await page.getByRole('button', { name: /add event/i }).click();
    const eventDialog = page.locator('[role="dialog"]').filter({ hasText: 'Add Calendar Event' }).first();
    await eventDialog.locator('#event-title').fill(`${runId} Calendar Event`);
    await eventDialog.locator('#event-date').fill('2026-04-15');
    await eventDialog.locator('[role="combobox"]').first().click();
    await pageOption(page, 'Meeting').click();
    await eventDialog.getByRole('button', { name: /save event/i }).click();
    await waitForText(page, `${runId} Calendar Event`);
    log('calendar', 'Created calendar event');

    await page.goto(`${WEB_URL}/finances`);
    await waitForText(page, 'Track income, expenses, and profit');
    await page.getByRole('button', { name: /add transaction/i }).click();
    const txDialog = page.locator('[role="dialog"]').filter({ hasText: 'Add Transaction' }).first();
    await txDialog.locator('input[type="number"]').fill('88.88');
    await txDialog.locator('input[type="date"]').fill('2026-04-04');
    await txDialog.locator('input[placeholder="e.g. Materials, Labor, Revenue"]').fill(`Audit ${runId}`);
    await txDialog.locator('input[placeholder="Brief description"]').fill(`Finance ${runId}`);
    await txDialog.locator('input[placeholder="Vendor or customer name"]').fill('Playwright Audit');
    await txDialog.getByRole('button', { name: /^save$/i }).click();
    await waitForText(page, `Finance ${runId}`);
    log('finances', 'Created finance transaction');

    await page.getByRole('link', { name: 'Reports', exact: true }).click();
    await waitForText(page, 'Monthly P&L, project stats, and receivables aging.');
    await page.getByRole('button', { name: '3M' }).click();
    await page.getByRole('button', { name: '12M' }).click();
    await page.getByRole('button', { name: /export pdf/i }).click();
    log('reports', 'Verified reports page and print action');

    await page.getByRole('link', { name: 'Settings', exact: true }).click();
    await waitForText(page, 'Rate templates, operating expenses, commission rates, and account settings.');
    await page.getByRole('button', { name: /add template/i }).click();
    const templateDialog = page.locator('[role="dialog"]').filter({ hasText: 'Add Rate Template' }).first();
    await templateDialog.locator('#rt-fenceType').click();
    await pageOption(page, 'Wood').click();
    await templateDialog.locator('#rt-name').fill(`${runId} Template`);
    await templateDialog.locator('#rt-ratePerFoot').fill('10');
    await templateDialog.locator('#rt-laborRate').fill('5');
    await templateDialog.locator('#rt-description').fill(`Template ${runId}`);
    await templateDialog.getByRole('button', { name: /add template/i }).click();
    await waitForText(page, `${runId} Template`);
    const templateRow = page.locator('tr').filter({ hasText: `${runId} Template` }).first();
    await templateRow.getByRole('button').first().click();
    const editTemplateDialog = page.locator('[role="dialog"]').filter({ hasText: 'Edit Rate Template' }).first();
    await editTemplateDialog.locator('#rt-description').fill(`Template ${runId} Updated`);
    await editTemplateDialog.getByRole('button', { name: /save changes/i }).click();
    await waitForText(page, `Template ${runId} Updated`);
    await page.locator('tr').filter({ hasText: `${runId} Template` }).first().getByRole('button').nth(1).click();
    await page.getByRole('button', { name: /deactivate/i }).click();

    await page.getByRole('button', { name: /add expense/i }).click();
    const expenseDialog = page.locator('[role="dialog"]').filter({ hasText: 'Add Operating Expense' }).first();
    await expenseDialog.locator('#oe-category').fill(`Audit ${runId}`);
    await expenseDialog.locator('#oe-description').fill(`Expense ${runId}`);
    await expenseDialog.locator('#oe-amount').fill('77.77');
    await expenseDialog.locator('#oe-frequency').click();
    await pageOption(page, 'Monthly').click();
    await expenseDialog.getByRole('button', { name: /add expense/i }).click();
    await waitForText(page, `Expense ${runId}`);
    const opExpenseRow = page.locator('tr').filter({ hasText: `Expense ${runId}` }).first();
    await opExpenseRow.getByRole('button').first().click();
    const editExpenseDialog = page.locator('[role="dialog"]').filter({ hasText: 'Edit Operating Expense' }).first();
    await editExpenseDialog.locator('#oe-description').fill(`Expense ${runId} Updated`);
    await editExpenseDialog.getByRole('button', { name: /save changes/i }).click();
    await waitForText(page, `Expense ${runId} Updated`);
    await page.locator('tr').filter({ hasText: `Expense ${runId}` }).first().getByRole('button').nth(1).click();
    await page.getByRole('button', { name: /^remove$/i }).click();

    await page.locator('#cp-current').fill(DEFAULT_PASSWORD);
    await page.locator('#cp-new').fill(tempPassword);
    await page.locator('#cp-confirm').fill(tempPassword);
    await page.getByRole('button', { name: /update password/i }).click();
    await waitForText(page, 'Password updated successfully.');
    await page.locator('#cp-current').fill(tempPassword);
    await page.locator('#cp-new').fill(DEFAULT_PASSWORD);
    await page.locator('#cp-confirm').fill(DEFAULT_PASSWORD);
    await page.getByRole('button', { name: /update password/i }).click();
    await waitForText(page, 'Password updated successfully.');
    log('settings', 'Exercised rate template, operating expense, and password flows');

    await page.getByRole('link', { name: 'Commissions', exact: true }).click();
    await waitForText(page, 'Commission payouts, Aimann debt tracking, and pipeline projections.');
    tempDebtAdjustmentAmount = 2.22;
    tempDebtAdjustmentNote = `Audit adjustment ${runId}`;
    await page.getByRole('button', { name: /adjustment/i }).click();
    const adjustmentDialog = page.locator('[role="dialog"]').filter({ hasText: 'Manual Debt Adjustment' }).first();
    await adjustmentDialog.locator('#adj-amount').fill(String(tempDebtAdjustmentAmount));
    await adjustmentDialog.locator('#adj-note').fill(tempDebtAdjustmentNote);
    await adjustmentDialog.getByRole('button', { name: /save adjustment/i }).click();
    await waitForText(page, tempDebtAdjustmentNote);
    log('commissions', 'Added debt adjustment');

    await page.getByRole('button', { name: /sign out/i }).click();
    await page.waitForURL('**/login', { timeout: 20000 });
    await page.getByRole('button', { name: /meme/i }).click();
    await waitForText(page, 'Dashboard');
    log('login', 'Verified Meme login button');

    await signOut(page);
    await loginWithButton(page, 'Adnaan');
    await page.goto(`${WEB_URL}/projects/${tempProjectId}`);
    await waitForText(page, `${runId} Customer`);
    await page.getByRole('button', { name: /^delete$/i }).click();
    await page.getByRole('button', { name: /delete project/i }).click();
    await page.waitForURL('**/projects', { timeout: 20000 });
    tempProjectDeleted = true;
    log('cleanup', 'Deleted temporary project through UI');

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

    if (tempDebtAdjustmentAmount !== null && tempDebtAdjustmentNote) {
      const reversed = await apiRequest(token, 'POST', '/debt/adjustment', {
        amount: -tempDebtAdjustmentAmount,
        note: `Cleanup reversal for ${tempDebtAdjustmentNote}`,
      });
      assert.equal(reversed.status, 201, 'Failed to reverse debt adjustment cleanup');
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

      if (tempDebtAdjustmentAmount !== null && tempDebtAdjustmentNote) {
        const ledgerRes = await apiRequest(token, 'GET', '/debt/ledger');
        const hasAuditAdjustment = (ledgerRes.json?.data ?? []).some((item) => item.note === tempDebtAdjustmentNote);
        const hasCleanupAdjustment = (ledgerRes.json?.data ?? []).some(
          (item) => item.note === `Cleanup reversal for ${tempDebtAdjustmentNote}`
        );
        if (hasAuditAdjustment && !hasCleanupAdjustment) {
          await apiRequest(token, 'POST', '/debt/adjustment', {
            amount: -tempDebtAdjustmentAmount,
            note: `Cleanup reversal for ${tempDebtAdjustmentNote}`,
          });
        }
      }

      if (tempProjectId && !tempProjectDeleted) {
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
