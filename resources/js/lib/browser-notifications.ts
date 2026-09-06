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

export function playNotificationPing() {
    try {
        const ctx = new AudioContext();

        const play = () => {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, ctx.currentTime);
            gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.15);
            oscillator.addEventListener('ended', () => void ctx.close());
        };

        if (ctx.state === 'suspended') {
            void ctx.resume().then(play);
        } else {
            play();
        }
    } catch {
        // AudioContext unavailable or blocked by autoplay policy — silently ignore
    }
}