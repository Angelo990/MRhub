const { test, expect, devices } = require('playwright/test');

const baseUrl = 'http://127.0.0.1:8000';
const roleCases = [
    {
        label: 'admin',
        email: 'admin@gmail.com',
        password: '12345678',
        pages: ['/dashboard/admin', '/admin/users'],
    },
    {
        label: 'property-custodian',
        email: 'custodian@gmail.com',
        password: '12345678',
        pages: ['/dashboard/property-custodian', '/property-custodian/items', '/property-custodian/requests'],
    },
    {
        label: 'vp-finance',
        email: 'vpfinance@gmail.com',
        password: '12345678',
        pages: ['/dashboard/vp-finance', '/vp-finance/requests'],
    },
    {
        label: 'department-head',
        email: 'depthead@gmail.com',
        password: '12345678',
        pages: ['/dashboard/department-head', '/department-head/requests', '/department-head/requests/create', '/notifications'],
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

async function auditPage(page, path) {
    await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });

    return page.evaluate(() => {
        const doc = document.documentElement;
        const overflow = Math.max(doc.scrollWidth - doc.clientWidth, 0);

        const isInsideHorizontalScrollRegion = (element) => {
            let current = element.parentElement;

            while (current) {
                const styles = window.getComputedStyle(current);
                const allowsHorizontalScroll = ['auto', 'scroll'].includes(styles.overflowX) || ['auto', 'scroll'].includes(styles.overflow);

                if (allowsHorizontalScroll && current.scrollWidth > current.clientWidth) {
                    return true;
                }

                current = current.parentElement;
            }

            return false;
        };

        const offenders = [...document.querySelectorAll('*')]
            .map((element) => {
                const rect = element.getBoundingClientRect();
                return {
                    element,
                    tag: element.tagName.toLowerCase(),
                    className: element.className,
                    width: Math.round(rect.width),
                    right: Math.round(rect.right),
                };
            })
            .filter((entry) => entry.right > window.innerWidth + 1 && entry.width > window.innerWidth * 0.5)
            .filter((entry) => !isInsideHorizontalScrollRegion(entry.element))
            .map(({ element, ...entry }) => entry)
            .slice(0, 10);

        return {
            title: document.title,
            viewportWidth: window.innerWidth,
            scrollWidth: doc.scrollWidth,
            overflow,
            offenders,
        };
    });
}

test.use({ ...devices['iPhone 13'] });

for (const roleCase of roleCases) {
    test(`${roleCase.label} mobile pages stay within viewport`, async ({ page }) => {
        const chartWarnings = [];
        page.on('console', (message) => {
            const text = message.text();
            if (isChartSizeWarning(text)) {
                chartWarnings.push(text);
            }
        });

        await login(page, roleCase.email, roleCase.password);

        for (const path of roleCase.pages) {
            const result = await auditPage(page, path);
            console.log(JSON.stringify({ role: roleCase.label, path, ...result }));
            expect.soft(result.overflow, `${roleCase.label} ${path} overflowed by ${result.overflow}px`).toBe(0);
            expect.soft(result.offenders, `${roleCase.label} ${path} wide elements: ${JSON.stringify(result.offenders)}`).toEqual([]);

            const modalAudit = await maybeAuditModalLayout(page, path);
            if (modalAudit && !modalAudit.skipped) {
                expect.soft(
                    modalAudit.exceedsViewport,
                    `${roleCase.label} ${path} modal exceeds viewport: ${JSON.stringify(modalAudit)}`,
                ).toBe(false);
            }
        }

        if (chartWarnings.length > 0) {
            console.log(JSON.stringify({ role: roleCase.label, chartWarnings }));
        }
    });
}

function isChartSizeWarning(text) {
    const normalized = String(text || '').toLowerCase();
    return normalized.includes('the width') && normalized.includes('and height') && normalized.includes('of chart should be greater than 0');
}

async function maybeAuditModalLayout(page, path) {
    if (!['/property-custodian/requests', '/department-head/requests'].includes(path)) {
        return null;
    }

    const modalTrigger = page.getByRole('button', { name: /view receipt|release items/i }).first();

    if ((await modalTrigger.count()) === 0) {
        return { skipped: true, reason: 'no receipt/release modal trigger found on page' };
    }

    await modalTrigger.click();
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();

    const metrics = await dialog.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const exceedsViewport = rect.width > window.innerWidth + 1 || rect.height > window.innerHeight + 1;
        return {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            exceedsViewport,
        };
    });

    await page.keyboard.press('Escape');
    return { skipped: false, ...metrics };
}