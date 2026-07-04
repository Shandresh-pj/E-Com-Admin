import { test, expect, Page, BrowserContext } from '@playwright/test';

const EMAIL    = process.env['TEST_EMAIL']    ?? 'Sp@gmail.com';
const PASSWORD = process.env['TEST_PASSWORD'] ?? '12345678';

/** Login once and reuse the session across all tests in this file. */
let sharedContext: BrowserContext;

test.beforeAll(async ({ browser }) => {
  sharedContext = await browser.newContext();
  const page = await sharedContext.newPage();

  await page.goto('/authentication/login');
  await page.waitForLoadState('networkidle');

  // Only fill the form if the login page is actually shown
  const emailInput = page.locator('#login-email');
  const isLoginPage = await emailInput.isVisible({ timeout: 5_000 }).catch(() => false);

  if (isLoginPage) {
    await emailInput.fill(EMAIL);
    await page.locator('#login-password').fill(PASSWORD);
    await page.locator('#login-submit').click();
    await page.waitForURL((url) => !url.pathname.includes('/authentication'), { timeout: 15_000 });
  }

  await page.close();
});

test.afterAll(async () => {
  await sharedContext.close();
});

/**
 * Navigate to a route and verify mat-table rows appear WITHOUT user interaction.
 * Uses the shared authenticated context.
 */
async function expectTableHasData(page: Page, path: string, hostSelector: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');

  await expect(page.locator(hostSelector)).toBeVisible({ timeout: 10_000 });

  // Verify at least one data row (not header) rendered without any hover/click
  const rowLocator = page.locator(`${hostSelector} tr.mat-mdc-row, ${hostSelector} tr[mat-row]`);
  await expect(rowLocator.first()).toBeVisible({ timeout: 8_000 });

  // Ensure cells have text (not empty bindings)
  const firstCell = rowLocator.first().locator('td').first();
  await expect(firstCell).not.toBeEmpty({ timeout: 3_000 });
}

// All tests share a single authenticated browser context
test.use({ storageState: undefined });

test.describe('Table data renders immediately (no hover required)', () => {

  test.beforeEach(async ({ }, testInfo) => {
    // Attach the shared context page in each test
    testInfo.annotations.push({ type: 'tag', description: 'table-data' });
  });

  test('Roles table', async ({}) => {
    const page = await sharedContext.newPage();
    try {
      await expectTableHasData(page, '/components/roles', 'app-roles');
    } finally {
      await page.close();
    }
  });

  test('Branch table', async ({}) => {
    const page = await sharedContext.newPage();
    try {
      await expectTableHasData(page, '/components/branch', 'app-branch');
    } finally {
      await page.close();
    }
  });

  test('Employees table', async ({}) => {
    const page = await sharedContext.newPage();
    try {
      await expectTableHasData(page, '/components/employees', 'app-employees');
    } finally {
      await page.close();
    }
  });

  test('Menu Bar table', async ({}) => {
    const page = await sharedContext.newPage();
    try {
      await expectTableHasData(page, '/components/menubar', 'app-menu-bar');
    } finally {
      await page.close();
    }
  });

  test('Admin / Companies table', async ({}) => {
    const page = await sharedContext.newPage();
    try {
      await expectTableHasData(page, '/components/admin', 'app-app-admin');
    } finally {
      await page.close();
    }
  });

  test('Category table', async ({}) => {
    const page = await sharedContext.newPage();
    try {
      await expectTableHasData(page, '/components/category', 'app-category');
    } finally {
      await page.close();
    }
  });

  test('Product Attribute table', async ({}) => {
    const page = await sharedContext.newPage();
    try {
      await expectTableHasData(page, '/components/product-attribute', 'app-product-attribute');
    } finally {
      await page.close();
    }
  });

  test('Attribute Value table', async ({}) => {
    const page = await sharedContext.newPage();
    try {
      await expectTableHasData(page, '/components/attribute-value', 'app-attribute-value');
    } finally {
      await page.close();
    }
  });

  test('Status table', async ({}) => {
    const page = await sharedContext.newPage();
    try {
      await expectTableHasData(page, '/components/status', 'app-status');
    } finally {
      await page.close();
    }
  });

  test('Order table', async ({}) => {
    const page = await sharedContext.newPage();
    try {
      await expectTableHasData(page, '/components/order', 'app-order');
    } finally {
      await page.close();
    }
  });
});
