import React, { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
    BookOpen,
    NotePencil as PenLine,
    ChartBar as BarChart2,
    SignOut as LogOut,
    List as Menu,
    GraduationCap,
    ClipboardText,
    Sun,
    Moon,
    FilePlus,
    X,
    SquaresFour as LayoutDashboard,
    Newspaper,
} from '@phosphor-icons/react';

/* ──────────── Nav config ──────────── */
const topNavItems = [
    { name: 'Home',     path: '/teacher',             exact: true },
    { name: 'Guruhlar', path: '/teacher/group-stats'              },
    { name: 'Testlar',  path: '/teacher/tests'                    },
    { name: 'Natijalar',path: '/teacher/results'                  },
    { name: 'Lug\'at',  path: '/vocabulary'                       },
];

const allNavItems = [
    { name: 'Dashboard',          path: '/teacher',                   icon: LayoutDashboard, exact: true },
    { name: 'Testlar',            path: '/teacher/tests',             icon: BookOpen         },
    { name: 'Writing Yaratish',   path: '/teacher/create-writing',    icon: FilePlus         },
    { name: 'Writing Tekshirish', path: '/teacher/writing-review',    icon: PenLine          },
    { name: 'Guruh Statistikasi', path: '/teacher/group-stats',       icon: BarChart2        },
    { name: 'Barcha Natijalar',   path: '/teacher/results',           icon: ClipboardText    },
    { name: 'Maqolalar',          path: '/teacher/articles',          icon: Newspaper        },
    { name: 'WordBank',           path: '/vocabulary',                icon: BookOpen         },
];

/* ──────────── Mobile Drawer ──────────── */
function MobileDrawer({ isOpen, onClose }) {
    const { theme } = useTheme();
    const { logout, userData } = useAuth();
    const location = useLocation();
    const isDark = theme === 'dark';

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
                    onClick={onClose}
                />
            )}
            <aside className={`
                fixed left-0 top-0 bottom-0 z-50 w-64 flex flex-col
                transition-transform duration-300 md:hidden shadow-2xl
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                ${isDark ? 'bg-[#2C2C2C] border-r border-white/5' : 'bg-white border-r border-gray-200'}
            `}>
                <div className={`h-16 flex items-center justify-between px-4 border-b flex-shrink-0 ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
                            <GraduationCap size={16} />
                        </div>
                        <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Teacher Panel</span>
                    </div>
                    <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500'}`}>
                        <X size={18} />
                    </button>
                </div>

                <div className={`px-4 py-3 border-b flex items-center gap-3 ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {userData?.fullName?.charAt(0)?.toUpperCase() || 'T'}
                    </div>
                    <div>
                        <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{userData?.fullName || 'Teacher'}</p>
                        <p className="text-[11px] text-emerald-500 font-medium">Ustoz</p>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
                    {allNavItems.map((item) => {
                        const isActive = item.exact
                            ? location.pathname === item.path
                            : location.pathname.startsWith(item.path);
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={onClose}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                                    ${isActive
                                        ? (isDark ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700')
                                        : (isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100')
                                    }
                                `}
                            >
                                <item.icon size={19} className="flex-shrink-0" />
                                {item.name}
                            </NavLink>
                        );
                    })}
                </nav>

                <div className={`p-3 border-t flex-shrink-0 ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                    <button
                        onClick={logout}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                            ${isDark ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-500 hover:text-red-600 hover:bg-red-50'}
                        `}
                    >
                        <LogOut size={19} className="flex-shrink-0" />
                        Chiqish
                    </button>
                </div>
            </aside>
        </>
    );
}

/* ──────────── Floating Pill Navbar ──────────── */
function TeacherTopNav({ onMenuClick }) {
    const { theme, toggleTheme } = useTheme();
    const { logout, userData } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const isDark = theme === 'dark';

    return (
        <div
            className="flex items-center justify-between gap-4 px-4 py-2 rounded-full"
            style={{
                background: isDark ? 'rgba(36,36,36,0.85)' : 'rgba(255,255,255,0.8)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: isDark
                    ? '0 4px 30px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)'
                    : '0 4px 30px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.03)',
            }}
        >
            {/* Logo */}
            <div
                className="flex items-center gap-2 cursor-pointer select-none flex-shrink-0"
                onClick={() => navigate('/teacher')}
            >
                <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                    style={{ 
                        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                    }}
                >
                    <GraduationCap size={18} color="#fff" weight="bold" />
                </div>
                <span className={`font-bold text-base tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    EduDash
                </span>
            </div>

            {/* Center nav links */}
            <nav className="hidden md:flex items-center gap-0.5">
                {topNavItems.map((item) => {
                    const isActive = item.exact
                        ? location.pathname === item.path
                        : location.pathname.startsWith(item.path);
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={`px-4 py-2 text-sm font-medium transition-all rounded-xl relative group
                                ${isActive
                                    ? (isDark ? 'text-white' : 'text-gray-900 font-semibold')
                                    : (isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-emerald-600 hover:bg-emerald-50/50')
                                }
                            `}
                        >
                            {item.name}
                            {isActive && (
                                <span
                                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full animate-in zoom-in duration-300"
                                    style={{ background: '#10B981' }}
                                />
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Theme toggle */}
                <button
                    onClick={toggleTheme}
                    className={`p-2 rounded-xl transition-all ${isDark ? 'text-yellow-400 hover:bg-white/10' : 'text-gray-500 hover:bg-black/5'}`}
                >
                    {isDark ? <Sun size={18} weight="fill" /> : <Moon size={18} weight="fill" />}
                </button>

                {/* User pill */}
                <div
                    className="hidden sm:flex items-center gap-2.5 pl-1 pr-4 py-1 rounded-full cursor-pointer transition-all hover:opacity-90 active:scale-95"
                    style={{ 
                        background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
                        color: isDark ? '#fff' : '#111'
                    }}
                >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {userData?.fullName?.charAt(0)?.toUpperCase() || 'T'}
                    </div>
                    <span className="text-sm font-semibold">
                        {userData?.fullName?.split(' ')[0] || 'Teacher'}
                    </span>
                </div>

                {/* Logout */}
                <button
                    onClick={logout}
                    className={`hidden md:flex p-2 rounded-xl transition-all ${isDark ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-500 hover:text-red-600 hover:bg-red-50'}`}
                    title="Chiqish"
                >
                    <LogOut size={20} />
                </button>

                {/* Mobile hamburger */}
                <button
                    onClick={onMenuClick}
                    className={`md:hidden p-2 rounded-xl ${isDark ? 'text-gray-400 hover:bg-white/10' : 'text-gray-500 hover:bg-black/5'}`}
                >
                    <Menu size={20} />
                </button>
            </div>
        </div>
    );
}

/* ──────────── Main Layout ──────────── */
export default function TeacherLayout() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const pageBg = isDark
        ? '#1E1E1E'
        : 'linear-gradient(160deg, #f2f0ed 0%, #f7eeee 30%, #fdf5f5 55%, #ffffff 80%, #ffffff 100%)';

    const isWritingReview = location.pathname.includes('writing-review');

    return (
        /* Outer container carries the ONLY background — no duplication */
        <div
            className="h-screen overflow-hidden font-sans transition-colors duration-300 relative"
            style={{ background: pageBg }}
        >
            <MobileDrawer isOpen={isMobileOpen} onClose={() => setIsMobileOpen(false)} />

            {/* Flex container for full height management */}
            <div className={`h-full flex flex-col ${isWritingReview ? 'overflow-hidden' : 'overflow-y-auto'} custom-scrollbar`}>
                {/* Floating pill nav — sits inside scroll flow at the top */}
                <div className="px-4 pt-4 pb-2 shrink-0">
                    <div className={isWritingReview ? "w-full" : "max-w-5xl mx-auto"}>
                        <TeacherTopNav onMenuClick={() => setIsMobileOpen(true)} />
                    </div>
                </div>

                {/* Page content fills remaining space */}
                <main className="flex-1 min-h-0">
                    <div className={`${isWritingReview ? 'w-full h-full' : 'max-w-[1200px] mx-auto px-4 md:px-8 pb-10'}`}>
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
