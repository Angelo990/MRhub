import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { initializeTheme } from './hooks/use-appearance';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

declare global {
    interface Window {
        __mrhubHistoryGuardInstalled?: boolean;
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

createInertiaApp({
    title: (title) => title ? `${title} - ${appName}` : appName,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        installHistoryGuard();

        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
