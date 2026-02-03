import React from 'react';
import { Icons } from './Icons';

export default function DashboardHeader({ user, userData, onKeyClick, onLogoutClick, activeTab, setActiveTab }) {
  
  // 🔥 YANGILANGAN MENU: "Natijalar" qo'shildi
  const menuItems = [
    { id: 'dashboard', label: 'Asosiy' },
    { id: 'results', label: 'Natijalar' }, // <-- YANGI TUGMA
    { id: 'archive', label: 'Arxiv' },
    { id: 'favorites', label: 'Sevimlilar' },
    { id: 'settings', label: 'Sozlamalar' }
  ];

  return (
    <>
      <style>{`
        .glass-header { background: rgba(255, 255, 255, 0.75); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid rgba(0, 0, 0, 0.05); }
      `}</style>
      <header className="sticky top-0 z-50 w-full glass-header px-6 py-3 flex items-center justify-between transition-all">
        {/* Logo */}
        <div className="flex items-center cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <h1 className="text-lg font-semibold tracking-tight text-gray-900 mr-8">Dashboard</h1>
        </div>

        {/* Center Navigation */}
        <nav className="absolute left-1/2 transform -translate-x-1/2 hidden md:flex items-center gap-1 bg-gray-100/50 p-1 rounded-full border border-gray-200/50">
            {menuItems.map((item) => (
                <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`text-[13px] font-medium tracking-tight px-4 py-1.5 rounded-full transition-all duration-200 
                    ${activeTab === item.id 
                        ? 'bg-white text-black shadow-sm font-semibold' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'}`}
                >
                    {item.label}
                </button>
            ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
            <button 
                onClick={onKeyClick} 
                className="bg-black hover:bg-gray-800 text-white px-4 py-1.5 rounded-full font-medium text-xs transition shadow-sm flex items-center gap-2"
            >
                <Icons.Key className="w-3.5 h-3.5"/> <span>Key mock</span>
            </button>

            <div className="hidden sm:flex flex-col items-end mr-1">
                <span className="text-[13px] font-semibold text-gray-900 leading-tight">
                    {userData?.fullName || user?.email}
                </span>
                <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">O'quvchi</span>
            </div>

            <button onClick={onLogoutClick} className="text-gray-400 hover:text-red-500 transition p-1">
                <Icons.Logout className="w-5 h-5" /> 
            </button>
        </div>
      </header>
    </>
  );
}