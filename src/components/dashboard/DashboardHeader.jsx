import React, { useState } from 'react';
import { Zap, ChevronDown, Key, LogOut } from 'lucide-react';

import { useNavigate } from 'react-router-dom';

export default function DashboardHeader({ user, userData, onKeyClick, onLogoutClick, activeTab, setActiveTab }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const navigate = useNavigate();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { id: 'practice', label: 'Practice', path: '/practice' },
    { id: 'results', label: 'Natijalar', path: '/my-results' },
    { id: 'archive', label: 'Arxiv', path: '/archive' }, // Kelajakda alohida sahifa bo'lishi mumkin
    { id: 'favorites', label: 'Sevimlilar', path: '/favorites' }
  ];

  const handleNavigation = (item) => {
    if (item.path) {
      navigate(item.path);
    } else {
      setActiveTab(item.id);
    }
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-center mb-10 md:mb-16 gap-6 md:gap-0 pt-6 relative z-50">
      {/* Logo */}
      <div className="hidden md:block w-32 cursor-pointer" onClick={() => navigate('/dashboard')}>
        <div className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
          <Zap className="w-6 h-6 text-vetra-orange fill-vetra-orange" />
          <span className="font-bold text-xl tracking-tight text-white">
            Vetra<span className="text-vetra-orange">IELTS</span>
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex items-center gap-4 md:gap-8 text-[15px] md:text-[16px] overflow-x-auto max-w-full px-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigation(item)}
            className={`font-medium transition-all relative nav-link whitespace-nowrap
                        ${activeTab === item.id
                ? 'text-vetra-blue font-semibold scale-105'
                : 'text-vetra-textMuted hover:text-white'}`}
          >
            {item.label}
            {activeTab === item.id && (
              <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-vetra-blue rounded-full"></span>
            )}
          </button>
        ))}
      </nav>

      {/* Right Side: Key & Profile */}
      <div className="w-auto md:w-32 flex justify-end items-center gap-3">
        {/* Mobile/Tablet: Key Button visible */}
        <button
          onClick={onKeyClick}
          className="p-2 rounded-full bg-white/10 hover:bg-vetra-orange/20 text-white hover:text-vetra-orange transition-colors"
          title="Enter Access Key"
        >
          <Key className="w-5 h-5" />
        </button>

        {/* Profile Dropdown Trigger */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 bg-white rounded-full p-1 pl-1 pr-2 md:pr-4 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all duration-300 group"
          >
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-200 overflow-hidden border-2 border-white">
              <img
                src={user?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"}
                alt="Profile"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-500 group-hover:text-gray-800 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-[#0F0F0F] border border-white/10 rounded-xl shadow-xl overflow-hidden py-1 z-50 animate-fade-in-up">
              <div className="px-4 py-3 border-b border-white/5">
                <p className="text-sm text-white font-medium truncate">{userData?.fullName || "User"}</p>
                <p className="text-xs text-vetra-textMuted truncate">{user?.email}</p>
              </div>
              <button
                onClick={onLogoutClick}
                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-white/5 flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Chiqish
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}