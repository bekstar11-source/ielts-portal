// src/App.jsx
import React, { useEffect } from 'react'; // 🔥 useEffect qo'shildi
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'; // 🔥 useLocation qo'shildi
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
  const { user, loading, trackUserActivity } = useAuth(); // 🔥 trackUserActivity olib kelindi
  const location = useLocation(); // 🔥 Hozirgi sahifa manzilini olish

  // 🔥 GOD MODE KUZATUVCHISI
  // Har safar sahifa o'zgarganda (location o'zgarganda) ishlaydi
  useEffect(() => {
    if (user && trackUserActivity) {
      const path = location.pathname;
      let activityName = "Saytda";

      // Sahifaga qarab statusni aniqlaymiz
      if (path === '/dashboard') activityName = "Bosh sahifada (Dashboard)";
      else if (path.includes('/test/')) activityName = "Reading Test ishlamoqda... 📝"; // Siz so'ragan maxsus status
      else if (path === '/mock-exam') activityName = "Mock Exam bo'limida";
      else if (path.includes('/review/')) activityName = "Xatolarini tahlil qilmoqda";
      else if (path === '/my-results') activityName = "Natijalarini ko'rmoqda";
      else if (path.includes('/admin')) activityName = "Admin Panelda 🛠";
      else activityName = `Ko'rib chiqmoqda: ${path}`;

      // AuthContext orqali bazaga yozamiz
      trackUserActivity(activityName);
    }
  }, [location, user, trackUserActivity]);


  if (loading) return <div className="flex h-screen items-center justify-center">IELTS Portal...</div>;

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />

      {/* STUDENT YO'NALISHLARI */}
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