import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PublicDashboard from '../../pages/public/PublicDashboard';
import StudentDashboard from '../../pages/student/StudentDashboard';

export const LoadingScreen = () => {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-white select-none">
      <span className="text-3xl md:text-4xl font-sans tracking-tight text-black lowercase animate-pulse">
        <span className="font-normal">eng</span>
        <span className="font-bold">lev.</span>
      </span>
    </div>
  );
};

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, userData, loading, isGuest } = useAuth();
  if (loading) return <LoadingScreen />;
  // ⚠️ Anonim (trial) sessiyada `user` to'ldirilgan bo'ladi, lekin `users/{uid}`
  // hujjati yo'q va Firestore ham yopiq. Uni ichkariga qo'ysak, quyidagi
  // `userData` tekshiruvlari xato ekraniga olib borardi — mehmonni bosh
  // sahifaga qaytargan ma'qul.
  if (!user || isGuest) return <Navigate to="/" />;
  
  // If the user has authenticated but their Firestore document doesn't exist yet,
  // redirect them to the dashboard router to show the onboarding/creation fallback or an error screen.
  if (!userData && allowedRoles) {
    return <Navigate to="/dashboard" />;
  }

  if (allowedRoles && !allowedRoles.includes(userData?.role)) {
    if (userData?.role === 'admin') return <Navigate to="/admin" />;
    if (userData?.role === 'teacher') return <Navigate to="/teacher" />;
    return <Navigate to="/dashboard" />;
  }
  return children;
};

export const DashboardRouter = () => {
  const { userData, loading, logout } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!userData) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#050505] text-white p-6 text-center font-sans">
        <div className="max-w-md w-full p-8 bg-zinc-900/50 border border-zinc-800 rounded-3xl backdrop-blur-xl">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-[#FF5520] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-3 tracking-tight">Tizimga kirishda xatolik</h2>
          <p className="text-zinc-400 mb-8 leading-relaxed text-sm">
            Profilingiz ma'lumotlarini yuklashda muammo yuz berdi. Bu sizning profilingiz hali to'liq yaratilmagani yoki tarmoq xatoligi tufayli bo'lishi mumkin.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button 
              onClick={() => window.location.reload()} 
              className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
            >
              Yangilash
            </button>
            <button 
              onClick={() => logout()} 
              className="flex-1 px-6 py-3 bg-[#FF5520] hover:bg-[#FF5520]/90 text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
            >
              Chiqish
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (userData.role === 'admin') {
    return <Navigate to="/admin" />;
  }

  if (userData.role === 'teacher') {
    return <Navigate to="/teacher" />;
  }

  if (userData.accountType === 'public' && userData.onboardingCompleted === false) {
    return <Navigate to="/onboarding" />;
  }

  if (userData.accountType === 'public' && userData.onboardingCompleted === true) {
    return <StudentDashboard />;
  }

  return <StudentDashboard />;
};
