import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Menu, Moon, Sun, Bell, Search, Info, CheckCircle, AlertTriangle, X, CheckCheck } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../firebase/firebase';

export default function AdminHeader({ toggleSidebar }) {
    const { theme, toggleTheme } = useTheme();
    const { userData } = useAuth();
    const location = useLocation();

    // Notifications State
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const notificationRef = useRef(null);

    // Close notifications on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Fetch Notifications (Logs)
    useEffect(() => {
        // Only fetch meaningful logs as notifications
        // You might want to filter more strictly in a real app
        const q = query(
            collection(db, 'logs'),
            orderBy('timestamp', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setNotifications(notes);

            // Simple unread logic based on local storage timestamp
            const lastReadTime = localStorage.getItem('lastReadNotificationTime');
            if (lastReadTime) {
                const count = notes.filter(n => n.timestamp?.toMillis() > parseInt(lastReadTime)).length;
                setUnreadCount(count);
            } else {
                setUnreadCount(notes.length);
            }
        });

        return () => unsubscribe();
    }, []);

    const handleMarkAsRead = () => {
        const now = Date.now();
        localStorage.setItem('lastReadNotificationTime', now.toString());
        setUnreadCount(0);
    };

    const toggleNotifications = () => {
        if (!showNotifications && unreadCount > 0) {
            handleMarkAsRead();
        }
        setShowNotifications(!showNotifications);
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

    const getNotificationIcon = (action) => {
        if (action?.includes('ERROR') || action?.includes('FAIL')) return <AlertTriangle size={16} className="text-red-500" />;
        if (action?.includes('SUCCESS') || action?.includes('COMPLETE')) return <CheckCircle size={16} className="text-green-500" />;
        if (action?.includes('LOGIN')) return <Info size={16} className="text-blue-500" />;
        return <Bell size={16} className="text-gray-500" />;
    };

    const formatTimeAgo = (timestamp) => {
        if (!timestamp) return '';
        const seconds = Math.floor((new Date() - timestamp.toDate()) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

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

                {/* Notifications */}
                <div className="relative" ref={notificationRef}>
                    <button
                        onClick={toggleNotifications}
                        className={`p-2 rounded-full relative transition-colors ${theme === 'dark' ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-500'} ${showNotifications ? (theme === 'dark' ? 'bg-white/10 text-white' : 'bg-gray-200 text-gray-900') : ''}`}
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#1E1E1E]"></span>
                        )}
                    </button>

                    {/* Notification Dropdown */}
                    {showNotifications && (
                        <div className={`absolute right-0 mt-2 w-80 md:w-96 rounded-xl shadow-2xl border transform origin-top-right transition-all z-50 overflow-hidden ${theme === 'dark' ? 'bg-[#1E1E1E] border-white/10' : 'bg-white border-gray-200'}`}>
                            <div className={`p-4 border-b flex items-center justify-between ${theme === 'dark' ? 'border-white/5' : 'border-gray-100'}`}>
                                <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Notifications</h3>
                                <button onClick={handleMarkAsRead} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                    <CheckCheck size={14} /> Mark all read
                                </button>
                            </div>

                            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {notifications.length > 0 ? (
                                    notifications.map((note) => (
                                        <div key={note.id} className={`p-4 border-b last:border-0 hover:opacity-80 transition cursor-pointer flex gap-3 ${theme === 'dark' ? 'border-white/5 hover:bg-white/5' : 'border-gray-50 hover:bg-gray-50'}`}>
                                            <div className={`mt-1 p-2 rounded-full h-fit ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`}>
                                                {getNotificationIcon(note.action)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${theme === 'dark' ? 'bg-white/10 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                                        {note.action}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500">{formatTimeAgo(note.timestamp)}</span>
                                                </div>
                                                <p className={`text-sm mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    <span className="font-semibold text-blue-500">{note.details?.targetName || note.userName || 'User'}</span> {note.action?.toLowerCase().replace(/_/g, ' ')}
                                                </p>
                                                {note.details && (
                                                    <p className="text-xs text-gray-500 truncate max-w-[240px]">
                                                        {Object.entries(note.details)
                                                            .filter(([k]) => k !== 'targetName')
                                                            .map(([k, v]) => `${k}: ${v}`)
                                                            .join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-gray-500">
                                        <Bell size={32} className="mx-auto mb-2 opacity-20" />
                                        <p className="text-sm">No notifications yet</p>
                                    </div>
                                )}
                            </div>

                            <div className={`p-3 text-center border-t ${theme === 'dark' ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50'}`}>
                                <Link to="/admin/analytics" className="text-xs font-medium text-blue-500 hover:underline">
                                    View All Activity
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

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
                            {userData?.photoURL ? (
                                <img src={userData.photoURL} alt="Admin" className="w-full h-full object-cover" />
                            ) : (
                                <span className="font-bold text-xs">{userData?.fullName?.charAt(0) || "A"}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
