import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Users, BookOpen, Settings,
    ChevronLeft, FileText, Megaphone,
    BarChart2, PenTool, Trophy, ScrollText, Headphones, Key, Newspaper, Layers, Sparkles, Gift, Flag
} from 'lucide-react';
import {
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarMenuLabel,
    useSidebar,
} from '../ui/sidebar';
import { LogoMark } from './Logo';

const menuGroups = [
    {
        title: "MAIN",
        items: [
            { name: "Dashboard", path: "/admin", icon: LayoutDashboard, exact: true },
            { name: "Analytics", path: "/admin/analytics", icon: BarChart2 },
            { name: "Announcements", path: "/admin/announcements", icon: Megaphone },
            { name: "Spotlight", path: "/admin/spotlights", icon: Sparkles }
        ]
    },
    {
        title: "USERS",
        items: [
            { name: "Students & Teachers", path: "/admin/users", icon: Users },
            { name: "Gamification", path: "/admin/gamification", icon: Trophy }
        ]
    },
    {
        title: "CONTENT",
        items: [
            { name: "Tests", path: "/admin/tests", icon: FileText },
            { name: "Writing Review", path: "/admin/writing-review", icon: PenTool },
            { name: "Mock Packages", path: "/admin/mocks", icon: Layers },
            { name: "Mock Keys", path: "/admin/key-manager", icon: Key },
            { name: "Results", path: "/admin/results", icon: BookOpen },
            { name: "Reports", path: "/admin/reports", icon: Flag },
            { name: "Articles", path: "/admin/articles", icon: Newspaper },
            { name: "Podcast Mastery", path: "/admin/podcasts", icon: Headphones },
            { name: "Bepul trial", path: "/admin/trial", icon: Gift }
        ]
    },
    {
        title: "SYSTEM",
        items: [
            { name: "Audit Logs", path: "/admin/logs", icon: ScrollText },
            { name: "Settings", path: "/admin/settings", icon: Settings }
        ]
    }
];

export default function AdminSidebar() {
    const location = useLocation();
    const { isMobile, setOpenMobile, state, toggleSidebar } = useSidebar();
    const collapsed = !isMobile && state === 'collapsed';

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className={`h-14 flex items-center relative flex-shrink-0 pt-[env(safe-area-inset-top)] ${collapsed ? 'justify-center px-0' : 'px-4'}`}>
                <div className="font-bold text-lg tracking-tighter flex items-center gap-3 text-gray-900 dark:text-white">
                    <LogoMark size={28} />
                    {!collapsed && <SidebarMenuLabel>Control</SidebarMenuLabel>}
                </div>

                {isMobile ? (
                    <button
                        onClick={() => setOpenMobile(false)}
                        aria-label="Menyuni yopish"
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white w-9 h-9 flex items-center justify-center rounded-full shadow-lg active:scale-95 transition-transform"
                    >
                        <ChevronLeft size={18} />
                    </button>
                ) : (
                    <button
                        onClick={toggleSidebar}
                        title={collapsed ? "Menyuni ochish" : "Menyuni yig'ish"}
                        aria-label={collapsed ? "Menyuni ochish" : "Menyuni yig'ish"}
                        className="absolute -right-3 top-4 z-40 bg-blue-600 text-white p-1 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                    >
                        <ChevronLeft size={12} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
                    </button>
                )}
            </SidebarHeader>

            <SidebarContent className="py-3 px-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                {menuGroups.map((group) => (
                    <SidebarGroup key={group.title}>
                        <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
                        <SidebarMenu>
                            {group.items.map((item) => {
                                const isActive = item.exact
                                    ? location.pathname === item.path
                                    : location.pathname.startsWith(item.path);

                                return (
                                    <SidebarMenuItem key={item.path}>
                                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                                            <NavLink to={item.path} onClick={() => isMobile && setOpenMobile(false)}>
                                                <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} className="flex-shrink-0" />
                                                <SidebarMenuLabel>{item.name}</SidebarMenuLabel>
                                            </NavLink>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroup>
                ))}
            </SidebarContent>
        </Sidebar>
    );
}
