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

    await burger.click();
    await expect(drawer).toHaveClass(/hm__drawer--open/);

    const closeBtn = page.locator('.hm__drawer-close');
    await closeBtn.click();
    await expect(drawer).not.toHaveClass(/hm__drawer--open/);
  });

  test('08. Should have zero horizontal scroll overflow across mobile viewports (360px, 390px, 412px)', async ({ page }) => {
    const viewports = [
      { width: 360, height: 800 },
      { width: 390, height: 844 },
      { width: 412, height: 915 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth ||
               document.body.scrollWidth > window.innerWidth;
      });

      expect(hasOverflow).toBeFalsy();

      // Ensure burger is within viewport boundary
      const burgerBox = await page.locator('.hm__burger').boundingBox();
      expect(burgerBox).not.toBeNull();
      if (burgerBox) {
        expect(burgerBox.x + burgerBox.width).toBeLessThanOrEqual(vp.width);
        expect(burgerBox.x).toBeGreaterThan(0);
      }
    }
  });

  test('09. Should apply premium level color gradients, frosted glass navbar & hero CTAs', async ({ page }) => {
    const heroTitle = page.locator('.hm__hero-title');
    await expect(heroTitle).toBeVisible();

    const primaryBtn = page.locator('.hm__hero-ctas .hm__btn--primary');
    await expect(primaryBtn).toBeVisible();

    const nav = page.locator('.hm__nav');
    await expect(nav).toBeVisible();

    // Verify computed background and text styling
    const heroColor = await primaryBtn.evaluate((el: HTMLElement) => {
      const style = window.getComputedStyle(el);
      return {
        color: style.color,
        display: style.display,
        borderRadius: style.borderRadius
      };
    });

    expect(['flex', 'inline-flex']).toContain(heroColor.display);
    expect(heroColor.borderRadius).toBe('14px');
  });

  test('10. Cookie banner: should appear on first visit, accept all hides it and stores consent', async ({ page }) => {
    // Clear localStorage before navigating
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.removeItem('svk_cookie_consent'));
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Banner should appear after 1.2s delay
    const banner = page.locator('.hm__cookie');
    await expect(banner).toBeAttached();
    await expect(banner).not.toHaveClass(/hm__cookie--visible/);

    // Wait for the 1.2s timeout + buffer
    await page.waitForTimeout(1600);
    await expect(banner).toHaveClass(/hm__cookie--visible/);

    // Click "Accept All"
    const acceptBtn = page.locator('.hm__cookie .hm__cookie-btn--primary');
    await expect(acceptBtn).toBeVisible();
    await acceptBtn.click();

    // Banner should hide
    await expect(banner).not.toHaveClass(/hm__cookie--visible/);

    // LocalStorage should be set
    const stored = await page.evaluate(() => localStorage.getItem('svk_cookie_consent'));
    expect(stored).not.toBeNull();
    const prefs = JSON.parse(stored!);
    expect(prefs.necessary).toBe(true);
    expect(prefs.analytics).toBe(true);
    expect(prefs.marketing).toBe(true);
    expect(prefs.personalization).toBe(true);
  });

  test('11. Cookie options modal: should open, toggle preferences, save and close', async ({ page }) => {
    // Ensure no prior consent so banner appears
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.removeItem('svk_cookie_consent'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1600);

    const banner = page.locator('.hm__cookie');
    await expect(banner).toHaveClass(/hm__cookie--visible/);

    // Click Options
    const optionsBtn = page.locator('.hm__cookie .hm__cookie-btn--ghost');
    await optionsBtn.click();

    // Modal should open
    const modal = page.locator('.hm__cookie-modal');
    await expect(modal).toHaveClass(/hm__cookie-modal--open/);
    await expect(page.locator('.hm__cookie-modal-title')).toBeVisible();

    // Toggle analytics on
    const analyticsToggle = page.locator('.hm__cookie-row').nth(1).locator('.hm__cookie-toggle');
    await analyticsToggle.click();
    await expect(analyticsToggle).toHaveClass(/hm__cookie-toggle--on/);

    // Save Preferences
    const saveBtn = page.locator('.hm__cookie-modal-footer .hm__cookie-btn--outline');
    await saveBtn.click();

    // Modal and banner should close
    await expect(modal).not.toHaveClass(/hm__cookie-modal--open/);
    await expect(banner).not.toHaveClass(/hm__cookie--visible/);

    // Verify analytics is saved as true, marketing as false
    const stored = await page.evaluate(() => localStorage.getItem('svk_cookie_consent'));
    expect(stored).not.toBeNull();
    const prefs = JSON.parse(stored!);
    expect(prefs.necessary).toBe(true);
    expect(prefs.analytics).toBe(true);
    expect(prefs.marketing).toBe(false);
  });

});
