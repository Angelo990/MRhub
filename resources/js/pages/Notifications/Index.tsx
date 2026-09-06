import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    getBrowserNotificationPermission,
    requestBrowserNotificationPermission,
    supportsBrowserNotifications,
} from '@/lib/browser-notifications';
import notificationsRoute from '@/routes/notifications';
import { type BreadcrumbItem, type NotificationItem, type SharedData } from '@/types';
import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Bell, CheckCheck, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';

interface NotificationHistoryPage {
    data: NotificationItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
}

interface PageProps {
    notificationHistory: NotificationHistoryPage;
    activeFilters: {
        readState: 'all' | 'read' | 'unread';
        status: string[];
        type: string[];
        fromDate: string | null;
        toDate: string | null;
        perPage: number;
    };
    filterOptions: {
        statuses: string[];
        types: string[];
    };
}

const severityClassMap: Record<'success' | 'warning' | 'danger' | 'info', string> = {
    success: 'border-emerald-200 bg-emerald-100 text-emerald-800',
    warning: 'border-amber-200 bg-amber-100 text-amber-800',
    danger: 'border-red-200 bg-red-100 text-red-800',
    info: 'border-sky-200 bg-sky-100 text-sky-800',
};

function prettifyKey(value: string) {
    return value
        .split('-')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Notifications',
        href: notificationsRoute.index().url,
    },
];

export default function NotificationsIndex() {
    const { notificationHistory, csrf_token, activeFilters, filterOptions } = usePage<SharedData & PageProps>().props;
    const [browserPermission, setBrowserPermission] = useState(getBrowserNotificationPermission());
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [perPage, setPerPage] = useState(String(activeFilters.perPage ?? notificationHistory.per_page ?? 20));
    const [readState, setReadState] = useState<'all' | 'read' | 'unread'>(activeFilters.readState ?? 'all');
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>(activeFilters.status ?? []);
    const [selectedTypes, setSelectedTypes] = useState<string[]>(activeFilters.type ?? []);
    const [fromDate, setFromDate] = useState(activeFilters.fromDate ?? '');
    const [toDate, setToDate] = useState(activeFilters.toDate ?? '');

    const activeFilterCount = [
        readState !== 'all' ? 1 : 0,
        selectedStatuses.length,
        selectedTypes.length,
        fromDate ? 1 : 0,
        toDate ? 1 : 0,
    ].reduce((sum, count) => sum + count, 0);

    const handleMarkAllRead = async () => {
        await fetch('/notifications/read-all', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN': csrf_token,
            },
        });

        router.reload({ only: ['notifications', 'notificationHistory'] });
    };

    const handleMarkRead = async (id: string) => {
        await fetch(`/notifications/${id}/read`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN': csrf_token,
            },
        });

        router.reload({ only: ['notifications', 'notificationHistory'] });
    };

    const handleEnableBrowserAlerts = async () => {
        const permission = await requestBrowserNotificationPermission();
        setBrowserPermission(permission);
    };

    const toggleSelection = (value: string, current: string[], setter: (next: string[]) => void) => {
        setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
    };

    const buildQuery = (overrides?: Partial<{
        readState: 'all' | 'read' | 'unread';
        status: string[];
        type: string[];
        fromDate: string;
        toDate: string;
        perPage: string;
    }>) => {
        const nextReadState = overrides?.readState ?? readState;
        const nextStatuses = overrides?.status ?? selectedStatuses;
        const nextTypes = overrides?.type ?? selectedTypes;
        const nextFromDate = overrides?.fromDate ?? fromDate;
        const nextToDate = overrides?.toDate ?? toDate;
        const nextPerPage = overrides?.perPage ?? perPage;

        return {
            ...(nextReadState !== 'all' ? { readState: nextReadState } : {}),
            ...(nextStatuses.length > 0 ? { status: nextStatuses } : {}),
            ...(nextTypes.length > 0 ? { type: nextTypes } : {}),
            ...(nextFromDate ? { fromDate: nextFromDate } : {}),
            ...(nextToDate ? { toDate: nextToDate } : {}),
            perPage: nextPerPage,
        };
    };

    const updatePerPage = (value: string) => {
        setPerPage(value);
        router.get(notificationsRoute.index().url, buildQuery({ perPage: value }), {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const applyFilters = () => {
        router.get(
            notificationsRoute.index().url,
            buildQuery(),
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
        setIsFilterModalOpen(false);
    };

    const clearFilters = () => {
        setReadState('all');
        setSelectedStatuses([]);
        setSelectedTypes([]);
        setFromDate('');
        setToDate('');

        router.get(notificationsRoute.index().url, buildQuery({
            readState: 'all',
            status: [],
            type: [],
            fromDate: '',
            toDate: '',
        }), {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
        setIsFilterModalOpen(false);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Notifications" />

            <div className="space-y-6 p-4 md:p-6">
                {supportsBrowserNotifications() ? (
                    browserPermission !== 'granted' ? (
                        <Card>
                            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <p className="text-sm font-medium">Browser alerts are off</p>
                                    <p className="text-sm text-muted-foreground">
                                        Enable them if you want notifications while this tab is in the background or the browser is minimized.
                                    </p>
                                    {browserPermission === 'denied' ? (
                                        <p className="mt-1 text-xs text-amber-700">
                                            Browser permission is blocked. Enable notifications for this site in browser settings.
                                        </p>
                                    ) : null}
                                </div>
                                <Button type="button" onClick={() => void handleEnableBrowserAlerts()}>
                                    Enable browser alerts
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="p-4 text-sm text-muted-foreground">
                                Browser alerts are enabled. You can receive notifications while this tab is in the background as long as the browser remains open.
                            </CardContent>
                        </Card>
                    )
                ) : null}

                <Card>
                    <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2 text-2xl">
                                <Bell className="h-5 w-5" />
                                Notifications
                            </CardTitle>
                            <CardDescription>
                                Review workflow updates, approvals, rejections, releases, and completions in one place.
                            </CardDescription>
                        </div>

                        <Button type="button" variant="outline" onClick={() => void handleMarkAllRead()}>
                            <CheckCheck className="mr-2 h-4 w-4" />
                            Mark all as read
                        </Button>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-medium">Filters</span>
                                {activeFilterCount > 0 ? (
                                    <Badge variant="secondary">{activeFilterCount} active</Badge>
                                ) : (
                                    <span className="text-sm text-muted-foreground">No active filters</span>
                                )}
                                {readState !== 'all' ? <Badge variant="outline">{readState}</Badge> : null}
                                {selectedStatuses.length > 0 ? <Badge variant="outline">{selectedStatuses.length} status</Badge> : null}
                                {selectedTypes.length > 0 ? <Badge variant="outline">{selectedTypes.length} type</Badge> : null}
                                {fromDate || toDate ? <Badge variant="outline">Date range</Badge> : null}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>Show</span>
                                    <select
                                        value={perPage}
                                        onChange={(event) => updatePerPage(event.target.value)}
                                        className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                                    >
                                        <option value="10">10</option>
                                        <option value="20">20</option>
                                        <option value="50">50</option>
                                        <option value="100">100</option>
                                    </select>
                                    <span>entries</span>
                                </label>
                                <Button type="button" variant="outline" onClick={() => setIsFilterModalOpen(true)}>
                                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                                    Filter notifications
                                </Button>
                                {activeFilterCount > 0 ? (
                                    <Button type="button" variant="ghost" onClick={clearFilters}>Clear</Button>
                                ) : null}
                            </div>
                        </div>

                        <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
                            <DialogContent className="w-[calc(100vw-1.5rem)] max-w-2xl p-0">
                                <DialogHeader className="border-b border-border/70 px-4 py-3 pr-12 sm:px-6 sm:pr-12">
                                    <DialogTitle>Filter Notifications</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 px-4 py-4 sm:px-6">
                                    <div className="grid gap-4 md:grid-cols-3">
                                        <label className="space-y-1 text-sm">
                                            <span className="font-medium">Read state</span>
                                            <select
                                                value={readState}
                                                onChange={(event) => setReadState(event.target.value as 'all' | 'read' | 'unread')}
                                                className="h-10 w-full rounded-md border border-input bg-background px-3"
                                            >
                                                <option value="all">All</option>
                                                <option value="read">Read</option>
                                                <option value="unread">Unread</option>
                                            </select>
                                        </label>

                                        <label className="space-y-1 text-sm">
                                            <span className="font-medium">From date</span>
                                            <input
                                                type="date"
                                                value={fromDate}
                                                onChange={(event) => setFromDate(event.target.value)}
                                                className="h-10 w-full rounded-md border border-input bg-background px-3"
                                            />
                                        </label>

                                        <label className="space-y-1 text-sm">
                                            <span className="font-medium">To date</span>
                                            <input
                                                type="date"
                                                value={toDate}
                                                onChange={(event) => setToDate(event.target.value)}
                                                className="h-10 w-full rounded-md border border-input bg-background px-3"
                                            />
                                        </label>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium">Status filters</p>
                                            <div className="flex flex-wrap gap-2">
                                                {filterOptions.statuses.map((status) => {
                                                    const isChecked = selectedStatuses.includes(status);

                                                    return (
                                                        <label key={status} className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${isChecked ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'}`}>
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only"
                                                                checked={isChecked}
                                                                onChange={() => toggleSelection(status, selectedStatuses, setSelectedStatuses)}
                                                            />
                                                            {status}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-sm font-medium">Type filters</p>
                                            <div className="flex flex-wrap gap-2">
                                                {filterOptions.types.map((type) => {
                                                    const isChecked = selectedTypes.includes(type);

                                                    return (
                                                        <label key={type} className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${isChecked ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'}`}>
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only"
                                                                checked={isChecked}
                                                                onChange={() => toggleSelection(type, selectedTypes, setSelectedTypes)}
                                                            />
                                                            {prettifyKey(type)}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                        <Button type="button" variant="outline" onClick={clearFilters}>Clear</Button>
                                        <Button type="button" onClick={applyFilters}>Apply filters</Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>

                        {notificationHistory.data.length > 0 ? (
                            notificationHistory.data.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`rounded-xl border p-4 transition ${notification.readAt ? 'bg-background' : 'bg-accent/40'}`}
                                >
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="text-base font-semibold">{notification.title}</h2>
                                                <Badge variant={notification.readAt ? 'secondary' : 'default'}>
                                                    {notification.readAt ? 'Read' : 'Unread'}
                                                </Badge>
                                                {notification.status ? (
                                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${severityClassMap[notification.severityColor ?? 'info'] ?? severityClassMap.info}`}>
                                                        {notification.status}
                                                    </span>
                                                ) : null}
                                                {notification.typeNormalized ? (
                                                    <span className="inline-flex items-center rounded-full border border-muted bg-muted/60 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                                        {prettifyKey(notification.typeNormalized)}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <p className="text-sm text-muted-foreground">{notification.message}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : ''}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap gap-2 md:justify-end">
                                            {notification.actionUrl ? (
                                                <Link
                                                    href={notification.actionUrl}
                                                    className="inline-flex h-10 items-center justify-center rounded-md border px-3 text-sm font-medium transition hover:bg-accent"
                                                    onClick={() => {
                                                        if (!notification.readAt) {
                                                            void handleMarkRead(notification.id);
                                                        }
                                                    }}
                                                >
                                                    {notification.actionLabel}
                                                </Link>
                                            ) : null}
                                            {!notification.readAt ? (
                                                <Button type="button" variant="ghost" onClick={() => void handleMarkRead(notification.id)}>
                                                    Mark as read
                                                </Button>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                                No notifications yet.
                            </div>
                        )}

                        <div className="flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
                            <p className="text-sm text-muted-foreground">
                                Showing {notificationHistory.data.length} of {notificationHistory.total} notifications
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={!notificationHistory.prev_page_url}
                                    onClick={() => notificationHistory.prev_page_url && router.visit(notificationHistory.prev_page_url, { preserveScroll: true })}
                                >
                                    <ChevronLeft className="mr-1 h-4 w-4" />
                                    Previous
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    Page {notificationHistory.current_page} of {notificationHistory.last_page}
                                </span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={!notificationHistory.next_page_url}
                                    onClick={() => notificationHistory.next_page_url && router.visit(notificationHistory.next_page_url, { preserveScroll: true })}
                                >
                                    Next
                                    <ChevronRight className="ml-1 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}