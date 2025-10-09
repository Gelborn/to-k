import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { TagsPage } from './pages/TagsPage';
import { AccountsPage } from './pages/AccountsPage';
import { CustomersPage } from './pages/CustomersPage'
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { Toaster } from 'react-hot-toast';
import TError from './pages/TError';

/* ───────────────────────────── Protected Route ───────────────────────────── */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
};

/* ───────────────────────────── Layout Wrapper ───────────────────────────── */
const AppLayout: React.FC<{ children: React.ReactNode; title: string }> = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  React.useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setSidebarOpen(false); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950 overflow-x-hidden">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 min-w-0">
        <Header title={title} onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

/* ──────────────────────────────── APP MAIN ─────────────────────────────── */
function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* PUBLIC routes */}
          <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
          <Route path="/t-error" element={<TError />} />

          {/* PROTECTED routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout title="Dashboard">
                  <DashboardPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <AppLayout title="Projects">
                  <ProjectsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute>
                <AppLayout title="Project Details">
                  <ProjectDetailPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tags"
            element={
              <ProtectedRoute>
                <AppLayout title="Tags">
                  <TagsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/accounts"
            element={
              <ProtectedRoute>
                <AppLayout title="Accounts">
                  <AccountsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          /*Customers route*/
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <AppLayout title="Customers">
                  <CustomersPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          {/* Catch-all */}
          <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
        </Routes>
      </Router>

      {/* Global toast config */}
      <Toaster
        position="top-right"
        toastOptions={{
          className:
            'rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100',
          style: { padding: '12px 16px' },
          duration: 4000,
          success: {
            iconTheme: { primary: '#10b981', secondary: '#fff' },
            className:
              'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800',
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
            className:
              'bg-rose-50 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800',
          },
        }}
      />
    </ThemeProvider>
  );
}

export default App;
