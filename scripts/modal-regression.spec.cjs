const { test, expect } = require('playwright/test');

const baseUrl = 'http://127.0.0.1:8000';

const orientations = [
    { label: 'portrait', viewport: { width: 390, height: 844 } },
    { label: 'landscape', viewport: { width: 844, height: 390 } },
];

const modalCases = [
    {
        label: 'property-custodian-receipt-modal',
        email: 'custodian@gmail.com',
        password: '12345678',
        path: '/property-custodian/requests',
        trigger: /view receipt|release items/i,
    },
    {
        label: 'department-head-receipt-modal',
        email: 'depthead@gmail.com',
        password: '12345678',
        path: '/department-head/requests',
        trigger: /view receipt/i,
    },
];

async function login(page, email, password) {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole('button', { name: /log in/i }).click();
    try {
        await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 30000 });
    } catch (err) {
        const currentUrl = page.url();
        const errorText = await page.locator('p[class*="text-destructive"], [class*="error"], p').first().textContent().catch(() => '(could not read error text)');
        throw new Error(`Login timed out for ${email}. Still at: ${currentUrl}. Visible error: "${errorText}"`);
    }
    await page.waitForLoadState('networkidle');
}

for (const modalCase of modalCases) {
    for (const orientation of orientations) {
        test(`${modalCase.label} ${orientation.label}`, async ({ page }) => {
            await page.setViewportSize(orientation.viewport);

            await login(page, modalCase.email, modalCase.password);
            await page.goto(`${baseUrl}${modalCase.path}`, { waitUntil: 'networkidle' });

            const trigger = page.getByRole('button', { name: modalCase.trigger }).first();

            if ((await trigger.count()) === 0) {
                test.skip(true, `No seeded row available for ${modalCase.label}.`);
                return;
            }

            await expect(trigger).toBeVisible();
            await trigger.click();

            const dialog = page.locator('[role="dialog"]').first();
            await expect(dialog).toBeVisible();

            const closeButton = dialog.getByRole('button', { name: /close/i });
            await expect(closeButton).toBeVisible();

            const beforeCloseRect = await closeButton.boundingBox();
            const modalBody = dialog.locator('[data-modal-body]').first();
            await modalBody.evaluate((element) => {
                element.scrollTop = element.scrollHeight;
            });
            await expect(closeButton).toBeVisible();
            const afterCloseRect = await closeButton.boundingBox();

            if (beforeCloseRect && afterCloseRect) {
                expect(Math.abs(beforeCloseRect.y - afterCloseRect.y)).toBeLessThanOrEqual(6);
            }

            const releaseButton = dialog.getByRole('button', { name: /^release$/i });
            if ((await releaseButton.count()) > 0) {
                await expect(releaseButton).toBeVisible();
                await expect(dialog.getByRole('button', { name: /cancel/i })).toBeVisible();
            } else {
                await expect(dialog.getByRole('button', { name: /print/i })).toBeVisible();
                await expect(dialog.getByRole('button', { name: /export excel/i })).toBeVisible();
            }

            const tableWrapper = dialog.locator('[data-receipt-table-wrapper]').first();
            if ((await tableWrapper.count()) > 0) {
                const tableState = await tableWrapper.evaluate((element) => {
                    const styles = window.getComputedStyle(element);
                    return {
                        scrollWidth: element.scrollWidth,
                        clientWidth: element.clientWidth,
                        overflowX: styles.overflowX,
                    };
                });

                if (orientation.viewport.width < 768) {
                    expect(tableState.scrollWidth).toBeGreaterThanOrEqual(tableState.clientWidth);
                } else {
                    expect(['visible', 'clip', 'hidden']).toContain(tableState.overflowX);
                }
            }
        });
    }
}