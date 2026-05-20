import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { Bell, CheckCheck, Volume2, VolumeX, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { playNotificationPing, showBrowserNotification } from '@/lib/browser-notifications';
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

const SOUND_PREF_KEY = 'notification_sound_enabled';
const MAX_TOASTS = 3;

interface SummaryToast {
    id: string;
    _synthetic: true;
    title: string;
    message: string;
}

type ToastEntry = NotificationItem | SummaryToast;

function isSynthetic(toast: ToastEntry): toast is SummaryToast {
    return '_synthetic' in toast && (toast as SummaryToast)._synthetic === true;
}

export function NotificationMenu() {
    const { notifications, csrf_token } = usePage<SharedData>().props;
    const [items, setItems] = useState<NotificationItem[]>(notifications.items);
    const [unreadCount, setUnreadCount] = useState<number>(notifications.unreadCount);
    const [markingAll, setMarkingAll] = useState(false);
    const [toasts, setToasts] = useState<ToastEntry[]>([]);
    const [soundEnabled, setSoundEnabled] = useState(() => {
        try {
            return localStorage.getItem(SOUND_PREF_KEY) === 'true';
        } catch {
            return false;
        }
    });

    const initialized = useRef(false);
    const previousIds = useRef<string[]>(notifications.items.map((item) => item.id));
    const toastTimers = useRef<Record<string, ReturnType<typeof window.setTimeout>>>({});
    const returningFromHidden = useRef(false);
    const soundEnabledRef = useRef(soundEnabled);
    soundEnabledRef.current = soundEnabled;

    const dismissToast = useCallback((id: string) => {
        window.clearTimeout(toastTimers.current[id]);
        delete toastTimers.current[id];
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const pushToast = useCallback(
        (entry: ToastEntry) => {
            setToasts((prev) => {
                const filtered = prev.filter((t) => t.id !== entry.id);
                const next = [...filtered, entry];
                return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
            });

            const isDanger = !isSynthetic(entry) && (entry as NotificationItem).severityColor === 'danger';
            if (!isDanger) {
                const timerId = window.setTimeout(() => dismissToast(entry.id), 5000);
                toastTimers.current[entry.id] = timerId;
            }
        },
        [dismissToast],
    );

    // Detect and surface incoming notifications
    useEffect(() => {
        const currentIds = notifications.items.map((item) => item.id);

        if (initialized.current) {
            const newUnreadItems = notifications.items.filter(
                (item) => !previousIds.current.includes(item.id) && !item.readAt,
            );

            if (newUnreadItems.length > 0) {
                if (returningFromHidden.current && newUnreadItems.length > 1) {
                    // Multiple new notifications while tab was hidden → one summary toast
                    const summary: SummaryToast = {
                        id: `summary-${Date.now()}`,
                        _synthetic: true,
                        title: 'New notifications',
                        message: `${newUnreadItems.length} new notifications since you were away.`,
                    };
                    pushToast(summary);
                    if (soundEnabledRef.current) playNotificationPing();
                } else {
                    for (const incomingUnread of newUnreadItems) {
                        const isDanger = incomingUnread.severityColor === 'danger';
                        const tabHidden = document.visibilityState === 'hidden';

                        // Browser notification: when tab is hidden OR notification is danger (always)
                        if (tabHidden || isDanger) {
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
                        }

                        // In-app toast: when tab is visible OR notification is danger (always)
                        if (!tabHidden || isDanger) {
                            pushToast(incomingUnread);
                        }

                        if (soundEnabledRef.current) playNotificationPing();
                    }
                }
            }
        } else {
            initialized.current = true;
        }

        returningFromHidden.current = false;
        previousIds.current = currentIds;
        setItems(notifications.items);
        setUnreadCount(notifications.unreadCount);
    }, [notifications.items, notifications.unreadCount, pushToast]);

    // Polling + focus refresh + visibility tracking for tab-regain summary
    useEffect(() => {
        const refreshNotifications = () => {
            router.reload({ only: ['notifications'] });
        };

        const intervalId = window.setInterval(refreshNotifications, 45000);

        const handleFocus = () => refreshNotifications();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                returningFromHidden.current = true;
                refreshNotifications();
            } else {
                // Safety reset: if tab hides before the detection effect consumed the flag
                returningFromHidden.current = false;
            }
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const toggleSound = () => {
        setSoundEnabled((prev) => {
            const next = !prev;
            try {
                localStorage.setItem(SOUND_PREF_KEY, String(next));
            } catch {
                // storage unavailable
            }
            return next;
        });
    };

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

        setItems((current) =>
            current.map((item) => (item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item)),
        );
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
                        <div className="flex items-center gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={toggleSound}
                                title={soundEnabled ? 'Mute notification sounds' : 'Enable notification sounds'}
                            >
                                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                                <span className="sr-only">{soundEnabled ? 'Mute notification sounds' : 'Enable notification sounds'}</span>
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={handleMarkAllRead}
                                disabled={markingAll || unreadCount === 0}
                            >
                                <CheckCheck className="mr-1 h-4 w-4" />
                                Mark all read
                            </Button>
                        </div>
                    </div>
                    <DropdownMenuSeparator />
                    <div className="max-h-[420px] overflow-y-auto">
                        {items.length > 0 ? (
                            items.map((notification) => (
                                <button
                                    key={notification.id}
                                    type="button"
                                    onClick={() => void handleOpenNotification(notification)}
                                    className={`flex w-full flex-col gap-1 px-3 py-3 text-left transition hover:bg-accent ${notification.readAt ? 'opacity-75' : ''}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="text-sm font-medium">
                                            {notification.title.startsWith('[URGENT]') ? (
                                                <>
                                                    <span className="text-red-600">[URGENT]</span>
                                                    {notification.title.slice(8)}
                                                </>
                                            ) : (
                                                notification.title
                                            )}
                                        </div>
                                        {!notification.readAt && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-red-600" />}
                                    </div>
                                    <div className="text-muted-foreground text-xs leading-5">
                                        {notification.message.startsWith('[URGENT]') ? (
                                            <>
                                                <span className="text-red-600 font-medium">[URGENT]</span>
                                                {notification.message.slice(8)}
                                            </>
                                        ) : (
                                            notification.message
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {notification.status ? (
                                            <span
                                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getSeverityClass(notification)}`}
                                            >
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
                            ))
                        ) : (
                            <div className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications yet.</div>
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

            {/* Toast stack — newest at bottom, max 3, danger toasts persist until dismissed */}
            <div
                className="fixed right-4 top-20 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
                aria-live="polite"
                aria-relevant="additions"
                aria-atomic="false"
                aria-label="Notification toasts"
            >
                {toasts.map((toast) => {
                    const isDanger = !isSynthetic(toast) && (toast as NotificationItem).severityColor === 'danger';
                    const realToast = isSynthetic(toast) ? null : (toast as NotificationItem);

                    return isDanger ? (
                        <div
                            key={toast.id}
                            className="rounded-xl border border-red-300 bg-background/95 p-4 shadow-lg backdrop-blur"
                            role="alert"
                            aria-live="assertive"
                            aria-atomic="true"
                        >
                            <div className="flex items-start gap-3">
                                <div className="min-w-0 flex-1 space-y-1">
                                    <p className="text-sm font-semibold">
                                        {isSynthetic(toast) ? (
                                            toast.title
                                        ) : toast.title.startsWith('[URGENT]') ? (
                                            <>
                                                <span className="text-red-600">[URGENT]</span>
                                                {toast.title.slice(8)}
                                            </>
                                        ) : (
                                            toast.title
                                        )}
                                    </p>
                                    <p className="text-xs leading-5 text-muted-foreground">
                                        {isSynthetic(toast) ? (
                                            toast.message
                                        ) : toast.message.startsWith('[URGENT]') ? (
                                            <>
                                                <span className="text-red-600 font-medium">[URGENT]</span>
                                                {toast.message.slice(8)}
                                            </>
                                        ) : (
                                            toast.message
                                        )}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                                    onClick={() => dismissToast(toast.id)}
                                    aria-label="Dismiss"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            {realToast?.actionUrl ? (
                                <div className="mt-3 flex justify-end gap-2">
                                    <Button type="button" variant="ghost" size="sm" onClick={() => dismissToast(toast.id)}>
                                        Later
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => {
                                            void handleOpenNotification(realToast);
                                            dismissToast(toast.id);
                                        }}
                                    >
                                        Open
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <div
                            key={toast.id}
                            className="rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur"
                            role="status"
                            aria-live="polite"
                            aria-atomic="true"
                        >
                            <div className="flex items-start gap-3">
                                <div className="min-w-0 flex-1 space-y-1">
                                    <p className="text-sm font-semibold">
                                        {isSynthetic(toast) ? (
                                            toast.title
                                        ) : toast.title.startsWith('[URGENT]') ? (
                                            <>
                                                <span className="text-red-600">[URGENT]</span>
                                                {toast.title.slice(8)}
                                            </>
                                        ) : (
                                            toast.title
                                        )}
                                    </p>
                                    <p className="text-xs leading-5 text-muted-foreground">
                                        {isSynthetic(toast) ? (
                                            toast.message
                                        ) : toast.message.startsWith('[URGENT]') ? (
                                            <>
                                                <span className="text-red-600 font-medium">[URGENT]</span>
                                                {toast.message.slice(8)}
                                            </>
                                        ) : (
                                            toast.message
                                        )}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                                    onClick={() => dismissToast(toast.id)}
                                    aria-label="Dismiss"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            {realToast?.actionUrl ? (
                                <div className="mt-3 flex justify-end gap-2">
                                    <Button type="button" variant="ghost" size="sm" onClick={() => dismissToast(toast.id)}>
                                        Later
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => {
                                            void handleOpenNotification(realToast);
                                            dismissToast(toast.id);
                                        }}
                                    >
                                        Open
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </>
    );
}