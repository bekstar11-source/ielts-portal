import React from 'react';
import { Plus, BarChart, Users, ClipboardCheck, Megaphone, Newspaper, Compass, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ActionCard = ({ title, desc, icon: Icon, colorClass, onClick, isDark, badge }) => (
    <button
        onClick={onClick}
        className={`col-span-6 sm:col-span-4 lg:col-span-2 p-4 rounded-2xl flex flex-col items-center text-center border transition-colors relative
            ${isDark ? 'bg-[#1E1E1E] border-white/5 hover:border-white/10' : 'bg-white border-gray-100 hover:border-gray-200'}`}
    >
        {badge > 0 && (
            <span className="absolute top-2.5 right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {badge}
            </span>
        )}
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${colorClass}`}>
            <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold mb-1 text-gray-900 dark:text-white">{title}</h3>
        <p className="text-[11px] leading-tight text-gray-400 dark:text-gray-500">{desc}</p>
    </button>
);

const AdminDashboardActions = ({ isDark }) => {
    const navigate = useNavigate();

    const actions = [
        { title: "Test Yaratish", desc: "Yangi Reading/Listening", icon: Plus, colorClass: "bg-blue-500/10 text-blue-500", path: "/admin/create-test" },
        { title: "Mock Testlar", desc: "Mock paketlari yaratish", icon: Layers, colorClass: "bg-emerald-500/10 text-emerald-600", path: "/admin/mocks" },
        { title: "Analitika", desc: "Statistika va tahlillar", icon: BarChart, colorClass: "bg-purple-500/10 text-purple-600", path: "/admin/analytics" },
        { title: "O'quvchilar", desc: "Tahrirlash va ko'rish", icon: Users, colorClass: "bg-cyan-500/10 text-cyan-600", path: "/admin/users" },
        { title: "Feed & Stories", desc: "Instagram tasma va hikoyalar", icon: Compass, colorClass: "bg-pink-500/10 text-pink-600", path: "/admin/feed" },
        { title: "Baholash", desc: "Natijalarni tekshirish", icon: ClipboardCheck, colorClass: "bg-amber-500/10 text-amber-600", path: "/admin/results" },
        { title: "E'lonlar", desc: "Yangiliklar yuborish", icon: Megaphone, colorClass: "bg-indigo-500/10 text-indigo-600", path: "/admin/announcements" },
        { title: "Maqolalar", desc: "Maqolalar yaratish", icon: Newspaper, colorClass: "bg-slate-500/10 text-slate-600", path: "/admin/articles" }
    ];

    return (
        <div className="grid grid-cols-12 gap-3 mb-8">
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
