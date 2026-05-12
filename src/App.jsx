// src/App.jsx
import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { PodcastProvider } from './context/PodcastContext';

// COMPONENTS
import ScrollToTop from './components/common/ScrollToTop';
import GlobalPodcastPlayer from './components/podcast/GlobalPodcastPlayer';
import { ProtectedRoute, DashboardRouter } from './components/common/RouteGuards';

// STATIC PAGES (Immediate access)
import LandingPage from './pages/public/LandingPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// LAZY PAGES (Code Splitting)
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const TeacherTests = lazy(() => import('./pages/teacher/TeacherTests'));
const TeacherWritingReview = lazy(() => import('./pages/teacher/TeacherWritingReview'));
const TeacherGroupStats = lazy(() => import('./pages/teacher/TeacherGroupStats'));
const TeacherAllResults = lazy(() => import('./pages/teacher/TeacherAllResults'));
const TeacherCreateWriting = lazy(() => import('./pages/teacher/TeacherCreateWriting'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminTests = lazy(() => import('./pages/admin/AdminTests'));
const Onboarding = lazy(() => import('./pages/auth/Onboarding'));
const Practice = lazy(() => import('./pages/student/Practice'));
const RoadmapPage = lazy(() => import('./pages/student/RoadmapPage'));
const Settings = lazy(() => import('./pages/student/Settings'));
const DiagnosticIntro = lazy(() => import('./pages/diagnostic/DiagnosticIntro'));
const DiagnosticTestSolving = lazy(() => import('./pages/diagnostic/DiagnosticTestSolving'));
const DiagnosticResult = lazy(() => import('./pages/diagnostic/DiagnosticResult'));
const CreateTest = lazy(() => import('./pages/admin/CreateTest'));
const AdminResults = lazy(() => import('./pages/admin/AdminResults'));
const AdminAnnouncements = lazy(() => import('./pages/admin/AdminAnnouncements'));
const AdminLogs = lazy(() => import('./pages/admin/AdminLogs'));
const AdminGamification = lazy(() => import('./pages/admin/AdminGamification'));
const TestSolving = lazy(() => import('./pages/test/TestSolving'));
const TestReview = lazy(() => import('./pages/test/TestReview'));
const MockExam = lazy(() => import('./pages/test/MockExam'));
const MyResults = lazy(() => import('./pages/student/MyResults'));
const WordBank = lazy(() => import('./pages/student/WordBank'));
const PodcastPlayer = lazy(() => import('./pages/podcasts/PodcastPlayer'));
const AdminPodcasts = lazy(() => import('./pages/admin/AdminPodcasts'));
const CreatePodcast = lazy(() => import('./pages/podcasts/CreatePodcast'));
const KeyManager = lazy(() => import('./pages/admin/KeyManager'));
const SpotifyPodcast = lazy(() => import('./pages/podcasts/SpotifyPodcast'));
const CreateSpotifyPodcast = lazy(() => import('./pages/podcasts/CreateSpotifyPodcast'));
const SpotifyAlbum = lazy(() => import('./pages/podcasts/SpotifyAlbum'));
const SpotifyEpisodeDetails = lazy(() => import('./pages/podcasts/SpotifyEpisodeDetails'));
const StudentStatistics = lazy(() => import('./pages/student/StudentStatistics'));
const StudentLeaderboard = lazy(() => import('./pages/student/StudentLeaderboard'));
const SpeakingPractice = lazy(() => import('./pages/test/SpeakingPractice'));
const ArticleReading = lazy(() => import('./pages/articles/ArticleReading'));
const Articles = lazy(() => import('./pages/articles/Articles'));
const AdminArticles = lazy(() => import('./pages/admin/AdminArticles'));
const AdminRoadmap = lazy(() => import('./pages/admin/AdminRoadmap'));
const Podcasts = lazy(() => import('./pages/podcasts/Podcasts'));
const Listening = lazy(() => import('./pages/test/Listening'));
const Reading = lazy(() => import('./pages/test/Reading'));
const Pricing = lazy(() => import('./pages/public/Pricing'));
const Library = lazy(() => import('./pages/student/Library'));

// LAYOUTS
const TeacherLayout = lazy(() => import('./components/common/TeacherLayout'));
const AdminLayout = lazy(() => import('./components/common/AdminLayout'));

const PageLoading = () => (
  <div className="flex h-screen items-center justify-center bg-[#050505] text-white">
    <div className="animate-pulse text-2xl font-bold">ENGLEV...</div>
  </div>
);

function App() {
  const { user, userData, loading } = useAuth();

  if (loading) return <PageLoading />;

  return (
    <ThemeProvider>
      <PodcastProvider>
        <ScrollToTop />
        <GlobalPodcastPlayer />
        <Suspense fallback={<PageLoading />}>
          <Routes>
            {/* PUBLIC ROUTES */}
            <Route path="/" element={
              user ? (
                userData?.role === 'admin' ? <Navigate to="/admin" /> 
                : userData?.role === 'teacher' ? <Navigate to="/teacher" /> 
                : <Navigate to="/dashboard" />
              ) : <LandingPage />
            } />
            <Route path="/register" element={
              user ? <Navigate to="/dashboard" /> : <Register />
            } />
            <Route path="/login" element={
              user ? <Navigate to="/dashboard" /> : <Login />
            } />

            {/* SHARED PROTECTED ROUTES */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
            <Route path="/test/:testId" element={<ProtectedRoute><TestSolving /></ProtectedRoute>} />
            <Route path="/review/:id" element={<ProtectedRoute><TestReview /></ProtectedRoute>} />
            <Route path="/statistics" element={<ProtectedRoute><StudentStatistics /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><StudentLeaderboard /></ProtectedRoute>} />
            <Route path="/my-results" element={<ProtectedRoute><MyResults /></ProtectedRoute>} />
            <Route path="/vocabulary" element={<ProtectedRoute><WordBank /></ProtectedRoute>} />

            {/* STUDENT SPECIFIC ROUTES */}
            <Route path="/onboarding" element={<ProtectedRoute allowedRoles={['student', 'admin']}><Onboarding /></ProtectedRoute>} />
            <Route path="/practice" element={<ProtectedRoute allowedRoles={['student', 'admin']}><Practice /></ProtectedRoute>} />
            <Route path="/reading" element={<ProtectedRoute allowedRoles={['student', 'admin']}><Reading /></ProtectedRoute>} />
            <Route path="/listening" element={<ProtectedRoute allowedRoles={['student', 'admin']}><Listening /></ProtectedRoute>} />
            <Route path="/library" element={<ProtectedRoute allowedRoles={['student', 'admin']}><Library /></ProtectedRoute>} />
            <Route path="/roadmap" element={<ProtectedRoute allowedRoles={['student', 'admin']}><RoadmapPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute allowedRoles={['student', 'admin']}><Settings /></ProtectedRoute>} />
            <Route path="/mock-exam" element={<ProtectedRoute allowedRoles={['student', 'admin', 'teacher']}><MockExam /></ProtectedRoute>} />
            
            {/* CONTENT ROUTES */}
            <Route path="/podcasts" element={<ProtectedRoute><Podcasts /></ProtectedRoute>} />
            <Route path="/podcast/:podcastId" element={<ProtectedRoute><PodcastPlayer /></ProtectedRoute>} />
            <Route path="/podcast/spotify/:podcastId" element={<ProtectedRoute><SpotifyPodcast /></ProtectedRoute>} />
            <Route path="/podcast/album/:albumId" element={<ProtectedRoute><SpotifyAlbum /></ProtectedRoute>} />
            <Route path="/podcast/episode/:podcastId" element={<ProtectedRoute><SpotifyEpisodeDetails /></ProtectedRoute>} />
            <Route path="/articles" element={<ProtectedRoute><Articles /></ProtectedRoute>} />
            <Route path="/article/:id" element={<ProtectedRoute><ArticleReading /></ProtectedRoute>} />
            <Route path="/speaking-practice" element={<ProtectedRoute><SpeakingPractice /></ProtectedRoute>} />
            <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />

            {/* DIAGNOSTIC ROUTES */}
            <Route path="/diagnostic-intro" element={<ProtectedRoute><DiagnosticIntro /></ProtectedRoute>} />
            <Route path="/diagnostic-test/:testId" element={<ProtectedRoute><DiagnosticTestSolving /></ProtectedRoute>} />
            <Route path="/diagnostic-result/:id" element={<ProtectedRoute><DiagnosticResult /></ProtectedRoute>} />

            {/* TEACHER ROUTES */}
            <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherLayout /></ProtectedRoute>}>
              <Route index element={<TeacherDashboard />} />
              <Route path="tests" element={<TeacherTests />} />
              <Route path="writing-review" element={<TeacherWritingReview />} />
              <Route path="create-writing" element={<TeacherCreateWriting />} />
              <Route path="group-stats" element={<TeacherGroupStats />} />
              <Route path="results" element={<TeacherAllResults />} />
              <Route path="articles" element={<AdminArticles />} />
            </Route>

            {/* ADMIN ROUTES */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="tests" element={<AdminTests />} />
              <Route path="roadmap" element={<AdminRoadmap />} />
              <Route path="announcements" element={<AdminAnnouncements />} />
              <Route path="articles" element={<AdminArticles />} />
              <Route path="create-test" element={<CreateTest />} />
              <Route path="edit-test/:id" element={<CreateTest />} />
              <Route path="results" element={<AdminResults />} />
              <Route path="logs" element={<AdminLogs />} />
              <Route path="gamification" element={<AdminGamification />} />
              <Route path="podcasts" element={<AdminPodcasts />} />
              <Route path="writing-review" element={<TeacherWritingReview />} />
              <Route path="create-podcast" element={<CreatePodcast />} />
              <Route path="edit-podcast/:id" element={<CreatePodcast />} />
              <Route path="create-spotify-podcast" element={<CreateSpotifyPodcast />} />
              <Route path="edit-spotify-podcast/:id" element={<CreateSpotifyPodcast />} />
              <Route path="key-manager" element={<KeyManager />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </PodcastProvider>
    </ThemeProvider>
  );
}

export default App;