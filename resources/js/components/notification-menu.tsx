import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Bell, CheckCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { NotificationItem, SharedData } from '@/types';

export function NotificationMenu() {
    const { notifications, csrf_token } = usePage<SharedData>().props;
    const [items, setItems] = useState<NotificationItem[]>(notifications.items);
    const [unreadCount, setUnreadCount] = useState<number>(notifications.unreadCount);
    const [markingAll, setMarkingAll] = useState(false);

    useEffect(() => {
        setItems(notifications.items);
        setUnreadCount(notifications.unreadCount);
    }, [notifications.items, notifications.unreadCount]);

    const markNotificationRead = async (id: string) => {
        await fetch(`/notifications/${id}/read`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN': csrf_token,
            },
        });

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
            await fetch('/notifications/read-all', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrf_token,
                },
            });

            const now = new Date().toISOString();
            setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? now })));
            setUnreadCount(0);
        } finally {
            setMarkingAll(false);
        }
    };

    return (
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
                                <div className="text-sm font-medium">{notification.title}</div>
                                {!notification.readAt && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-red-600" />}
                            </div>
                            <div className="text-muted-foreground text-xs leading-5">{notification.message}</div>
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
            </DropdownMenuContent>
        </DropdownMenu>
    );
}