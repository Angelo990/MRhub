/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
    testDir: './scripts',
    testMatch: /mobile-audit\.spec\.cjs/,
    reporter: [['line'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
    timeout: 120000,
    outputDir: 'test-results/mobile-audit',
    use: {
        baseURL: 'http://127.0.0.1:8000',
        browserName: 'chromium',
        trace: 'retain-on-failure',
        video: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
};