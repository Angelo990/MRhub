import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { initializeTheme } from './hooks/use-appearance';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

declare global {
    interface Window {
        __mrhubHistoryGuardInstalled?: boolean;
        __mrhubChartWarningFilterInstalled?: boolean;
    }
}

function installHistoryGuard() {
    if (window.__mrhubHistoryGuardInstalled) {
        return;
    }

    window.__mrhubHistoryGuardInstalled = true;

    window.addEventListener('pageshow', (event) => {
        const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
        const isHistoryNavigation = navigationEntry?.type === 'back_forward';

        if (event.persisted || isHistoryNavigation) {
            window.location.reload();
        }
    });
}

function installChartWarningFilter() {
    if (window.__mrhubChartWarningFilterInstalled) {
        return;
    }

    window.__mrhubChartWarningFilterInstalled = true;

    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const chartWarningText = 'The width(-1) and height(-1) of chart should be greater than 0';

    console.error = (...args: unknown[]) => {
        const firstArg = args[0];
        if (typeof firstArg === 'string' && firstArg.includes(chartWarningText)) {
            return;
        }

        originalConsoleError(...args);
    };

    console.warn = (...args: unknown[]) => {
        const firstArg = args[0];
        if (typeof firstArg === 'string' && firstArg.includes(chartWarningText)) {
            return;
        }

        originalConsoleWarn(...args);
    };
}

createInertiaApp({
    title: (title) => title ? `${title} - ${appName}` : appName,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        installHistoryGuard();
        installChartWarningFilter();

        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
