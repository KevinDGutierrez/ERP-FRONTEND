import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useBrand } from '../../context/BrandContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  LayoutDashboard, 
  BookOpen, 
  PieChart, 
  ShieldCheck,
  PlusCircle,
  History,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Building,
  Users,
  BookOpenCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './Layout.css';

/**
 * Returns the menu items for the sidebar based on the user's role.
 * - super_admin: Only admin panel items
 * - admin_empresa: Full ERP + company users + settings
 * - contador (or any other role): ERP core modules only
 */
const getMenuItems = (role) => {
  if (role === 'super_admin') {
    return [
      { name: 'Solicitudes', icon: <ShieldCheck size={22} />, path: '/admin/approvals' },
      { name: 'Empresas', icon: <Building size={22} />, path: '/admin/companies' },
    ];
  }

  // Base ERP items for contador and admin_empresa
  const items = [
    { name: 'Dashboard', icon: <LayoutDashboard size={22} />, path: '/' },
    { name: 'Catálogo', icon: <BookOpen size={22} />, path: '/accounts' },
    { name: 'Nueva Partida', icon: <PlusCircle size={22} />, path: '/new-entry' },
    { name: 'Libro Diario', icon: <History size={22} />, path: '/entries' },
    { name: 'Libro Mayor', icon: <BookOpenCheck size={22} />, path: '/ledger' },
    { name: 'Reportes', icon: <PieChart size={22} />, path: '/reports' },
  ];

  if (role === 'admin_empresa') {
    items.push(
      { name: 'Usuarios', icon: <Users size={22} />, path: '/company/users' }
    );
  }

  // Settings available for all ERP users (tabs are filtered by role inside Settings.jsx)
  items.push({ name: 'Configuración', icon: <Settings size={22} />, path: '/settings' });

  return items;
};

const getRoleLabel = (role) => {
  const labels = {
    super_admin: 'SUPER ADMIN',
    admin_empresa: 'ADMINISTRADOR',
    contador: 'CONTADOR',
    usuario: 'USUARIO'
  };
  return labels[role] || 'USUARIO';
};

const Layout = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { logout, user, profile, isAdmin } = useAuth();
  const { brand } = useBrand();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const role = profile?.role || 'usuario';
  const menuItems = getMenuItems(role);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="layout-root">
      {/* Sidebar Desktop */}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-icon">
            {brand.logo ? <img src={brand.logo} alt="Logo" /> : <div className="placeholder-mini-logo">SL</div>}
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="brand-name"
              >
                {brand.name}
              </motion.span>
            )}
          </AnimatePresence>
          <button className="collapse-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink 
              key={item.path} 
              to={item.path} 
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <div className="nav-icon">{item.icon}</div>
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="nav-text"
                  >
                    {item.name}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={22} />
            {!isCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Header Mobile */}
      <header className="mobile-header">
        <button onClick={() => setIsMobileMenuOpen(true)}><Menu /></button>
        <span className="mobile-brand">{brand.name}</span>
        <div className="user-avatar">
          {(profile?.photoURL || user?.photoURL) ? (
            <img
              src={profile?.photoURL || user?.photoURL}
              alt="Avatar"
              className="mobile-avatar-img"
              onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.nextSibling.style.display='flex'; }}
            />
          ) : null}
          <span
            className="mobile-avatar-initial"
            style={{ display: (profile?.photoURL || user?.photoURL) ? 'none' : undefined }}
          >
            {user?.email?.charAt(0).toUpperCase()}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <header className="desktop-header">
          <div className="header-left">
            {/* El título se maneja dentro de cada página para mayor flexibilidad */}
          </div>
          
          <div className="header-right">
            <button className="theme-toggle-btn" onClick={toggleTheme} title="Cambiar Tema">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <div className="v-divider"></div>
            
            <div className="user-profile-block">
              <div className="user-details">
                <span className="display-name">{profile?.displayName || user?.displayName || 'Usuario'}</span>
                <span className="user-role">{getRoleLabel(role)}</span>
              </div>
              <div className="avatar-wrapper">
                {(profile?.photoURL || user?.photoURL) ? (
                  <img
                    src={profile?.photoURL || user?.photoURL}
                    alt="Avatar"
                    className="avatar-img"
                    onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.nextSibling.style.display='flex'; }}
                  />
                ) : null}
                <div
                  className="avatar-initials"
                  style={{ display: (profile?.photoURL || user?.photoURL) ? 'none' : undefined }}
                >
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </header>
        <div className="content-inner">
          {children}
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            className="mobile-menu-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.div 
              className="mobile-menu"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Contenido del menú móvil similar al sidebar */}
              <div className="mobile-menu-header">
                  <div className="brand-section">
                    <div className="brand-icon">
                      {brand.logo ? <img src={brand.logo} alt="Logo" /> : <div className="placeholder-mini-logo">SL</div>}
                    </div>
                    <span className="brand-name">{brand.name}</span>
                  </div>
                  <button className="theme-toggle-btn mobile-theme-btn" onClick={toggleTheme}>
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                  </button>
              </div>
              <nav className="sidebar-nav mobile-nav">
                {menuItems.map((item) => (
                  <NavLink 
                    key={item.path} 
                    to={item.path} 
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="nav-icon">{item.icon}</div>
                    <span className="nav-text">{item.name}</span>
                  </NavLink>
                ))}
              </nav>
              <div className="mobile-menu-footer">
                <button className="logout-btn" onClick={handleLogout}>
                  <LogOut size={22} />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Layout;
