import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { FirstLoginResetPage } from './pages/FirstLoginResetPage';
import { DashboardPage } from './pages/DashboardPage';
import { RequestsListPage } from './pages/RequestsListPage';
import { RequestFormPage } from './pages/RequestFormPage';
import { RequestDetailPage } from './pages/RequestDetailPage';
import { SettlementsPendingPage } from './pages/SettlementsPendingPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { SettingsPage } from './pages/SettingsPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { FundManagementPage } from './pages/FundManagementPage';
import { AuditTrailPage } from './pages/AuditTrailPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

// Route Protection Helper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Force first-login password reset
  if (user?.resetPasswordRequired && window.location.pathname !== '/first-login-reset') {
    return <Navigate to="/first-login-reset" replace />;
  }

  return <>{children}</>;
};


// Accountant Protection Helper
const AccountantRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (user?.role !== 'ACCOUNTANT' && user?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

// Approval Two access - can access approval and report pages
const ApprovalTwoRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (user?.role !== 'ACCOUNTANT' && user?.role !== 'SUPER_ADMIN' && user?.role !== 'APPROVAL_TWO') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* First login force password change */}
            <Route 
              path="/first-login-reset" 
              element={
                <ProtectedRoute>
                  <FirstLoginResetPage />
                </ProtectedRoute>
              } 
            />

            {/* Authenticated Dashboard Panel Wrapper */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              {/* Nested Child Views */}
              <Route index element={<DashboardPage />} />
              <Route path="requests" element={<RequestsListPage />} />
              <Route path="requests/new" element={<RequestFormPage />} />
              <Route path="requests/edit/:id" element={<RequestFormPage />} />
              <Route path="requests/:id" element={<RequestDetailPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              
              {/* Settlement Audits - Accountant/Admin only */}
              <Route
                path="settlements/pending"
                element={
                  <AccountantRoute>
                    <SettlementsPendingPage />
                  </AccountantRoute>
                }
              />

              {/* Audit Trail - Accountant/Admin only */}
              <Route
                path="audit-trail"
                element={
                  <AccountantRoute>
                    <AuditTrailPage />
                  </AccountantRoute>
                }
              />
              
              {/* Accountant or Admin */}
              <Route 
                path="funds" 
                element={
                  <AccountantRoute>
                    <FundManagementPage />
                  </AccountantRoute>
                } 
              />
              <Route 
                path="settings" 
                element={
                  <AccountantRoute>
                    <SettingsPage />
                  </AccountantRoute>
                } 
              />
              <Route 
                path="reports" 
                element={<Navigate to="/transactions" replace />} 
              />
              <Route 
                path="payments" 
                element={
                  <ApprovalTwoRoute>
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <PaymentsPage />
                    </React.Suspense>
                  </ApprovalTwoRoute>
                }
              />
              
              {/* Super Admin & Accountant */}
              <Route 
                path="users" 
                element={
                  <AccountantRoute>
                    <UserManagementPage />
                  </AccountantRoute>
                } 
              />
            </Route>


            {/* Catch-all Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
