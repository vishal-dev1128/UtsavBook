import { QueryClientProvider } from '@tanstack/react-query';
import React, { useLayoutEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MandalProvider, useMandal } from './context/MandalContext';
import { queryClient } from './lib/queryClient';
import { AlertsPage } from './pages/AlertsPage';
import { EntriesPage } from './pages/EntriesPage';
import { EventsPage } from './pages/EventsPage';
import { ExpensePage } from './pages/ExpensePage';
import { GoodsPage } from './pages/GoodsPage';
import { HomePage } from './pages/HomePage';
import { IncomePage } from './pages/IncomePage';
import { LoginPage } from './pages/LoginPage';
import { MandalHubPage } from './pages/MandalHubPage';
import { NakashaPage } from './pages/NakashaPage';
import { PublicTransparencyPage, PublicVerifyPage } from './pages/PublicPages';
import { ReportsPage } from './pages/ReportsPage';
import { VendorsPage } from './pages/VendorsPage';
import { MandalAuditPage } from './pages/mandal/MandalAuditPage';
import { MandalCreditsPage } from './pages/mandal/MandalCreditsPage';
import { MandalDetailsPage } from './pages/mandal/MandalDetailsPage';
import { MandalDocumentsPage } from './pages/mandal/MandalDocumentsPage';
import {
  MandalContactsPage,
  MandalFeaturesPage,
  MandalHelpPage,
} from './pages/mandal/MandalInfoPages';
import { MandalMembersPage } from './pages/mandal/MandalMembersPage';
import { MandalSettingsPage } from './pages/mandal/MandalSettingsPage';
import { MandalUtsavsPage } from './pages/mandal/MandalUtsavsPage';

function LoadingSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-[#F5F7FB] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-3">
        <div className="h-36 rounded-3xl bg-blue-100/70 animate-pulse" />
        <div className="h-24 rounded-2xl bg-white border border-slate-200 animate-pulse" />
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authReady, dataLoading, user, mandal, needsOnboarding } = useMandal();

  if (!authReady || (user && dataLoading)) {
    return <LoadingSkeleton />;
  }

  if (!user || needsOnboarding || !mandal) {
    return <Navigate to="/login" replace />;
  }

  return <AppShell>{children}</AppShell>;
}

function RootRedirect() {
  const { authReady, dataLoading, user, mandal, needsOnboarding } = useMandal();
  if (!authReady || (user && dataLoading)) {
    return <LoadingSkeleton />;
  }
  if (user && mandal && !needsOnboarding) {
    return <Navigate to="/home" replace />;
  }
  return <Navigate to="/login" replace />;
}

function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useLayoutEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView();
        return;
      }
    }

    const resetScroll = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const rootEl = document.getElementById('root');
      if (rootEl) rootEl.scrollTop = 0;
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.scrollTop = 0;
    };

    resetScroll();
    const rafId = window.requestAnimationFrame(resetScroll);
    return () => window.cancelAnimationFrame(rafId);
  }, [pathname, search, hash]);

  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MandalProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/join/:code" element={<LoginPage />} />

              {/* Public / Owner-Scoped Verification & Transparency Pages */}
              <Route path="/verify/:id" element={<PublicVerifyPage />} />
              <Route path="/m/:code" element={<PublicTransparencyPage />} />
              <Route path="/public" element={<PublicTransparencyPage />} />
              <Route path="/public/:code" element={<PublicTransparencyPage />} />

              {/* Authenticated MandalBook App Screens */}
              <Route
                path="/home"
                element={
                  <ProtectedRoute>
                    <HomePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/entries"
                element={
                  <ProtectedRoute>
                    <EntriesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/alerts"
                element={
                  <ProtectedRoute>
                    <AlertsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mandal"
                element={
                  <ProtectedRoute>
                    <MandalHubPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mandal/details"
                element={
                  <ProtectedRoute>
                    <MandalDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mandal/members"
                element={
                  <ProtectedRoute>
                    <MandalMembersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mandal/utsavs"
                element={
                  <ProtectedRoute>
                    <MandalUtsavsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mandal/documents"
                element={
                  <ProtectedRoute>
                    <MandalDocumentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mandal/audit"
                element={
                  <ProtectedRoute>
                    <MandalAuditPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mandal/credits"
                element={
                  <ProtectedRoute>
                    <MandalCreditsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mandal/settings"
                element={
                  <ProtectedRoute>
                    <MandalSettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mandal/features"
                element={
                  <ProtectedRoute>
                    <MandalFeaturesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mandal/contacts"
                element={
                  <ProtectedRoute>
                    <MandalContactsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mandal/help"
                element={
                  <ProtectedRoute>
                    <MandalHelpPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/income"
                element={
                  <ProtectedRoute>
                    <IncomePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/expense"
                element={
                  <ProtectedRoute>
                    <ExpensePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/goods"
                element={
                  <ProtectedRoute>
                    <GoodsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/nakasha"
                element={
                  <ProtectedRoute>
                    <NakashaPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events"
                element={
                  <ProtectedRoute>
                    <EventsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendors"
                element={
                  <ProtectedRoute>
                    <VendorsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </MandalProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
