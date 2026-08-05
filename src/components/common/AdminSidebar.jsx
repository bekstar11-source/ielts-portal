import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Users, BookOpen, Settings,
    ChevronLeft, FileText, Megaphone,
    BarChart2, PenTool, Trophy, ScrollText, Headphones, Key, Newspaper, Layers
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

const menuGroups = [
    {
        title: "MAIN",
        items: [
            { name: "Dashboard", path: "/admin", icon: LayoutDashboard, exact: true },
            { name: "Analytics", path: "/admin/analytics", icon: BarChart2 },
            { name: "Announcements", path: "/admin/announcements", icon: Megaphone }
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
            { name: "Articles", path: "/admin/articles", icon: Newspaper },
            { name: "Podcast Mastery", path: "/admin/podcasts", icon: Headphones }
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
            <SidebarHeader className={`h-14 flex items-center relative flex-shrink-0 ${collapsed ? 'justify-center px-0' : 'px-4'}`}>
                <div className="font-bold text-lg tracking-tighter flex items-center gap-3 text-gray-900 dark:text-white">
                    <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white flex-shrink-0 text-xs font-black">A</div>
                    {!collapsed && <SidebarMenuLabel>Control</SidebarMenuLabel>}
                </div>

                {isMobile ? (
                    <button
                        onClick={() => setOpenMobile(false)}
                        className="absolute -right-3 top-5 bg-blue-600 text-white p-1 rounded-full shadow-lg"
                    >
                        <ChevronLeft size={12} />
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

            <SidebarContent className="py-3 px-2.5">
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
