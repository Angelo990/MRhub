import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { BookOpen, Folder, LayoutGrid, Users, ClipboardList, ShieldCheck, Briefcase } from 'lucide-react';
import AppLogo from './app-logo';

function getRoleNavItems(role: string): NavItem[] {
    switch (role) {
        case 'admin':
            return [
                { title: 'Dashboard', href: dashboard(), icon: LayoutGrid },
                { title: 'Manage Users', href: '/admin/users', icon: Users },
            ];
        case 'property-custodian':
            return [
                { title: 'Dashboard', href: dashboard(), icon: LayoutGrid },
                { title: 'Inventory', href: '/inventory', icon: ClipboardList },
                { title: 'Requests', href: '/requests', icon: ShieldCheck },
            ];
        case 'vp-finance':
            return [
                { title: 'Dashboard', href: dashboard(), icon: LayoutGrid },
                { title: 'Finance', href: '/finance', icon: Briefcase },
                { title: 'Requests', href: '/requests', icon: ShieldCheck },
            ];
        case 'department-head':
            return [
                { title: 'Dashboard', href: dashboard(), icon: LayoutGrid },
                { title: 'My Requests', href: '/my-requests', icon: ClipboardList },
            ];
        default:
            return [
                { title: 'Dashboard', href: dashboard(), icon: LayoutGrid },
            ];
    }
}

const footerNavItems: NavItem[] = [
    //removed footer items
];

export function AppSidebar() {
    const { auth } = usePage().props as any;
    const userRoles = auth?.user?.roles?.map((role: any) => role.name) || [];
    const mainNavItems = getRoleNavItems(userRoles[0] || '');

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
