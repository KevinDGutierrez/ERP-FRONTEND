import React from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Clock, XCircle, LogOut } from 'lucide-react';
import './StatusScreen.css';

const StatusScreen = () => {
  const { profile, logout } = useAuth();
  const status = profile?.status || 'pending';

  const config = {
    pending: {
      icon: <Clock size={40} />,
      iconClass: 'status-icon-pending',
      title: 'Acceso pendiente',
      message: 'Tu solicitud está siendo revisada por el equipo administrativo. Recibirás acceso una vez que sea aprobada.',
      tag: 'EN REVISIÓN',
    },
    rejected: {
      icon: <XCircle size={40} />,
      iconClass: 'status-icon-rejected',
      title: 'Acceso rechazado',
      message: 'Tu solicitud de acceso no fue aprobada. Contacta al administrador si crees que esto es un error.',
      tag: 'RECHAZADO',
    },
  };

  const current = config[status] || config.pending;

  return (
    <div className="status-page">
      <div className="status-bg" aria-hidden>
        <div className="status-orb" />
      </div>

      <motion.div
        className="status-card"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={`status-icon-wrap ${current.iconClass}`}>
          {current.icon}
        </div>

        <span className="status-tag">{current.tag}</span>
        <h1 className="status-title">{current.title}</h1>
        <p className="status-message">{current.message}</p>

        <div className="status-footer">
          {profile?.email && (
            <div className="status-user-info">
              <div className="user-avatar-mini">
                {profile.displayName?.charAt(0) || profile.email.charAt(0).toUpperCase()}
              </div>
              <span className="user-email-text">{profile.email}</span>
            </div>
          )}

          <button className="status-logout-btn" onClick={logout} title="Cerrar sesión">
            <LogOut size={16} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default StatusScreen;
