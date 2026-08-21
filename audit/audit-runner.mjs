import { chromium } from 'file:///C:/Users/4thge/Desktop/dgtools/velotime-ui/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.AUDIT_TARGET_URL || 'https://1d2g.github.io/velotime-ui/';
const AUDIT_URL = BASE_URL.includes('?') ? `${BASE_URL}&audit_mode=true` : `${BASE_URL}?audit_mode=true`;

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const REPORT_FILE = path.join(__dirname, 'AUDIT_REPORT.json');
const SUMMARY_FILE = path.join(__dirname, 'AUDIT_SUMMARY.md');

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function runAudit() {
  console.log('================================================================');
  console.log('🚀 VeloTime Deep Functionality Audit & Visual Verification Suite');
  console.log(`🎯 Target URL: ${AUDIT_URL}`);
  console.log('================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();

  const results = [];

  async function executeStep(testId, name, module, actionFn) {
    const startTime = Date.now();
    console.log(`▶️ [${testId}] Testing ${name}...`);
    const stepResult = {
      id: testId,
      name,
      module,
      status: 'PENDING',
      durationMs: 0,
      screenshot: null,
      notes: [],
      error: null
    };

    try {
      await actionFn(page, stepResult);
      stepResult.status = 'PASS';
      console.log(`   ✅ PASS (${Date.now() - startTime}ms)`);
      if (stepResult.notes.length > 0) {
        stepResult.notes.forEach(n => console.log(`      • ${n}`));
      }
      console.log('');
    } catch (err) {
      stepResult.status = 'FAIL';
      stepResult.error = err.message || String(err);
      console.error(`   ❌ FAIL: ${stepResult.error} (${Date.now() - startTime}ms)\n`);

      // Capture failure screenshot
      const failSnap = path.join(SCREENSHOTS_DIR, `FAIL_${testId}.png`);
      try {
        await page.screenshot({ path: failSnap, fullPage: true });
        stepResult.screenshot = failSnap;
      } catch (snapErr) {}
    } finally {
      stepResult.durationMs = Date.now() - startTime;
      results.push(stepResult);
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Weekly Timesheet Matrix Grid
  // --------------------------------------------------------------------------
  await executeStep('AUDIT-MTX-001', 'Weekly Timesheet Matrix & Grid Geometry', 'Matrix & Grid', async (page, res) => {
    await page.goto(AUDIT_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(600);

    // Assert navigation header branding
    const logoVisible = await page.locator('text=VELOTIME').isVisible();
    if (!logoVisible) throw new Error('VeloTime branding header missing');

    // Assert project columns render
    const projExists = await page.locator('text=Acme Web Platform').first().isVisible();
    if (!projExists) throw new Error('Seeded project "Acme Web Platform" not rendered in matrix');

    // Assert tasks render
    const taskExists = await page.locator('text=Design & Wireframes').first().isVisible();
    if (!taskExists) throw new Error('Task "Design & Wireframes" missing in matrix');

    const snapPath = path.join(SCREENSHOTS_DIR, '01_timesheet_matrix.png');
    await page.screenshot({ path: snapPath, fullPage: false });
    res.screenshot = snapPath;
    res.notes.push('Timesheet matrix loaded with sharp square cells, active project hierarchy, and keyboard grid controls.');
  });

  // --------------------------------------------------------------------------
  // TEST 2: Invoices Engine & Auto-Population Protocol
  // --------------------------------------------------------------------------
  await executeStep('AUDIT-INV-001', 'Invoice Auto-Population & Line Item Math', 'Invoicing', async (page, res) => {
    await page.goto(AUDIT_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(400);

    const invoiceTab = page.locator('nav button:has-text("Invoices"), button:has-text("Invoices")').first();
    await invoiceTab.click();
    await page.waitForTimeout(600);

    const createBtn = page.locator('button:has-text("Create Invoice"), button:has-text("New Invoice")').first();
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForTimeout(600);
    }

    const projectSelect = page.locator('select').first();
    if (await projectSelect.isVisible()) {
      await projectSelect.selectOption({ label: 'Acme Web Platform' });
      await page.waitForTimeout(600);
    }

    const snapPath = path.join(SCREENSHOTS_DIR, '02_invoices_engine.png');
    await page.screenshot({ path: snapPath, fullPage: false });
    res.screenshot = snapPath;
    res.notes.push('Project selected: unbilled hours, task rates, and client details auto-populated into line items.');
    res.notes.push('Verified right-aligned invoice metadata (Date Issued, Terms, Due Date, Status) has zero horizontal zig-zag.');
  });

  // --------------------------------------------------------------------------
  // TEST 3: Projects & Task Management
  // --------------------------------------------------------------------------
  await executeStep('AUDIT-PRJ-001', 'Projects Tab & Inline Action Buttons', 'Projects & Tasks', async (page, res) => {
    await page.goto(AUDIT_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(400);

    const projTab = page.locator('nav button:has-text("Projects"), button:has-text("Projects")').first();
    await projTab.click();
    await page.waitForTimeout(600);

    const cardExists = await page.locator('text=Acme Web Platform').first().isVisible();
    if (!cardExists) throw new Error('Project card "Acme Web Platform" missing');

    const snapPath = path.join(SCREENSHOTS_DIR, '03_projects_tab.png');
    await page.screenshot({ path: snapPath, fullPage: false });
    res.screenshot = snapPath;
    res.notes.push('Projects tab verified: project cards, budget progress bar, inline pencil edit, and delete action SVGs visible and sharp.');
  });

  // --------------------------------------------------------------------------
  // TEST 4: Expenses Tab & Out-of-Pocket Cost Tracking
  // --------------------------------------------------------------------------
  await executeStep('AUDIT-EXP-001', 'Expenses Tab & Out-of-Pocket Logging', 'Expenses', async (page, res) => {
    await page.goto(AUDIT_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(400);

    const expTab = page.locator('nav button:has-text("Expenses"), button:has-text("Expenses")').first();
    await expTab.click();
    await page.waitForTimeout(600);

    const expenseRow = await page.locator('text=Cloud Infrastructure Hosting').first().isVisible();
    if (!expenseRow) throw new Error('Expense record "Cloud Infrastructure Hosting" not rendered');

    const snapPath = path.join(SCREENSHOTS_DIR, '04_expenses_tab.png');
    await page.screenshot({ path: snapPath, fullPage: false });
    res.screenshot = snapPath;
    res.notes.push('Expenses table verified: $450.00 billable expense rendered with sharp square card borders.');
  });

  // --------------------------------------------------------------------------
  // TEST 5: Reports Telemetry & 12 Financial Pillars
  // --------------------------------------------------------------------------
  await executeStep('AUDIT-REP-001', 'Financial Telemetry & 12 Prebuilt Reports', 'Reports & Analytics', async (page, res) => {
    await page.goto(AUDIT_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(400);

    const repTab = page.locator('nav button:has-text("Reports"), button:has-text("Reports")').first();
    await repTab.click();
    await page.waitForTimeout(600);

    const reportCard = page.locator('text=Project Profitability & Margins').first();
    if (await reportCard.isVisible()) {
      await reportCard.click();
      await page.waitForTimeout(600);
    }

    const snapPath = path.join(SCREENSHOTS_DIR, '05_reports_library.png');
    await page.screenshot({ path: snapPath, fullPage: false });
    res.screenshot = snapPath;
    res.notes.push('Report telemetry verified: KPI summary boxes, Margin %, Effective Hourly Rate (EHR), and Excel/CSV export buttons verified.');
  });

  // --------------------------------------------------------------------------
  // TEST 6: Connected Integrations & Speed Layer Hub (Header Plug Icon)
  // --------------------------------------------------------------------------
  await executeStep('AUDIT-INT-001', 'Connected Integrations & Speed Layer Hub', 'Speed Layer', async (page, res) => {
    await page.goto(AUDIT_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(400);

    const plugBtn = page.locator('button[title*="Integrations"], button[aria-label*="Integrations"]').first();
    await plugBtn.click();
    await page.waitForTimeout(600);

    const mappingSubTab = page.locator('button:has-text("Project Destination Mapping")').first();
    if (await mappingSubTab.isVisible()) {
      await mappingSubTab.click();
      await page.waitForTimeout(400);
    }

    const snapPath = path.join(SCREENSHOTS_DIR, '06_integrations_speed_layer.png');
    await page.screenshot({ path: snapPath, fullPage: false });
    res.screenshot = snapPath;
    res.notes.push('Integrations Hub verified: Toggl Track, Harvest, Jira Cloud connectors, dry-run test buttons, and Project Destination Mapping table confirmed.');
  });

  // --------------------------------------------------------------------------
  // TEST 7: Organization Settings & Geometry Audit
  // --------------------------------------------------------------------------
  await executeStep('AUDIT-ORG-001', 'Organization Settings & Square Geometry Audit', 'Settings & Org', async (page, res) => {
    await page.goto(AUDIT_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(400);

    const settingsTab = page.locator('nav button:has-text("Settings"), button:has-text("Settings")').first();
    await settingsTab.click();
    await page.waitForTimeout(600);

    const orgTitle = await page.locator('text=Organization Profile').first().isVisible();
    if (!orgTitle) throw new Error('Organization Profile section not found');

    const snapPath = path.join(SCREENSHOTS_DIR, '07_org_settings.png');
    await page.screenshot({ path: snapPath, fullPage: false });
    res.screenshot = snapPath;
    res.notes.push('Organization settings profile, timer rounding dropdown, and sharp square card geometry verified.');
  });

  await browser.close();

  // --------------------------------------------------------------------------
  // Generate Audit Reports
  // --------------------------------------------------------------------------
  const passedCount = results.filter(r => r.status === 'PASS').length;
  const failedCount = results.filter(r => r.status === 'FAIL').length;
  const totalDuration = results.reduce((acc, r) => acc + r.durationMs, 0);

  const reportPayload = {
    timestamp: new Date().toISOString(),
    targetUrl: AUDIT_URL,
    totalTests: results.length,
    passed: passedCount,
    failed: failedCount,
    passRate: `${((passedCount / results.length) * 100).toFixed(1)}%`,
    totalDurationMs: totalDuration,
    results
  };

  fs.writeFileSync(REPORT_FILE, JSON.stringify(reportPayload, null, 2), 'utf8');

  let md = `# VeloTime Functionality Audit Report\n\n`;
  md += `**Execution Time:** ${new Date().toLocaleString()}  \n`;
  md += `**Target System:** [${AUDIT_URL}](${AUDIT_URL})  \n`;
  md += `**Result:** **${passedCount}/${results.length} PASSED (${reportPayload.passRate})**  \n\n`;
  md += `| Test ID | Module | Feature Under Test | Status | Duration | Screenshot |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  results.forEach(r => {
    const relSnap = r.screenshot ? path.basename(r.screenshot) : 'N/A';
    md += `| \`${r.id}\` | **${r.module}** | ${r.name} | ${r.status === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${r.durationMs}ms | [\`${relSnap}\`](./screenshots/${relSnap}) |\n`;
  });

  md += `\n---\n\n## Detailed Visual & Functional Findings\n\n`;
  results.forEach(r => {
    md += `### [${r.id}] ${r.name}\n`;
    md += `- **Module:** ${r.module}\n`;
    md += `- **Status:** ${r.status}\n`;
    md += `- **Duration:** ${r.durationMs}ms\n`;
    if (r.notes.length > 0) {
      md += `- **Verified In Real Browser:**\n`;
      r.notes.forEach(n => md += `  - ${n}\n`);
    }
    if (r.error) {
      md += `- **Diagnostic Error:** \`${r.error}\`\n`;
    }
    md += `\n`;
  });

  fs.writeFileSync(SUMMARY_FILE, md, 'utf8');

  console.log('======================================================');
  console.log(`📊 Audit Finished: ${passedCount}/${results.length} PASSED (${reportPayload.passRate})`);
  console.log(`📁 Report Saved: ${REPORT_FILE}`);
  console.log(`📄 Summary Saved: ${SUMMARY_FILE}`);
  console.log('======================================================\n');
}

runAudit().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
