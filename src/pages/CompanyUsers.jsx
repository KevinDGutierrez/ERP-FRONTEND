import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Users, Search, Shield, UserCheck, UserX, Clock, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import './CompanyUsers.css';

const CompanyUsers = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const fetchUsers = async () => {
    if (!profile?.companyId) return;
    setLoading(true);
    try {
      const res = await api.get(`/companies/${profile.companyId}/users`);
      setUsers(res.data.users || []);
    } catch (err) {
      console.error('Error fetching company users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [profile?.companyId]);

  const filtered = users.filter(u => {
    const matchSearch = (u.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
                        (u.email || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || u.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusConfig = {
    active: { label: 'Activo', icon: <UserCheck size={14} />, class: 'active' },
    pending: { label: 'Pendiente', icon: <Clock size={14} />, class: 'pending' },
    disabled: { label: 'Deshabilitado', icon: <UserX size={14} />, class: 'disabled' },
    rejected: { label: 'Rechazado', icon: <UserX size={14} />, class: 'rejected' }
  };

  const roleLabels = {
    super_admin: 'Super Admin',
    admin_empresa: 'Administrador',
    contador: 'Contador',
    usuario: 'Usuario'
  };

  return (
    <Layout>
      <div className="company-users-container">
        <header className="page-header-premium">
          <div className="title-section">
            <div className="icon-badge"><Users size={24} /></div>
            <div>
              <h1>Usuarios de la Empresa</h1>
              <p>Gestiona los miembros de tu equipo contable.</p>
            </div>
          </div>
        </header>

        <div className="users-toolbar">
          <div className="search-bar">
            <Search size={18} />
            <input placeholder="Buscar por nombre o correo..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="ALL">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="pending">Pendientes</option>
            <option value="disabled">Deshabilitados</option>
          </select>
        </div>

        {loading ? (
          <div className="loading-state-premium"><div className="loader-ring"></div><p>Cargando usuarios...</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state-premium card">
            <Users size={40} strokeWidth={1.5} />
            <h3>Sin usuarios</h3>
            <p>No se encontraron usuarios con los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="users-table-card card">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Registro</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, idx) => {
                  const st = statusConfig[u.status] || statusConfig.pending;
                  return (
                    <motion.tr
                      key={u.uid}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                    >
                      <td className="user-name-cell">
                        <div className="user-avatar-mini">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt="" />
                          ) : (
                            <span>{(u.displayName || u.email || '?').charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <span className="user-display-name">{u.displayName || '—'}</span>
                      </td>
                      <td className="user-email"><Mail size={14} /> {u.email}</td>
                      <td>
                        <span className="role-badge">
                          <Shield size={12} />
                          {roleLabels[u.role] || u.role || 'Usuario'}
                        </span>
                      </td>
                      <td>
                        <span className={`user-status-badge ${st.class}`}>
                          {st.icon} {st.label}
                        </span>
                      </td>
                      <td className="user-date">
                        {(() => {
                          if (!u.createdAt) return '—';
                          let d;
                          if (u.createdAt._seconds) d = new Date(u.createdAt._seconds * 1000);
                          else if (u.createdAt.seconds) d = new Date(u.createdAt.seconds * 1000);
                          else d = new Date(u.createdAt);
                          return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-GT');
                        })()}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CompanyUsers;
