export type DashboardDatePresetId = 'today' | 'this-month' | 'last-30-days' | 'this-year' | 'custom';

export const DASHBOARD_DATE_PRESETS: Array<{ id: Exclude<DashboardDatePresetId, 'custom'>; label: string }> = [
    { id: 'today', label: 'Today' },
    { id: 'this-month', label: 'This Month' },
    { id: 'last-30-days', label: 'Last 30 Days' },
    { id: 'this-year', label: 'This Year' },
];

export function buildDashboardDateRange(preset: Exclude<DashboardDatePresetId, 'custom'>) {
    const today = new Date();
    const end = formatDateInput(today);

    switch (preset) {
        case 'today':
            return { from: end, to: end };
        case 'this-month':
            return {
                from: formatDateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
                to: end,
            };
        case 'last-30-days': {
            const start = new Date(today);
            start.setDate(start.getDate() - 29);

            return {
                from: formatDateInput(start),
                to: end,
            };
        }
        case 'this-year':
            return {
                from: formatDateInput(new Date(today.getFullYear(), 0, 1)),
                to: end,
            };
    }
}

export function detectDashboardDatePreset(from: string, to: string): DashboardDatePresetId {
    if (!from && !to) {
        return 'custom';
    }

    for (const preset of DASHBOARD_DATE_PRESETS) {
        const range = buildDashboardDateRange(preset.id);

        if (range.from === from && range.to === to) {
            return preset.id;
        }
    }

    return 'custom';
}

function formatDateInput(value: Date) {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
}