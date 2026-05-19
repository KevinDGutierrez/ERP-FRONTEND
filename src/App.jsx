import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BrandProvider } from './context/BrandContext';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

// Lazy loading pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const StatusScreen = lazy(() => import('./pages/StatusScreen'));
const CompleteProfile = lazy(() => import('./pages/CompleteProfile'));

// ERP Pages (admin_empresa + contador)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AccountCatalog = lazy(() => import('./pages/AccountCatalog'));
const JournalEntries = lazy(() => import('./pages/JournalEntries'));
const NewEntry = lazy(() => import('./pages/NewEntry'));
const Ledger = lazy(() => import('./pages/Ledger'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));

// Admin Pages (super_admin)
const AdminApprovals = lazy(() => import('./pages/AdminApprovals'));
const AdminCompanies = lazy(() => import('./pages/AdminCompanies'));

// Company Admin Pages (admin_empresa)
const CompanyUsers = lazy(() => import('./pages/CompanyUsers'));

/**
 * ProtectedRoute — guards routes based on auth state, profile completion, and role.
 * @param {boolean} requireAdmin - requires super_admin role
 * @param {boolean} requireCompanyAdmin - requires admin_empresa role
 * @param {boolean} requireERP - requires non-super_admin (i.e., admin_empresa or contador)
 */
const ProtectedRoute = ({ children, requireAdmin = false, requireCompanyAdmin = false, requireERP = false }) => {
  const { user, profile, loading, isActive, isAdmin } = useAuth();

  if (loading) return <div className="loading-screen">Cargando ERP...</div>;
  if (!user) return <Navigate to="/login" replace />;

  // Super Admin has immediate access to admin routes only
  if (isAdmin) {
    if (requireERP) {
      return <Navigate to="/admin/approvals" replace />;
    }
    return children;
  }

  // Profile is null = Firestore doc doesn't exist (e.g. first Google login)
  // Redirect to complete-profile so user can select company
  if (profile === null || profile === undefined) {
    if (window.location.pathname === '/complete-profile') return children;
    return <Navigate to="/complete-profile" replace />;
  }

  // Incomplete profile → must complete
  if (!profile.companyId && !profile.requestedCompany) {
    if (window.location.pathname === '/complete-profile') return children;
    return <Navigate to="/complete-profile" replace />;
  }

  // Not active yet → pending approval
  if (!isActive) {
    if (profile.requestedCompany || profile.companyId) {
      if (window.location.pathname === '/pending-approval') return children;
      return <Navigate to="/pending-approval" replace />;
    }
    return <Navigate to="/complete-profile" replace />;
  }

  // Admin-only routes
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // admin_empresa-only routes
  if (requireCompanyAdmin && profile.role !== 'admin_empresa') {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppContent = () => {
  const { user, profile, isActive, isAdmin, loading } = useAuth();

  // Determine default redirect after login based on role
  const getDefaultRoute = () => {
    if (!user) return '/login';
    if (isAdmin) return '/admin/approvals';
    return '/';
  };

  return (
    <Suspense fallback={<div className="loading-screen">Cargando...</div>}>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to={getDefaultRoute()} replace />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to={getDefaultRoute()} replace />} />
        <Route path="/complete-profile" element={user ? <CompleteProfile /> : <Navigate to="/login" />} />
        <Route path="/pending-approval" element={
          !user ? <Navigate to="/login" /> : 
          loading ? <div className="loading-screen">Verificando...</div> :
          (isActive || isAdmin) ? <Navigate to={getDefaultRoute()} /> : 
          <StatusScreen />
        } />

        {/* ── Rutas ERP (admin_empresa + contador) ── */}
        <Route path="/" element={
          <ProtectedRoute requireERP>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/accounts" element={
          <ProtectedRoute requireERP>
            <AccountCatalog />
          </ProtectedRoute>
        } />
        <Route path="/entries" element={
          <ProtectedRoute requireERP>
            <JournalEntries />
          </ProtectedRoute>
        } />
        <Route path="/new-entry" element={
          <ProtectedRoute requireERP>
            <NewEntry />
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute requireERP>
            <Reports />
          </ProtectedRoute>
        } />
        <Route path="/ledger" element={
          <ProtectedRoute requireERP>
            <Ledger />
          </ProtectedRoute>
        } />

        {/* Settings — accessible to all ERP roles, tabs filtered internally by role */}
        <Route path="/settings" element={
          <ProtectedRoute requireERP>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="/company/users" element={
          <ProtectedRoute requireERP requireCompanyAdmin>
            <CompanyUsers />
          </ProtectedRoute>
        } />

        {/* ── Rutas de Super Admin ── */}
        <Route path="/admin" element={<Navigate to="/admin/approvals" />} />
        <Route path="/admin/approvals" element={
          <ProtectedRoute requireAdmin>
            <AdminApprovals />
          </ProtectedRoute>
        } />
        <Route path="/admin/companies" element={
          <ProtectedRoute requireAdmin>
            <AdminCompanies />
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to={isAdmin ? '/admin/approvals' : '/'} />} />
      </Routes>
    </Suspense>
  );
};


function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <BrandProvider>
            <AppContent />
          </BrandProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
