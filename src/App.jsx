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
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AccountCatalog = lazy(() => import('./pages/AccountCatalog'));
const JournalEntries = lazy(() => import('./pages/JournalEntries'));
const NewEntry = lazy(() => import('./pages/NewEntry'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const AdminApprovals = lazy(() => import('./pages/AdminApprovals'));

const CompleteProfile = lazy(() => import('./pages/CompleteProfile'));

// Componente para proteger rutas basadas en estado y rol
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, profile, loading, isActive, isAdmin } = useAuth();

  if (loading) return <div className="loading-screen">Cargando ERP...</div>;
  if (!user) return <Navigate to="/login" replace />;

  // Si es Super Admin, tiene acceso total e inmediato
  if (isAdmin) {
    return children;
  }

  // Caso: Perfil inexistente (ej. usuario nuevo con Google)
  if (!profile) {
    if (window.location.pathname === '/complete-profile') {
      return children;
    }
    return <Navigate to="/complete-profile" replace />;
  }

  // Usuarios normales deben estar activos
  if (!isActive) {
    // Si ya envió solicitud, va a la pantalla de espera
    if (profile.requestedCompany || profile.companyId) {
      if (window.location.pathname === '/pending-approval') {
        return children;
      }
      return <Navigate to="/pending-approval" replace />;
    }
    // Si no tiene nada, debe completar el perfil
    return <Navigate to="/complete-profile" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppContent = () => {
  const { user, profile, isActive, isAdmin, loading } = useAuth();

  return (
    <Suspense fallback={<div className="loading-screen">Cargando...</div>}>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/login" element={!user ? <Login /> : (isAdmin ? <Navigate to="/admin/approvals" replace /> : <Navigate to="/" replace />)} />
        <Route path="/register" element={!user ? <Register /> : (isAdmin ? <Navigate to="/admin/approvals" replace /> : <Navigate to="/" replace />)} />
        <Route path="/complete-profile" element={user ? <CompleteProfile /> : <Navigate to="/login" />} />
        <Route path="/pending-approval" element={
          !user ? <Navigate to="/login" /> : 
          loading ? <div className="loading-screen">Verificando...</div> :
          (isActive || isAdmin) ? <Navigate to="/" /> : 
          <StatusScreen />
        } />

        {/* Rutas Protegidas del ERP (Solo Active + Company) */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/accounts" element={<ProtectedRoute><AccountCatalog /></ProtectedRoute>} />
        <Route path="/entries" element={<ProtectedRoute><JournalEntries /></ProtectedRoute>} />
        <Route path="/new-entry" element={<ProtectedRoute><NewEntry /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

        {/* Rutas de Administración (Solo Super Admin) */}
        <Route path="/admin" element={<Navigate to="/admin/approvals" />} />
        <Route path="/admin/approvals" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminApprovals />
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
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
