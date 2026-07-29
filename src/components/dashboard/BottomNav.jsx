import React from 'react';
import { Home, Headphones, Settings, Newspaper, BookMarked, BookOpen } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../../context/LanguageContext';

export default function BottomNav({ activeTab, setActiveTab }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const navItems = [
    { id: 'dashboard', label: t('dashboard.home') || 'Home', icon: Home, path: '/dashboard' },
    { id: 'library', label: t('dashboard.library') || 'Library', icon: BookOpen, path: '/library' },
    { id: 'articles', label: t('dashboard.articles') || 'Articles', icon: Newspaper, path: '/articles' },
    { id: 'podcasts', label: t('dashboard.podcasts') || 'Podcasts', icon: Headphones, path: '/podcasts' },
    { id: 'vocabulary', label: t('dashboard.vocabulary') || 'WordBank', icon: BookMarked, path: '/vocabulary' },
    { id: 'settings', label: t('dashboard.settings') || 'Settings', icon: Settings, path: '/settings' },
  ];

  const handleTabClick = (item) => {
    const isLocalDashboardTab = location.pathname === '/dashboard' && (item.id === 'dashboard' || item.id === 'settings');

    if (setActiveTab) {
      setActiveTab(item.id);
    }

    if (!isLocalDashboardTab) {
      navigate(item.path);
    }
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-warm-canvas dark:bg-warm-dark border-t border-warm-hairline dark:border-white/5 z-[100] px-2 py-2 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] pb-[safe-area-inset-bottom]">
      <div className="flex justify-around items-center w-full max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          
          let isActive = false;
          if (item.id === 'dashboard') {
            isActive = activeTab === 'dashboard' || (location.pathname === '/dashboard' && activeTab !== 'settings');
          } else if (item.id === 'settings') {
            isActive = activeTab === 'settings' || location.pathname === '/settings';
          } else if (item.id === 'library') {
            isActive = activeTab === 'library' || location.pathname === '/library';
          } else if (item.id === 'articles') {
            isActive = activeTab === 'articles' || location.pathname === '/articles' || location.pathname.startsWith('/article/');
          } else if (item.id === 'podcasts') {
            isActive = activeTab === 'podcasts' || location.pathname === '/podcasts' || location.pathname.startsWith('/podcast/');
          } else if (item.id === 'vocabulary') {
            isActive = activeTab === 'vocabulary' || location.pathname.startsWith('/vocabulary');
          }

          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item)}
              className={`flex flex-col items-center gap-1 py-1 px-1.5 rounded-xl transition-all active:scale-95 ${
                isActive
                  ? 'text-warm-primary dark:text-warm-primary font-bold'
                  : 'text-warm-muted dark:text-warm-on-dark-soft hover:text-warm-body dark:hover:text-warm-on-dark'
              }`}
            >
              <Icon size={19} className={isActive ? 'scale-110 transition-transform' : 'transition-transform'} />
              <span className="text-[9px] tracking-tight whitespace-nowrap font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
