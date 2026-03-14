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
// TEACHER SAHIFALAR
import TeacherLayout from './components/common/TeacherLayout';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherTests from './pages/TeacherTests';
import TeacherWritingReview from './pages/TeacherWritingReview';
import TeacherGroupStats from './pages/TeacherGroupStats';
import TeacherAllResults from './pages/TeacherAllResults';
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
import PodcastPlayer from './pages/PodcastPlayer';
import AdminPodcasts from './pages/AdminPodcasts';
import CreatePodcast from './pages/CreatePodcast';
import KeyManager from './pages/KeyManager';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, userData, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center">Yuklanmoqda...</div>;
  if (!user) return <Navigate to="/" />;
  if (allowedRoles && !allowedRoles.includes(userData?.role)) {
    // Rolga qarab to'g'ri sahifaga yo'naltirish (cheksiz loop oldini olish)
    if (userData?.role === 'admin') return <Navigate to="/admin" />;
    if (userData?.role === 'teacher') return <Navigate to="/teacher" />;
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

  // Teacher rolga yo'naltirish
  if (userData.role === 'teacher') {
    return <Navigate to="/teacher" />;
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
  const { user, userData, loading } = useAuth();
  const location = useLocation();


  if (loading) return <div className="flex h-screen items-center justify-center">ENGLEV...</div>;

  return (
    <ThemeProvider>
      <Routes>
        {/* Bosh sahifa (Landing) */}
        <Route
          path="/"
          element={
            user ? (
              userData?.role === 'admin' ? <Navigate to="/admin" />
              : userData?.role === 'teacher' ? <Navigate to="/teacher" />
              : <Navigate to="/dashboard" />
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
              userData?.role === 'admin' ? <Navigate to="/admin" />
              : userData?.role === 'teacher' ? <Navigate to="/teacher" />
              : <Navigate to="/dashboard" />
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
            <ProtectedRoute allowedRoles={['student', 'admin', 'teacher']}>
              <DiagnosticIntro />
            </ProtectedRoute>
          }
        />

        <Route
          path="/diagnostic-test/:testId"
          element={
            <ProtectedRoute allowedRoles={['student', 'admin', 'teacher']}>
              <DiagnosticTestSolving />
            </ProtectedRoute>
          }
        />

        <Route
          path="/diagnostic-result/:id"
          element={
            <ProtectedRoute allowedRoles={['student', 'admin', 'teacher']}>
              <DiagnosticResult />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-results"
          element={
            <ProtectedRoute allowedRoles={['student', 'admin', 'teacher']}>
              <MyResults />
            </ProtectedRoute>
          }
        />

        <Route
          path="/test/:testId"
          element={
            <ProtectedRoute allowedRoles={['student', 'admin', 'teacher']}>
              <TestSolving />
            </ProtectedRoute>
          }
        />

        <Route
          path="/review/:id"
          element={
            <ProtectedRoute allowedRoles={['student', 'admin', 'teacher']}>
              <TestReview />
            </ProtectedRoute>
          }
        />

        <Route
          path="/mock-exam"
          element={
            <ProtectedRoute allowedRoles={['student', 'admin', 'teacher']}>
              <MockExam />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vocabulary"
          element={
            <ProtectedRoute allowedRoles={['student', 'admin', 'teacher']}>
              <WordBank />
            </ProtectedRoute>
          }
        />

        <Route
          path="/podcast/:podcastId"
          element={
            <ProtectedRoute allowedRoles={['student', 'admin', 'teacher']}>
              <PodcastPlayer />
            </ProtectedRoute>
          }
        />

        {/* --- TEACHER YO'NALISHLARI --- */}
        <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherLayout /></ProtectedRoute>}>
          <Route index element={<TeacherDashboard />} />
          <Route path="tests" element={<TeacherTests />} />
          <Route path="writing-review" element={<TeacherWritingReview />} />
          <Route path="group-stats" element={<TeacherGroupStats />} />
          <Route path="results" element={<TeacherAllResults />} />
        </Route>

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
          <Route path="podcasts" element={<AdminPodcasts />} />
          <Route path="create-podcast" element={<CreatePodcast />} />
          <Route path="edit-podcast/:id" element={<CreatePodcast />} />
          <Route path="key-manager" element={<KeyManager />} />
          <Route path="settings" element={<Settings />} />
        </Route>



        {/* Login sahifasi */}
        <Route
          path="/login"
          element={
            user ? (
              userData?.role === 'admin' ? <Navigate to="/admin" />
              : userData?.role === 'teacher' ? <Navigate to="/teacher" />
              : <Navigate to="/dashboard" />
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