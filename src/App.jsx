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

// ADMIN SAHIFALAR
import CreateTest from './pages/CreateTest';
import AdminResults from './pages/AdminResults';

// TEST BILAN BOG'LIQ SAHIFALAR
import TestSolving from './pages/TestSolving';
import TestReview from './pages/TestReview';

import MockExam from './pages/MockExam';
import MyResults from './pages/MyResults';


const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, userData, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center">Yuklanmoqda...</div>;
  if (!user) return <Navigate to="/" />;
  if (allowedRoles && !allowedRoles.includes(userData?.role)) {
    return <Navigate to="/dashboard" />;
  }
  return children;
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
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['student', 'admin']}>
            <StudentDashboard />
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

      {/* --- ADMIN YO'NALISHLARI --- */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin']}><AdminAnalytics /></ProtectedRoute>} />
      <Route path="/admin/tests" element={<ProtectedRoute allowedRoles={['admin']}><AdminTests /></ProtectedRoute>} />

      <Route
        path="/admin/create-test"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <CreateTest />
          </ProtectedRoute>
        }
      />

      {/* --- YANGI QO'SHILGAN ROUTE: TAHRIRLASH UCHUN --- */}
      <Route
        path="/admin/edit-test/:id"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <CreateTest />
          </ProtectedRoute>
        }
      />

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

      <Route
        path="/admin/results"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminResults />
          </ProtectedRoute>
        }
      />

      {/* Noma'lum sahifalar uchun redirect */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;