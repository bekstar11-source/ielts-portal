import React from 'react';
import { Plus, BarChart, Users, ClipboardCheck, Megaphone, Newspaper, Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ActionCard = ({ title, desc, icon: Icon, bg, onClick, isDark }) => (
    <button 
        onClick={onClick}
        className={`col-span-6 sm:col-span-4 lg:col-span-2 p-4 rounded-2xl flex flex-col items-center text-center transition-all duration-300 hover:scale-[1.02] active:scale-95 group ${bg}`}
    >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110 ${bg.includes('bg-white') ? 'bg-gray-100 dark:bg-white/10' : 'bg-white/20'}`}>
            <Icon className={`w-6 h-6 ${bg.includes('bg-white') ? 'text-gray-700 dark:text-white' : 'text-white'}`} />
        </div>
        <h3 className={`text-sm font-bold mb-1 ${bg.includes('bg-white') ? 'text-gray-900 dark:text-white' : 'text-white'}`}>{title}</h3>
        <p className={`text-[10px] leading-tight ${bg.includes('bg-white') ? 'text-gray-500' : 'text-white/70'}`}>{desc}</p>
    </button>
);

const AdminDashboardActions = ({ isDark }) => {
    const navigate = useNavigate();
    
    const actions = [
        { title: "Test Yaratish", desc: "Yangi Reading/Listening", icon: Plus, bg: "bg-blue-600 shadow-lg shadow-blue-600/20", path: "/admin/create-test" },
        { title: "Analitika", desc: "Statistika va tahlillar", icon: BarChart, bg: "bg-purple-600 shadow-lg shadow-purple-600/20", path: "/admin/analytics" },
        { title: "O'quvchilar", desc: "Tahrirlash va ko'rish", icon: Users, bg: isDark ? "bg-[#353535]" : "bg-white border-gray-100 border shadow-sm", path: "/admin/users" },
        { title: "Feed & Stories", desc: "Instagram tasma va hikoyalar", icon: Compass, bg: "bg-gradient-to-r from-pink-500 to-yellow-500 shadow-lg shadow-pink-500/20", path: "/admin/feed" },
        { title: "Baholash", desc: "Natijalarni tekshirish", icon: ClipboardCheck, bg: isDark ? "bg-[#353535]" : "bg-white border-gray-100 border shadow-sm", path: "/admin/results" },
        { title: "E'lonlar", desc: "Yangiliklar yuborish", icon: Megaphone, bg: isDark ? "bg-[#353535]" : "bg-white border-gray-100 border shadow-sm", path: "/admin/announcements" },
        { title: "Maqolalar", desc: "Maqolalar yaratish", icon: Newspaper, bg: isDark ? "bg-[#353535]" : "bg-white border-gray-100 border shadow-sm", path: "/admin/articles" }
    ];

    return (
        <div className="grid grid-cols-12 gap-4 mb-8">
            <div className="col-span-12 text-gray-400 dark:text-gray-500 font-bold text-[10px] mb-2 uppercase tracking-[0.2em] pl-1">Tezkor Menyular</div>
            {actions.map((action, idx) => (
                <ActionCard 
                    key={idx}
                    {...action}
                    onClick={() => navigate(action.path)}
                    isDark={isDark}
                />
            ))}
        </div>
    );
};

export default AdminDashboardActions;
