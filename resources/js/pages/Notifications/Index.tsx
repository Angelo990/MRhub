import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    getBrowserNotificationPermission,
    requestBrowserNotificationPermission,
    supportsBrowserNotifications,
} from '@/lib/browser-notifications';
import notificationsRoute from '@/routes/notifications';
import { type BreadcrumbItem, type NotificationItem, type SharedData } from '@/types';
import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Bell, CheckCheck, ChevronLeft, ChevronRight } from 'lucide-react';

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
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Notifications',
        href: notificationsRoute.index().url,
    },
];

export default function NotificationsIndex() {
    const { notificationHistory, csrf_token } = usePage<SharedData & PageProps>().props;
    const [browserPermission, setBrowserPermission] = useState(getBrowserNotificationPermission());

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
                                                {notification.status ? <Badge variant="outline">{notification.status}</Badge> : null}
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