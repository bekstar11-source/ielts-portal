// src/App.jsx
import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { PodcastProvider } from './context/PodcastContext';

// COMPONENTS
import ScrollToTop from './components/common/ScrollToTop';
import GlobalPodcastPlayer from './components/podcast/GlobalPodcastPlayer';
import { ProtectedRoute, DashboardRouter, LoadingScreen } from './components/common/RouteGuards';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/common/ErrorBoundary';
import SpotlightToast from './components/dashboard/SpotlightToast';
import { FEATURES } from './config/features';

// STATIC PAGES (Immediate access)
import LandingPage from './pages/public/LandingPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// LAZY PAGES (Code Splitting)
// Trial sahifalari ataylab lazy: ular landing trafigining bir qismigagina
// kerak, lekin ReadingInterface/ListeningInterface ni tortib keladi — statik
// import qilinsa landing bundle'i sezilarli kattalashardi.
const AdminTrial = lazy(() => import('./pages/admin/AdminTrial'));
const TrialIntro = lazy(() => import('./pages/public/TrialIntro'));
const TrialSolving = lazy(() => import('./pages/public/TrialSolving'));
const TrialResult = lazy(() => import('./pages/public/TrialResult'));
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const TeacherTests = lazy(() => import('./pages/teacher/TeacherTests'));
const TeacherAssignTest = lazy(() => import('./pages/teacher/TeacherAssignTest'));
const TeacherMonitorTest = lazy(() => import('./pages/teacher/TeacherMonitorTest'));
const TeacherWritingReview = lazy(() => import('./pages/teacher/TeacherWritingReview'));
const TeacherSpeakingReview = lazy(() => import('./pages/teacher/TeacherSpeakingReview'));
const TeacherGroupStats = lazy(() => import('./pages/teacher/TeacherGroupStats'));
const TeacherGroupDetail = lazy(() => import('./pages/teacher/TeacherGroupDetail'));
const TeacherAllResults = lazy(() => import('./pages/teacher/TeacherAllResults'));
const TeacherCreateWriting = lazy(() => import('./pages/teacher/TeacherCreateWriting'));
const TeacherSubscription = lazy(() => import('./pages/teacher/TeacherSubscription'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminTests = lazy(() => import('./pages/admin/AdminTests'));
const Onboarding = lazy(() => import('./pages/auth/Onboarding'));
const Practice = lazy(() => import('./pages/student/Practice'));
const Settings = lazy(() => import('./pages/student/Settings'));
const DiagnosticIntro = lazy(() => import('./pages/diagnostic/DiagnosticIntro'));
const DiagnosticTestSolving = lazy(() => import('./pages/diagnostic/DiagnosticTestSolving'));
const DiagnosticResult = lazy(() => import('./pages/diagnostic/DiagnosticResult'));
const CreateTest = lazy(() => import('./pages/admin/CreateTest'));
const AdminResults = lazy(() => import('./pages/admin/AdminResults'));
const AdminAnnouncements = lazy(() => import('./pages/admin/AdminAnnouncements'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminFeedManagement = lazy(() => import('./pages/admin/AdminFeedManagement'));
const AdminSpotlights = lazy(() => import('./pages/admin/AdminSpotlights'));
const AdminLogs = lazy(() => import('./pages/admin/AdminLogs'));
const AdminGamification = lazy(() => import('./pages/admin/AdminGamification'));
const TestSolving = lazy(() => import('./pages/test/TestSolving'));
const TestReview = lazy(() => import('./pages/test/TestReview'));
const MockExam = lazy(() => import('./pages/test/MockExam'));
const MyResults = lazy(() => import('./pages/student/MyResults'));
const TestResults = lazy(() => import('./pages/student/TestResults'));
const WordBank = lazy(() => import('./pages/student/WordBank'));
const PodcastPlayer = lazy(() => import('./pages/podcasts/PodcastPlayer'));
const AdminPodcasts = lazy(() => import('./pages/admin/AdminPodcasts'));
const CreatePodcast = lazy(() => import('./pages/podcasts/CreatePodcast'));
const KeyManager = lazy(() => import('./pages/admin/KeyManager'));
const SpotifyPodcast = lazy(() => import('./pages/podcasts/SpotifyPodcast'));
const CreateSpotifyPodcast = lazy(() => import('./pages/podcasts/CreateSpotifyPodcast'));
const SpotifyAlbum = lazy(() => import('./pages/podcasts/SpotifyAlbum'));
const SpotifyEpisodeDetails = lazy(() => import('./pages/podcasts/SpotifyEpisodeDetails'));
const SharePodcastRedirect = lazy(() => import('./pages/podcasts/SharePodcastRedirect'));
const StudentStatistics = lazy(() => import('./pages/student/StudentStatistics'));
const StudentAnalytics = lazy(() => import('./pages/student/StudentAnalytics'));
const StudentLeaderboard = lazy(() => import('./pages/student/StudentLeaderboard'));
const SpeakingPractice = lazy(() => import('./pages/test/SpeakingPractice'));
const ArticleReading = lazy(() => import('./pages/articles/ArticleReading'));
const Articles = lazy(() => import('./pages/articles/Articles'));
const AdminArticles = lazy(() => import('./pages/admin/AdminArticles'));
const Podcasts = lazy(() => import('./pages/podcasts/Podcasts'));
const Listening = lazy(() => import('./pages/test/Listening'));
const ListeningFull = lazy(() => import('./pages/test/ListeningFull'));
const ListeningParts = lazy(() => import('./pages/test/ListeningParts'));
const Reading = lazy(() => import('./pages/test/Reading'));
const ReadingFull = lazy(() => import('./pages/test/ReadingFull'));
const ReadingParts = lazy(() => import('./pages/test/ReadingParts'));
const Pricing = lazy(() => import('./pages/public/Pricing'));
const Library = lazy(() => import('./pages/student/Library'));
const MockEntry = lazy(() => import('./pages/student/MockEntry'));
const SpeakingAi = lazy(() => import('./pages/student/SpeakingAi'));
const SpeakingAiUnavailable = lazy(() => import('./pages/student/SpeakingAiUnavailable'));
const MockPurchase = lazy(() => import('./pages/student/MockPurchase'));
const AdminMocks = lazy(() => import('./pages/admin/AdminMocks'));

// LAYOUTS
const TeacherLayout = lazy(() => import('./components/common/TeacherLayout'));
const AdminLayout = lazy(() => import('./components/common/AdminLayout'));

const PageLoading = () => <LoadingScreen />;

function App() {
  const { user, userData, loading, isGuest } = useAuth();

  // ⚠️ Anonim (trial) sessiyada ham `user` to'ldirilgan bo'ladi. Quyidagi
  // ommaviy marshrutlar "kirgan foydalanuvchini dashboard'ga yubor" qoidasiga
  // tayanadi — `isGuest` ni hisobga olmasak, bepul testni yechayotgan mehmon
  // landing yoki register sahifasiga qaytolmay, `/dashboard` ga uloqtirilardi
  // (u yerda esa profili yo'qligi uchun xato ekrani chiqardi).
  const isAuthed = Boolean(user) && !isGuest;

  if (loading) return <PageLoading />;

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <PodcastProvider>
          <ScrollToTop />
          <GlobalPodcastPlayer />
          <Suspense fallback={<PageLoading />}>
            <Toaster 
              position="top-center"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1d1d1f',
                  color: '#fff',
                  borderRadius: '12px',
                  border: '1px solid #333'
                },
              }}
            />
            {/* Yangi spotlight e'loni — istalgan sahifada bir martalik eslatma */}
            {user && <SpotlightToast />}
            <Routes>
            {/* PUBLIC ROUTES */}
            <Route path="/" element={
              isAuthed ? (
                userData?.role === 'admin' ? <Navigate to="/admin" />
                : userData?.role === 'teacher' ? <Navigate to="/teacher" />
                : <Navigate to="/dashboard" />
              ) : <LandingPage />
            } />
            <Route path="/register" element={
              isAuthed ? <Navigate to="/dashboard" /> : <Register />
            } />
            <Route path="/login" element={
              isAuthed ? <Navigate to="/dashboard" /> : <Login />
            } />

            {/* BEPUL TRIAL (mehmonlar uchun — anonim sessiyada ishlaydi) */}
            <Route path="/trial" element={isAuthed ? <Navigate to="/dashboard" /> : <TrialIntro />} />
            <Route path="/trial/result" element={<TrialResult />} />
            <Route path="/trial/:stage" element={<TrialSolving />} />

            {/* SHARED PROTECTED ROUTES */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
            <Route path="/test/:testId" element={<ProtectedRoute><TestSolving /></ProtectedRoute>} />
            <Route path="/review/:id" element={<ProtectedRoute><TestReview /></ProtectedRoute>} />
            <Route path="/statistics" element={<ProtectedRoute><StudentStatistics /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><StudentAnalytics /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><StudentLeaderboard /></ProtectedRoute>} />
            <Route path="/my-results" element={<ProtectedRoute><MyResults /></ProtectedRoute>} />
            <Route path="/vocabulary" element={<ProtectedRoute><WordBank /></ProtectedRoute>} />

            {/* STUDENT SPECIFIC ROUTES */}
            <Route path="/onboarding" element={<ProtectedRoute allowedRoles={['student', 'admin']}><Onboarding /></ProtectedRoute>} />
            <Route path="/practice" element={<ProtectedRoute allowedRoles={['student', 'admin', 'teacher']}><Practice /></ProtectedRoute>} />
            <Route path="/reading" element={<ProtectedRoute allowedRoles={['student', 'admin', 'teacher']}><Reading /></ProtectedRoute>} />
            <Route path="/reading/full" element={<ProtectedRoute allowedRoles={['student', 'admin', 'teacher']}><ReadingFull /></ProtectedRoute>} />
            <Route path="/reading/parts" element={<ProtectedRoute allowedRoles={['student', 'admin', 'teacher']}><ReadingParts /></ProtectedRoute>} />
            <Route path="/listening" element={<ProtectedRoute allowedRoles={['student', 'admin', 'teacher']}><Listening /></ProtectedRoute>} />
            <Route path="/listening/full" element={<ProtectedRoute allowedRoles={['student', 'admin', 'teacher']}><ListeningFull /></ProtectedRoute>} />
            <Route path="/listening/parts" element={<ProtectedRoute allowedRoles={['student', 'admin', 'teacher']}><ListeningParts /></ProtectedRoute>} />
            <Route path="/library" element={<ProtectedRoute allowedRoles={['student', 'admin', 'teacher']}><Library /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute allowedRoles={['student', 'admin', 'teacher']}><Settings /></ProtectedRoute>} />
            <Route path="/mock" element={<ProtectedRoute allowedRoles={['student', 'admin', 'teacher']}><MockEntry /></ProtectedRoute>} />
            <Route path="/mock-buy" element={<ProtectedRoute allowedRoles={['student', 'admin', 'teacher']}><MockPurchase /></ProtectedRoute>} />
            {/* Speaking AI vaqtincha o'chirilgan — flag src/config/features.js da. */}
            <Route path="/speaking-ai" element={<ProtectedRoute allowedRoles={['student', 'admin', 'teacher']}>{FEATURES.speakingAi ? <SpeakingAi /> : <SpeakingAiUnavailable />}</ProtectedRoute>} />
            <Route path="/test-results" element={<ProtectedRoute allowedRoles={['student', 'admin', 'teacher']}><TestResults /></ProtectedRoute>} />
            <Route path="/mock-exam" element={<ProtectedRoute allowedRoles={['student', 'admin', 'teacher']}><MockExam /></ProtectedRoute>} />
            
            {/* CONTENT ROUTES */}
            <Route path="/podcasts" element={<ProtectedRoute><Podcasts /></ProtectedRoute>} />
            <Route path="/podcast/:podcastId" element={<ProtectedRoute><PodcastPlayer /></ProtectedRoute>} />
            <Route path="/share/podcast/:podcastId" element={<ProtectedRoute><SharePodcastRedirect /></ProtectedRoute>} />
            <Route path="/podcast/spotify/:podcastId" element={<ProtectedRoute><SpotifyPodcast /></ProtectedRoute>} />
            <Route path="/podcast/album/:albumId" element={<ProtectedRoute><SpotifyAlbum /></ProtectedRoute>} />
            <Route path="/podcast/episode/:podcastId" element={<ProtectedRoute><SpotifyEpisodeDetails /></ProtectedRoute>} />
            <Route path="/articles" element={<ProtectedRoute><Articles /></ProtectedRoute>} />
            <Route path="/article/:id" element={<ProtectedRoute><ArticleReading /></ProtectedRoute>} />
            <Route path="/speaking-practice" element={<ProtectedRoute><SpeakingPractice /></ProtectedRoute>} />
            <Route path="/pricing" element={<Pricing />} />

            {/* DIAGNOSTIC ROUTES */}
            <Route path="/diagnostic-intro" element={<ProtectedRoute><DiagnosticIntro /></ProtectedRoute>} />
            <Route path="/diagnostic-test/:testId" element={<ProtectedRoute><DiagnosticTestSolving /></ProtectedRoute>} />
            <Route path="/diagnostic-result/:id" element={<ProtectedRoute><DiagnosticResult /></ProtectedRoute>} />

            {/* TEACHER ROUTES */}
            <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherLayout /></ProtectedRoute>}>
              <Route index element={<TeacherDashboard />} />
              <Route path="tests" element={<TeacherTests />} />
              {/* Tayinlash va kuzatish — o'z manzillari bilan: "Orqaga" ro'yxatga
                  qaytaradi va monitoring havolasini ulashsa ham bo'ladi. */}
              <Route path="tests/assign" element={<TeacherAssignTest />} />
              <Route path="tests/monitor/:groupId/:testId" element={<TeacherMonitorTest />} />
              <Route path="writing-review" element={<TeacherWritingReview />} />
              <Route path="speaking-review" element={<TeacherSpeakingReview />} />
              <Route path="create-writing" element={<TeacherCreateWriting />} />
              <Route path="group-stats" element={<TeacherGroupStats />} />
              {/* Davomat ekrani namuna ma'lumot bilan ishlaydi — flag src/config/features.js da. */}
              <Route
                path="group/:groupId"
                element={FEATURES.groupAttendance
                  ? <TeacherGroupDetail />
                  : <Navigate to="/teacher/group-stats" replace />}
              />
              {/* Eski "O'quvchilarni boshqarish" sahifasi guruh sahifasiga birlashtirildi. */}
              <Route path="students" element={<Navigate to="/teacher/group-stats?view=students" replace />} />
              <Route path="results" element={<TeacherAllResults />} />
              <Route path="articles" element={<AdminArticles />} />
              <Route path="browse-articles" element={<Articles />} />
              <Route path="subscription" element={<TeacherSubscription />} />
            </Route>

            {/* ADMIN ROUTES */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="tests" element={<AdminTests />} />
              <Route path="announcements" element={<AdminAnnouncements />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="feed" element={<AdminFeedManagement />} />
              <Route path="spotlights" element={<AdminSpotlights />} />
              <Route path="articles" element={<AdminArticles />} />
              <Route path="create-test" element={<CreateTest />} />
              <Route path="edit-test/:id" element={<CreateTest />} />
              <Route path="results" element={<AdminResults />} />
              <Route path="logs" element={<AdminLogs />} />
              <Route path="gamification" element={<AdminGamification />} />
              <Route path="podcasts" element={<AdminPodcasts />} />
              <Route path="writing-review" element={<TeacherWritingReview />} />
              <Route path="speaking-review" element={<TeacherSpeakingReview />} />
              <Route path="create-podcast" element={<CreatePodcast />} />
              <Route path="edit-podcast/:id" element={<CreatePodcast />} />
              <Route path="create-spotify-podcast" element={<CreateSpotifyPodcast />} />
              <Route path="edit-spotify-podcast/:id" element={<CreateSpotifyPodcast />} />
              <Route path="key-manager" element={<KeyManager />} />
              <Route path="mocks" element={<AdminMocks />} />
              <Route path="trial" element={<AdminTrial />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </PodcastProvider>
    </ThemeProvider>
  </ErrorBoundary>
  );
}

export default App;