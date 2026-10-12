/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { TopNav } from './components/TopNav.tsx';
import { BottomNav } from './components/BottomNav.tsx';
import type { NavTab } from './components/BottomNav.tsx';
import { NotificationsModal } from './components/NotificationsModal.tsx';
import { AuthView } from './views/AuthView.tsx';
import { AlertsView } from './views/AlertsView.tsx';
import { ProjectsView } from './views/ProjectsView.tsx';
import { ProjectDetailView } from './views/ProjectDetailView.tsx';
import { IssuesView } from './views/IssuesView.tsx';
import { WorkloadView } from './views/WorkloadView.tsx';
import { ChatView } from './views/ChatView.tsx';
import { CalendarView } from './views/CalendarView.tsx';
import { UserManagementView } from './views/UserManagementView.tsx';
import { ProfileView } from './views/ProfileView.tsx';
import { SettingsView } from './views/SettingsView.tsx';
import { getSocket } from './lib/socket.ts';
import { apiFetch } from './lib/api.ts';

// Map URL pathnames to NavTab values
const pathToTab: Record<string, NavTab> = {
  '/dashboard': 'alerts',
  '/alerts': 'alerts',
  '/projects': 'projects',
  '/issues': 'issues',
  '/workload': 'workload',
  '/chat': 'chat',
};

const tabToPath: Record<NavTab, string> = {
  alerts: '/dashboard',
  projects: '/projects',
  issues: '/issues',
  workload: '/workload',
  chat: '/chat',
};

// ─── Loading Screen ──────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#FBF9F4] flex flex-col items-center justify-center space-y-4">
      <img
        src="/src/assets/pugarch-logo.png"
        alt="PugArch"
        className="h-16 w-auto object-contain animate-pulse"
        style={{ mixBlendMode: 'multiply' }}
      />
      <p className="font-serif text-sm font-semibold text-[#5A524A] tracking-wide">
        Loading PugArch Projects...
      </p>
    </div>
  );
}

// ─── Route Guards ────────────────────────────────────────────────────────────

// 1. Protected Route: Requires authentication and completed signup
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!currentUser || currentUser.isSignupCompleted === false) {
    // Preserve intended destination path in state
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// 2. HR/CEO Protected Route: Requires CEO executive privileges
function CEOProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, isCEO, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!currentUser || currentUser.isSignupCompleted === false) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isCEO) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// 3. Public Only Route: Redirects already-authenticated users to their dashboard
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (currentUser && currentUser.isSignupCompleted) {
    const destination = (location.state as any)?.from?.pathname || '/dashboard';
    return <Navigate to={destination} replace />;
  }

  return <>{children}</>;
}

// ─── Project Detail Page ─────────────────────────────────────────────────────
function ProjectDetailPage({
  onSelectProject,
  mainScrollRef,
}: {
  onSelectProject: (id: string, tab?: string) => void;
  mainScrollRef: React.RefObject<HTMLElement>;
}) {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const initialTab = (location.state as { initialTab?: string } | null)?.initialTab ?? 'phases';

  const scrollToTop = () => {
    if (mainScrollRef.current) mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!projectId) return <Navigate to="/projects" replace />;

  return (
    <ProjectDetailView
      projectId={projectId}
      initialTab={initialTab}
      onBack={() => {
        navigate('/projects');
        scrollToTop();
      }}
    />
  );
}

// ─── Calendar Page ────────────────────────────────────────────────────────────
function CalendarPage({
  onSelectProject,
  mainScrollRef,
}: {
  onSelectProject: (id: string, tab?: string) => void;
  mainScrollRef: React.RefObject<HTMLElement>;
}) {
  const navigate = useNavigate();
  const scrollToTop = () => {
    if (mainScrollRef.current) mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return (
    <CalendarView
      onSelectProject={(id, tab) => {
        onSelectProject(id, tab);
        navigate(`/projects/${id}`);
        scrollToTop();
      }}
      onBack={() => {
        navigate('/dashboard');
        scrollToTop();
      }}
    />
  );
}

// ─── Authenticated Application Shell ─────────────────────────────────────────
function AuthenticatedLayout() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [alertsBadge, setAlertsBadge] = useState<number>(0);
  const [criticalIssuesBadge, setCriticalIssuesBadge] = useState<number>(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const mainScrollRef = useRef<HTMLElement>(null);

  const scrollToTop = () => {
    if (mainScrollRef.current) mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Derive active bottom tab from current URL
  const currentPath = location.pathname;
  const isProjectDetail = currentPath.startsWith('/projects/');
  const activeTab: NavTab = isProjectDetail
    ? 'projects'
    : pathToTab[currentPath] ?? 'alerts';

  // Fetch unread notifications count
  const fetchNotificationCount = async () => {
    if (!currentUser) return;
    try {
      const res = await apiFetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setUnreadNotificationsCount(data.unreadCount || 0);
      }
    } catch {
      // silent fallback
    }
  };

  useEffect(() => {
    fetchNotificationCount();
    const interval = setInterval(fetchNotificationCount, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Real-time notification updates
  useEffect(() => {
    if (!currentUser) return;
    const socket = getSocket(currentUser.id);
    const handleNewNotification = () => setUnreadNotificationsCount((prev) => prev + 1);
    socket.on('notification:new', handleNewNotification);
    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [currentUser]);

  // Poll badges
  useEffect(() => {
    if (!currentUser) return;
    const fetchBadges = async () => {
      try {
        const res = await apiFetch('/api/alerts');
        if (res.ok) {
          const data = await res.json();
          setAlertsBadge(data.alerts?.length || 0);
          setCriticalIssuesBadge(data.summary?.criticalIssuesCount || 0);
        }
      } catch {
        // silent badge fallback
      }
    };
    fetchBadges();
  }, [currentUser, location.pathname]);

  const handleTabChange = (tab: NavTab) => {
    navigate(tabToPath[tab]);
    scrollToTop();
  };

  const handleSelectProject = (projectId: string, initialTab: string = 'phases') => {
    setIsNotificationsOpen(false);
    navigate(`/projects/${projectId}`, { state: { initialTab } });
    scrollToTop();
  };

  const handleShowCalendar = () => {
    setIsNotificationsOpen(false);
    navigate('/calendar');
    scrollToTop();
  };

  return (
    <div className="h-[100dvh] overflow-hidden sm:h-auto sm:min-h-screen sm:overflow-visible bg-[#FBF9F4] text-[#231E1B] flex flex-col antialiased selection:bg-[#FBECE6] selection:text-[#C85A32]">
      {/* Fixed Top Brand & Auth Bar */}
      <TopNav
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenCalendar={handleShowCalendar}
        unreadCount={unreadNotificationsCount}
      />

      {/* Main Screen Container */}
      <main
        ref={mainScrollRef}
        className="flex-1 w-full overflow-y-auto overflow-x-hidden sm:overflow-visible"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-24 sm:pb-28">
          <Routes>
            {/* Default root redirects to /dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Legacy alias redirect */}
            <Route path="/alerts" element={<Navigate to="/dashboard" replace />} />

            {/* Authenticated Application Routes */}
            <Route
              path="/dashboard"
              element={
                <AlertsView
                  onSelectProject={handleSelectProject}
                  onShowCalendar={handleShowCalendar}
                />
              }
            />
            <Route
              path="/projects"
              element={<ProjectsView onSelectProject={handleSelectProject} />}
            />
            <Route
              path="/projects/:projectId"
              element={
                <ProjectDetailPage
                  onSelectProject={handleSelectProject}
                  mainScrollRef={mainScrollRef}
                />
              }
            />
            <Route
              path="/issues"
              element={<IssuesView onSelectProject={handleSelectProject} />}
            />
            <Route path="/workload" element={<WorkloadView />} />
            <Route path="/chat" element={<ChatView />} />
            <Route
              path="/calendar"
              element={
                <CalendarPage
                  onSelectProject={handleSelectProject}
                  mainScrollRef={mainScrollRef}
                />
              }
            />
            <Route path="/profile" element={<ProfileView />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route
              path="/notifications"
              element={
                <AlertsView
                  onSelectProject={handleSelectProject}
                  onShowCalendar={handleShowCalendar}
                />
              }
            />

            {/* HR/CEO Protected Routes */}
            <Route
              path="/users"
              element={
                <CEOProtectedRoute>
                  <UserManagementView />
                </CEOProtectedRoute>
              }
            />
            <Route
              path="/users/register"
              element={
                <CEOProtectedRoute>
                  <UserManagementView />
                </CEOProtectedRoute>
              }
            />
            <Route
              path="/users/pending"
              element={
                <CEOProtectedRoute>
                  <UserManagementView />
                </CEOProtectedRoute>
              }
            />
            <Route
              path="/users/:id"
              element={
                <CEOProtectedRoute>
                  <UserManagementView />
                </CEOProtectedRoute>
              }
            />

            {/* Fallback to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>

      {/* Fixed Bottom 5-Tab Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        alertsCount={alertsBadge}
        criticalIssuesCount={criticalIssuesBadge}
      />

      {/* Real-time Notifications Drawer */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => {
          setIsNotificationsOpen(false);
          fetchNotificationCount();
        }}
        onSelectProject={handleSelectProject}
      />
    </div>
  );
}

// ─── Main Route Switcher ─────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <AuthView />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicOnlyRoute>
            <AuthView />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicOnlyRoute>
            <AuthView />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <PublicOnlyRoute>
            <AuthView />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/verify-account"
        element={
          <PublicOnlyRoute>
            <AuthView />
          </PublicOnlyRoute>
        }
      />

      {/* Protected Application Workspace */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AuthenticatedLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
