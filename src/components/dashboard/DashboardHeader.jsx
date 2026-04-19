import React, { useState } from 'react';
import { ChevronDown, Key, LogOut, RotateCw } from 'lucide-react';

import { useNavigate } from 'react-router-dom';

export default function DashboardHeader({ user, userData, onKeyClick, onLogoutClick, activeTab, setActiveTab, onPremiumClick, onRefreshClick, loading }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const navigate = useNavigate();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { id: 'practice', label: 'Practice', path: '/practice' },
    { id: 'results', label: 'Natijalar', path: '/my-results' },
    { id: 'leaderboard', label: 'Reyting' },
    { id: 'vocabulary', label: 'WordBank', path: '/vocabulary' },
    { id: 'favorites', label: 'Sevimlilar', path: '/favorites' }
  ];

  const handleNavigation = (item) => {
    // TEMPORARILY DISABLED: PUBLIC USER RESTRICTIONS (Free Trial Period)
    /*
    if (userData?.accountType === 'public') {
      const restrictedPaths = ['/practice', '/my-results', '/archive', '/favorites'];
      if (restrictedPaths.includes(item.path) || restrictedPaths.includes(`/${item.id}`)) {
        if (onPremiumClick) {
          onPremiumClick(item.id === 'practice' ? 'practice' : 'general');
        } else {
          alert("Premium funksiya!");
        }
        return; // Bloklaymiz
      }
    }
    */

    if (item.path) {
      navigate(item.path);
    } else {
      setActiveTab(item.id);
    }
  };

  return (
    <div className="w-full relative z-50 pt-6 mb-10 md:mb-16 pointer-events-none">
      <div className="max-w-7xl mx-auto px-6 md:px-8 flex flex-col md:flex-row justify-between items-center gap-6 md:gap-0 pointer-events-auto">
        {/* Logo */}
        <div className="hidden md:block cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="flex items-center opacity-90 hover:opacity-100 transition-all hover:scale-105 active:scale-95 origin-left">
            <span
              className="font-display text-4xl tracking-tighter text-vetra-orange font-bold"
            >
              ENGLEV
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-6 md:gap-10 text-[14px] md:text-[15px] overflow-x-auto max-w-full px-2 hide-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item)}
              className={`transition-all duration-300 relative pb-2 tracking-[0.1em] text-[13px] font-display uppercase
                        ${activeTab === item.id
                  ? 'text-vetra-orange font-black scale-105 opacity-100'
                  : 'text-[#161616] opacity-70 font-semibold hover:opacity-100 hover:text-vetra-orange'}`}
            >
              {item.label}
              {activeTab === item.id && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-vetra-orange rounded-full"></span>
              )}
            </button>
          ))}
        </nav>

        {/* Right Side: Key & Profile */}
        <div className="w-auto md:w-32 flex justify-end items-center gap-3">
          {/* Refresh Button */}
          <button
            onClick={onRefreshClick}
            className="p-2 rounded-full bg-vetra-grey/30 hover:bg-vetra-orange/10 text-vetra-stone hover:text-vetra-orange transition-colors group"
            title="Yangilash"
          >
            <RotateCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onKeyClick}
            className="p-2 rounded-full bg-vetra-grey/30 hover:bg-vetra-orange/10 text-vetra-stone hover:text-vetra-orange transition-colors"
            title="Enter Access Key"
          >
            <Key className="w-5 h-5" />
          </button>

          {/* Profile Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 bg-white border border-vetra-grey/60 rounded-full p-1 pr-2 md:pr-3 hover:border-vetra-orange/30 transition-all duration-300 group shadow-sm"
            >
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-vetra-silver overflow-hidden border border-vetra-grey/60">
                <img
                  src={userData?.photoURL || user?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"}
                  alt="Profile"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <ChevronDown className={`w-4 h-4 text-vetra-stone group-hover:text-vetra-midnight transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-vetra-grey/60 rounded-xl shadow-xl overflow-hidden py-1 z-50 animate-fade-in-up">
                <div className="px-4 py-3 border-b border-vetra-grey/40">
                  <p className="text-sm text-vetra-midnight font-medium truncate">{userData?.fullName || "User"}</p>
                  <p className="text-xs text-vetra-stone truncate">{user?.email}</p>
                </div>

                <button
                  onClick={() => navigate('/settings')}
                  className="w-full text-left px-4 py-2 text-sm text-vetra-midnight hover:bg-vetra-silver transition-colors flex items-center gap-2 border-b border-vetra-grey/30"
                >
                  <Key className="w-4 h-4" />
                  Sozlamalar
                </button>

                <button
                  onClick={onLogoutClick}
                  className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Chiqish
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}