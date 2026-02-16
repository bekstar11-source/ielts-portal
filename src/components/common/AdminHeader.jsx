import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Menu, Moon, Sun, Bell, Search } from 'lucide-react';

export default function AdminHeader({ toggleSidebar }) {
    const { theme, toggleTheme } = useTheme();
    const { userData } = useAuth();
    const location = useLocation();

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
        <header className={`h-16 px-4 md:px-6 flex items-center justify-between border-b transition-colors duration-300 ${theme === 'dark' ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200'}`}>

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

                {/* Notifications */}
                <button className={`p-2 rounded-full relative transition-colors ${theme === 'dark' ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                    <Bell size={20} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#1E1E1E]"></span>
                </button>

                {/* Profile Dropdown Trigger */}
                <div className="flex items-center gap-3 pl-3 border-l border-inherit">
                    <div className="text-right hidden md:block">
                        <p className={`text-sm font-medium leading-none ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {userData?.fullName || "Admin"}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">Administrator</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 p-[2px]">
                        <div className={`w-full h-full rounded-full flex items-center justify-center overflow-hidden ${theme === 'dark' ? 'bg-[#2C2C2C]' : 'bg-white'}`}>
                            <span className="font-bold text-xs">{userData?.fullName?.charAt(0) || "A"}</span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
