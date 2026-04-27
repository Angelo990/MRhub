import { useEffect, useRef, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { Bell, CheckCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { showBrowserNotification } from '@/lib/browser-notifications';
import notificationsRoute from '@/routes/notifications';
import type { NotificationItem, SharedData } from '@/types';

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

function getSeverityClass(notification: NotificationItem) {
    const severity = notification.severityColor ?? 'info';
    return severityClassMap[severity] ?? severityClassMap.info;
}

export function NotificationMenu() {
    const { notifications, csrf_token } = usePage<SharedData>().props;
    const [items, setItems] = useState<NotificationItem[]>(notifications.items);
    const [unreadCount, setUnreadCount] = useState<number>(notifications.unreadCount);
    const [markingAll, setMarkingAll] = useState(false);
    const [toastNotification, setToastNotification] = useState<NotificationItem | null>(null);
    const initialized = useRef(false);
    const previousIds = useRef<string[]>(notifications.items.map((item) => item.id));

    useEffect(() => {
        const currentIds = notifications.items.map((item) => item.id);

        if (initialized.current) {
            const incomingUnread = notifications.items.find(
                (item) => !previousIds.current.includes(item.id) && !item.readAt,
            );

            if (incomingUnread) {
                if (document.visibilityState === 'hidden') {
                    const browserNotification = showBrowserNotification(incomingUnread.title, {
                        body: incomingUnread.message,
                        tag: `workflow-notification-${incomingUnread.id}`,
                    });

                    if (browserNotification) {
                        browserNotification.onclick = () => {
                            window.focus();

                            if (incomingUnread.actionUrl) {
                                router.visit(incomingUnread.actionUrl);
                            }

                            browserNotification.close();
                        };
                    }
                } else {
                    setToastNotification(incomingUnread);
                }
            }
        } else {
            initialized.current = true;
        }

        previousIds.current = currentIds;
        setItems(notifications.items);
        setUnreadCount(notifications.unreadCount);
    }, [notifications.items, notifications.unreadCount]);

    useEffect(() => {
        const refreshNotifications = () => {
            router.reload({
                only: ['notifications'],
            });
        };

        const intervalId = window.setInterval(() => {
            refreshNotifications();
        }, 45000);

        const handleFocus = () => refreshNotifications();

        window.addEventListener('focus', handleFocus);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    useEffect(() => {
        if (!toastNotification) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setToastNotification(null);
        }, 5000);

        return () => window.clearTimeout(timeoutId);
    }, [toastNotification]);

    const postNotificationAction = async (url: string) => {
        await fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN': csrf_token,
            },
        });
    };

    const markNotificationRead = async (id: string) => {
        await postNotificationAction(`/notifications/${id}/read`);

        setItems((current) => current.map((item) => item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item));
        setUnreadCount((current) => Math.max(0, current - 1));
    };

    const handleOpenNotification = async (notification: NotificationItem) => {
        if (!notification.readAt) {
            await markNotificationRead(notification.id);
        }

        if (notification.actionUrl) {
            router.visit(notification.actionUrl);
        }
    };

    const handleMarkAllRead = async () => {
        setMarkingAll(true);

        try {
            await postNotificationAction('/notifications/read-all');

            const now = new Date().toISOString();
            setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? now })));
            setUnreadCount(0);
        } finally {
            setMarkingAll(false);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-9 w-9">
                        <Bell className="size-5 opacity-80" />
                        {unreadCount > 0 && (
                            <span className="absolute right-1.5 top-1.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                        <span className="sr-only">Notifications</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[380px]" align="end">
                    <div className="flex items-center justify-between px-2 py-1.5">
                        <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
                        <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={handleMarkAllRead} disabled={markingAll || unreadCount === 0}>
                            <CheckCheck className="mr-1 h-4 w-4" />
                            Mark all read
                        </Button>
                    </div>
                    <DropdownMenuSeparator />
                    <div className="max-h-[420px] overflow-y-auto">
                        {items.length > 0 ? items.map((notification) => (
                            <button
                                key={notification.id}
                                type="button"
                                onClick={() => void handleOpenNotification(notification)}
                                className={`flex w-full flex-col gap-1 px-3 py-3 text-left transition hover:bg-accent ${notification.readAt ? 'opacity-75' : ''}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="text-sm font-medium">
                                        {notification.title.startsWith('[URGENT]') ? (
                                            <><span className="text-red-600">[URGENT]</span>{notification.title.slice(8)}</>
                                        ) : notification.title}
                                    </div>
                                    {!notification.readAt && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-red-600" />}
                                </div>
                                <div className="text-muted-foreground text-xs leading-5">
                                    {notification.message.startsWith('[URGENT]') ? (
                                        <><span className="text-red-600 font-medium">[URGENT]</span>{notification.message.slice(8)}</>
                                    ) : notification.message}
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {notification.status ? (
                                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getSeverityClass(notification)}`}>
                                            {notification.status}
                                        </span>
                                    ) : null}
                                    {notification.typeNormalized ? (
                                        <span className="inline-flex items-center rounded-full border border-muted bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                            {prettifyKey(notification.typeNormalized)}
                                        </span>
                                    ) : null}
                                </div>
                                <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                                    <span>{notification.actionLabel}</span>
                                    <span>{notification.createdAt ? new Date(notification.createdAt).toLocaleString() : ''}</span>
                                </div>
                            </button>
                        )) : (
                            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                                No notifications yet.
                            </div>
                        )}
                    </div>
                    <DropdownMenuSeparator />
                    <div className="p-2">
                        <Button asChild variant="outline" className="w-full">
                            <Link href={notificationsRoute.index()} prefetch>
                                View all notifications
                            </Link>
                        </Button>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            {toastNotification ? (
                <div className="fixed right-4 top-20 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur">
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                            <p className="text-sm font-semibold">
                                {toastNotification.title.startsWith('[URGENT]') ? (
                                    <><span className="text-red-600">[URGENT]</span>{toastNotification.title.slice(8)}</>
                                ) : toastNotification.title}
                            </p>
                            <p className="text-xs leading-5 text-muted-foreground">
                                {toastNotification.message.startsWith('[URGENT]') ? (
                                    <><span className="text-red-600 font-medium">[URGENT]</span>{toastNotification.message.slice(8)}</>
                                ) : toastNotification.message}
                            </p>
                        </div>
                        <button
                            type="button"
                            className="text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => setToastNotification(null)}
                        >
                            Dismiss
                        </button>
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setToastNotification(null)}>
                            Later
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                                void handleOpenNotification(toastNotification);
                                setToastNotification(null);
                            }}
                        >
                            Open
                        </Button>
                    </div>
                </div>
            ) : null}
        </>
    );
}