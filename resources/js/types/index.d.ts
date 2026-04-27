import { InertiaLinkProps } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface NotificationItem {
    id: string;
    title: string;
    message: string;
    actionUrl: string | null;
    actionLabel: string;
    type: string;
    typeNormalized?: string;
    status: string | null;
    statusNormalized?: string;
    severityColor?: 'success' | 'warning' | 'danger' | 'info';
    readAt: string | null;
    createdAt: string | null;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    csrf_token: string;
    quote: { message: string; author: string };
    auth: Auth;
    notifications: {
        items: NotificationItem[];
        unreadCount: number;
    };
    sidebarOpen: boolean;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}
