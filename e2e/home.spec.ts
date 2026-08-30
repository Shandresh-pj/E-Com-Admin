import { test, expect } from '@playwright/test';

test.describe('SVK E-Com Home Page - Enterprise Application Ecosystem Suite', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('01. Should load home page with core structural sections', async ({ page }) => {
    const hero = page.locator('.hm__hero');
    await expect(hero).toBeVisible();

    const heroTitle = page.locator('.hm__hero-title');
    await expect(heroTitle).toBeVisible();
    await expect(heroTitle).toContainText('Manage Your');

    await expect(page.locator('#ecosystem')).toBeAttached();
    await expect(page.locator('#capabilities')).toBeAttached();
    await expect(page.locator('#pricing')).toBeAttached();
    await expect(page.locator('#faq')).toBeAttached();
    await expect(page.locator('.hm__footer')).toBeVisible();
  });

  test('02. Should interact with Platform Ecosystem role tabs & 3D Phone Deck', async ({ page }) => {
    const ecoSection = page.locator('#ecosystem');
    await ecoSection.scrollIntoViewIfNeeded();

    const roleTabs = page.locator('.hm__role-tab');
    await expect(roleTabs).toHaveCount(6);

    const adminTab = roleTabs.nth(1);
    await adminTab.click();
    await expect(adminTab).toHaveClass(/hm__role-tab--active/);
    await expect(page.locator('.hm__role-name')).toContainText('Admin Application');

    const branchTab = roleTabs.nth(2);
    await branchTab.click();
    await expect(branchTab).toHaveClass(/hm__role-tab--active/);
    await expect(page.locator('.hm__role-name')).toContainText('Branch Application');

    // Verify Dynamic Island & Dock Navbar
    await expect(page.locator('.hm__phone-notch').first()).toBeVisible();
    await expect(page.locator('.hm__phone-dock')).toBeVisible();
  });

  test('03. Should switch Desktop Software screen tabs', async ({ page }) => {
    const desktopSection = page.locator('#desktop');
    await desktopSection.scrollIntoViewIfNeeded();

    const tabs = page.locator('.hm__window-tab');
    await expect(tabs).toHaveCount(5);

    await tabs.nth(1).click();
    await expect(page.locator('.hm__screen-name')).toContainText('Inventory Workspace');

    await tabs.nth(2).click();
    await expect(page.locator('.hm__screen-name')).toContainText('Billing Workspace');
  });

  test('04. Should calculate ROI savings dynamically on input change', async ({ page }) => {
    const roiSection = page.locator('.hm__roi-card');
    await roiSection.scrollIntoViewIfNeeded();

    const savingsVal = page.locator('.hm__roi-savings');
    await expect(savingsVal).toBeVisible();
    const initialText = await savingsVal.textContent();
    expect(initialText).toContain('₹');
  });

  test('05. Should toggle pricing billing cycle (Monthly / Yearly)', async ({ page }) => {
    const pricingSection = page.locator('#pricing');
    await pricingSection.scrollIntoViewIfNeeded();

    const toggleSwitch = page.locator('.hm__tog-switch');
    await expect(toggleSwitch).toBeVisible();

    const dot = page.locator('.hm__tog-dot');
    await expect(dot).not.toHaveClass(/hm__tog-dot--yearly/);

    await toggleSwitch.click();
    await expect(dot).toHaveClass(/hm__tog-dot--yearly/);

    await toggleSwitch.click();
    await expect(dot).not.toHaveClass(/hm__tog-dot--yearly/);
  });

  test('06. Should expand and collapse FAQ accordion items', async ({ page }) => {
    const faqSection = page.locator('#faq');
    await faqSection.scrollIntoViewIfNeeded();

    const firstItem = page.locator('.hm__faq-item').first();
    const trigger = firstItem.locator('.hm__faq-trigger');
    const answer = firstItem.locator('.hm__faq-answer');

    await expect(firstItem).not.toHaveClass(/hm__faq-item--open/);

    await trigger.click();
    await expect(firstItem).toHaveClass(/hm__faq-item--open/);
    await expect(answer).toHaveClass(/hm__faq-answer--open/);

    await trigger.click();
    await expect(firstItem).not.toHaveClass(/hm__faq-item--open/);
  });

  test('07. Should display responsive mobile menu drawer on mobile viewports', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const burger = page.locator('.hm__burger');
    await expect(burger).toBeVisible();

    const drawer = page.locator('.hm__drawer');
    await expect(drawer).not.toHaveClass(/hm__drawer--open/);

    await burger.evaluate((el: HTMLElement) => el.click());
    await expect(drawer).toHaveClass(/hm__drawer--open/);

    const closeBtn = page.locator('.hm__drawer-close');
    await closeBtn.evaluate((el: HTMLElement) => el.click());
    await expect(drawer).not.toHaveClass(/hm__drawer--open/);
  });

});
