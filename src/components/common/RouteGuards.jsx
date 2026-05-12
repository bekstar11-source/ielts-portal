import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PublicDashboard from '../../pages/public/PublicDashboard';
import StudentDashboard from '../../pages/student/StudentDashboard';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, userData, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center">Yuklanmoqda...</div>;
  if (!user) return <Navigate to="/" />;
  if (allowedRoles && !allowedRoles.includes(userData?.role)) {
    if (userData?.role === 'admin') return <Navigate to="/admin" />;
    if (userData?.role === 'teacher') return <Navigate to="/teacher" />;
    return <Navigate to="/dashboard" />;
  }
  return children;
};

export const DashboardRouter = () => {
  const { userData, loading } = useAuth();

  if (loading || !userData) return <div className="flex h-screen items-center justify-center bg-[#050505] text-white">Yuklanmoqda...</div>;

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
    return <PublicDashboard />;
  }

  return <StudentDashboard />;
};
