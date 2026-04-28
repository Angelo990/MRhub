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

export interface BudgetInfo {
    available_amount: number;
    allocated_amount: number;
    semester_label: string | null;
}

export interface Semester {
    id: number;
    label: string;
    year: number;
    semester: 1 | 2;
    starts_at: string;
    ends_at: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface DepartmentBudget {
    id: number;
    department_id: number;
    semester_id: number;
    allocated_amount: number;
    reserved_amount: number;
    spent_amount: number;
    available_amount: number;
    low_budget_threshold: number | null;
    semester?: Semester;
    department?: { id: number; name: string };
}

export interface BudgetTransaction {
    id: number;
    department_budget_id: number;
    request_id: number | null;
    type: 'allocation' | 'reservation' | 'release' | 'spending' | 'adjustment';
    amount: number;
    balance_after: number;
    performed_by: number;
    notes: string | null;
    created_at: string;
    performer?: { id: number; name: string };
}
