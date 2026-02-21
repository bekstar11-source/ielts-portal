// src/App.jsx
import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// SAHIFALAR
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminTests from './pages/AdminTests';
import Onboarding from './pages/Onboarding';
import Practice from './pages/Practice';
import Settings from './pages/Settings';
import PublicDashboard from './pages/PublicDashboard';
import DiagnosticIntro from './pages/DiagnosticIntro';
import DiagnosticTestSolving from './pages/DiagnosticTestSolving';
import DiagnosticResult from './pages/DiagnosticResult';
import { ThemeProvider } from './context/ThemeContext';
import AdminLayout from './components/common/AdminLayout';

// ADMIN SAHIFALAR
import CreateTest from './pages/CreateTest';
import AdminResults from './pages/AdminResults';
import AdminAnnouncements from './pages/AdminAnnouncements';
import AdminLogs from './pages/AdminLogs';
import AdminGamification from './pages/AdminGamification';

// TEST BILAN BOG'LIQ SAHIFALAR
import TestSolving from './pages/TestSolving';
import TestReview from './pages/TestReview';

import MockExam from './pages/MockExam';
import MyResults from './pages/MyResults';
import WordBank from './pages/WordBank';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, userData, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center">Yuklanmoqda...</div>;
  if (!user) return <Navigate to="/" />;
  if (allowedRoles && !allowedRoles.includes(userData?.role)) {
    return <Navigate to="/dashboard" />;
  }
  return children;
};

const DashboardRouter = () => {
  const { userData, loading } = useAuth();

  if (loading || !userData) return <div className="flex h-screen items-center justify-center bg-[#050505] text-white">Yuklanmoqda...</div>;

  if (userData.role === 'admin') {
    return <Navigate to="/admin" />;
  }

  // Agar public user bo'lsa va Onboarding'dan o'tmagan bo'lsa
  if (userData.accountType === 'public' && userData.onboardingCompleted === false) {
    return <Navigate to="/onboarding" />;
  }

  // Agar public user bo'lsa va Onboarding'dan o'tgan bo'lsa
  if (userData.accountType === 'public' && userData.onboardingCompleted === true) {
    return <PublicDashboard />;
  }

  // Qolgan barcha holatlarda (eski o'quvchilar, groupId borlar, accountType yo'qlar)
  return <StudentDashboard />;
};

function App() {
  const { user, userData, loading, trackUserActivity } = useAuth();
  const location = useLocation();

  // GOD MODE KUZATUVCHISI
  useEffect(() => {
    if (user && trackUserActivity) {
      const path = location.pathname;
      let activityName = "Saytda";

      if (path === '/dashboard') activityName = "Bosh sahifada (Dashboard)";
      else if (path.includes('/test/')) activityName = "Reading Test ishlamoqda... 統";
      else if (path === '/mock-exam') activityName = "Mock Exam bo'limida";
      else if (path.includes('/review/')) activityName = "Xatolarini tahlil qilmoqda";
      else if (path === '/my-results') activityName = "Natijalarini ko'rmoqda";
      else if (path.includes('/admin')) activityName = "Admin Panelda 屏";
      else activityName = `Ko'rib chiqmoqda: ${path}`;

      trackUserActivity(activityName);
    }
  }, [location, user, trackUserActivity]);


  if (loading) return <div className="flex h-screen items-center justify-center">IELTS Portal...</div>;

  return (
    <ThemeProvider>
      <Routes>
        {/* Bosh sahifa (Landing) */}
        <Route
          path="/"
          element={
            user ? (
              userData?.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/dashboard" />
            ) : (
              <LandingPage />
            )
          }
        />

        {/* Register sahifasi */}
        <Route
          path="/register"
          element={
            user ? (
              userData?.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/dashboard" />
            ) : (
              <Register />
            )
          }
        />

        {/* STUDENT YO'NALISHLARI */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute allowedRoles={['student', 'admin']}>
              <Onboarding />
            </ProtectedRoute>
          }
        />

        <Route
          path="/practice"
          element={
            <ProtectedRoute allowedRoles={['student', 'admin']}>
              <Practice />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={['student', 'admin']}>
              <Settings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['student', 'admin']}>
              <DashboardRouter />
            </ProtectedRoute>
          }
        />

        <Route
          path="/diagnostic-intro"
          element={
            <ProtectedRoute allowedRoles={['student', 'admin']}>
              <DiagnosticIntro />
            </ProtectedRoute>
          }
        />

        <Route
          path="/diagnostic-test/:testId"
          element={
            <ProtectedRoute allowedRoles={['student', 'admin']}>
              <DiagnosticTestSolving />
            </ProtectedRoute>
          }
        />

        <Route
          path="/diagnostic-result/:id"
          element={
            <ProtectedRoute allowedRoles={['student', 'admin']}>
              <DiagnosticResult />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-results"
          element={
            <ProtectedRoute allowedRoles={['student', 'admin']}>
              <MyResults />
            </ProtectedRoute>
          }
        />

        <Route
          path="/test/:testId"
          element={
            <ProtectedRoute allowedRoles={['student', 'admin']}>
              <TestSolving />
            </ProtectedRoute>
          }
        />

        <Route
          path="/review/:id"
          element={
            <ProtectedRoute allowedRoles={['student', 'admin']}>
              <TestReview />
            </ProtectedRoute>
          }
        />

        <Route
          path="/mock-exam"
          element={
            <ProtectedRoute allowedRoles={['student', 'admin']}>
              <MockExam />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vocabulary"
          element={
            <ProtectedRoute allowedRoles={['student', 'admin']}>
              <WordBank />
            </ProtectedRoute>
          }
        />

        {/* --- ADMIN YO'NALISHLARI (LAYOUT BILAN) --- */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="tests" element={<AdminTests />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="create-test" element={<CreateTest />} />
          <Route path="edit-test/:id" element={<CreateTest />} />
          <Route path="results" element={<AdminResults />} />
          <Route path="logs" element={<AdminLogs />} />
          <Route path="gamification" element={<AdminGamification />} />
          <Route path="settings" element={<Settings />} />
        </Route>



        {/* Login sahifasi */}
        <Route
          path="/login"
          element={
            user ? (
              userData?.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/dashboard" />
            ) : (
              <Login />
            )
          }
        />



        {/* Noma'lum sahifalar uchun redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;