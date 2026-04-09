export function supportsBrowserNotifications() {
    return typeof window !== 'undefined' && 'Notification' in window;
}

export function getBrowserNotificationPermission() {
    if (!supportsBrowserNotifications()) {
        return 'unsupported' as const;
    }

    return window.Notification.permission;
}

export async function requestBrowserNotificationPermission() {
    if (!supportsBrowserNotifications()) {
        return 'unsupported' as const;
    }

    return window.Notification.requestPermission();
}

export function showBrowserNotification(title: string, options?: NotificationOptions) {
    if (getBrowserNotificationPermission() !== 'granted') {
        return null;
    }

    return new window.Notification(title, options);
}