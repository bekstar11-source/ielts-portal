import React, { useRef, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Menu, Moon, Sun, Bell, Search, LogOut } from 'lucide-react';


export default function AdminHeader({ toggleSidebar }) {
    const { theme, toggleTheme } = useTheme();
    const { userData, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const notificationRef = useRef(null);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    // Breadcrumb Logic
    const pathnames = location.pathname.split('/').filter((x) => x);
    const breadcrumbs = pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const name = value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');

        return (
            <React.Fragment key={to}>
                <span className="mx-2 text-gray-400">/</span>
                {isLast ? (
                    <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{name}</span>
                ) : (
                    <Link to={to} className="hover:text-blue-500 transition-colors">{name}</Link>
                )}
            </React.Fragment>
        );
    });



    return (
        <header className={`h-16 px-4 md:px-6 flex items-center justify-between border-b transition-colors duration-300 relative ${theme === 'dark' ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200'}`}>

            {/* LEFT: Toggle & Breadcrumbs */}
            <div className="flex items-center gap-4">
                <button
                    onClick={toggleSidebar}
                    className={`p-2 rounded-lg md:hidden transition-colors ${theme === 'dark' ? 'hover:bg-white/5 text-white' : 'hover:bg-gray-100 text-gray-900'}`}
                >
                    <Menu size={20} />
                </button>

                <div className="hidden md:flex items-center text-sm text-gray-500">
                    <Link to="/admin" className="hover:text-blue-500 transition-colors">Home</Link>
                    {breadcrumbs}
                </div>
            </div>

            {/* RIGHT: Actions & Profile */}
            <div className="flex items-center gap-3 md:gap-4">

                {/* Search (Desktop) */}
                <div className={`hidden md:flex items-center px-3 py-1.5 rounded-full border transition-colors ${theme === 'dark' ? 'bg-[#2C2C2C] border-white/10' : 'bg-gray-100 border-transparent'}`}>
                    <Search size={16} className="text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="bg-transparent border-none outline-none text-sm ml-2 w-48 placeholder-gray-500"
                    />
                </div>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className={`p-2 rounded-full transition-all duration-300 ${theme === 'dark' ? 'bg-white/10 text-yellow-400 hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                {/* Notifications — disabled to save Firestore costs */}
                <div className="relative" ref={notificationRef}>
                    <button
                        className={`p-2 rounded-full relative transition-colors ${theme === 'dark' ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                        title="Notifications"
                    >
                        <Bell size={20} />
                    </button>
                </div>

                {/* Profile Dropdown Trigger */}
                <div className="flex items-center gap-3 pl-3 border-l border-inherit relative">
                    <div className="text-right hidden md:block">
                        <p className={`text-sm font-medium leading-none ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {userData?.fullName || "Admin"}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">Administrator</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 p-[2px]">
                            <div className={`w-full h-full rounded-full flex items-center justify-center overflow-hidden ${theme === 'dark' ? 'bg-[#2C2C2C]' : 'bg-white'}`}>
                                {userData?.photoURL ? (
                                    <img src={userData.photoURL} alt="Admin" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="font-bold text-xs">{userData?.fullName?.charAt(0) || "A"}</span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => setShowLogoutConfirm(true)}
                            className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'}`}
                            title="Chiqish"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>

                    {/* Logout Confirmation Modal */}
                    {showLogoutConfirm && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                            <div className={`w-full max-w-sm rounded-xl p-6 shadow-xl ${theme === 'dark' ? 'bg-[#2C2C2C] text-white' : 'bg-white text-gray-900'}`}>
                                <h3 className="text-lg font-bold mb-2">Are you sure?</h3>
                                <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Haqiqatan ham tizimdan chiqmoqchimisiz?
                                </p>
                                <div className="flex items-center justify-end gap-3">
                                    <button
                                        onClick={() => setShowLogoutConfirm(false)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}
                                    >
                                        Yo'q, qolish
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Ha, chiqish
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
