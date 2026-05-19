import React, { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import api from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, CheckCircle, XCircle, Clock, RefreshCw, Shield } from 'lucide-react';
import './AdminApprovals.css';

const ROLES = [
  { value: 'contador', label: 'Contador' },
  { value: 'admin_empresa', label: 'Administrador' },
];

const AdminApprovals = () => {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('pending');
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState({});
  const [selectedRole, setSelectedRole] = useState({});

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.users || []);
    } catch (e) {
      console.error('Error fetching users:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/companies');
      setCompanies(res.data.companies || []);
    } catch (e) {
      console.error('Error fetching companies:', e);
    }
  };

  useEffect(() => { 
    fetchUsers(); 
    fetchCompanies();
  }, []);

  // Helper: resolve companyId to company name
  const getCompanyName = (companyId) => {
    if (!companyId || companyId === 'master_company') return '—';
    const found = companies.find(c => c.id === companyId);
    return found ? found.name : companyId;
  };

  const handleApprove = async (uid) => {
    const companyId = selectedCompany[uid] || users.find(u => u.uid === uid)?.companyId;
    const role = selectedRole[uid] || 'contador';
    if (!companyId && !users.find(u => u.uid === uid)?.requestedCompany) {
      alert('Debes seleccionar o confirmar una empresa.');
      return;
    }
    
    try {
      await api.patch(`/admin/users/${uid}/approve`, { 
        companyId, 
        companyName: companyId ? null : users.find(u => u.uid === uid)?.requestedCompany,
        role
      });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, status: 'active', companyId, role } : u));
    } catch (e) {
      console.error('Error approving user:', e);
      alert('Error al aprobar usuario.');
    }
  };

  const handleReject = async (uid) => {
    try {
      await api.post(`/admin/users/${uid}/reject`);
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, status: 'rejected' } : u));
    } catch (e) {
      console.error('Error rejecting user:', e);
      alert('Error al rechazar usuario.');
    }
  };

  const filteredUsers = users.filter(u => filter === 'all' || u.status === filter);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active': return { label: 'Activo', icon: <CheckCircle size={12} />, class: 'status-active' };
      case 'rejected': return { label: 'Rechazado', icon: <XCircle size={12} />, class: 'status-rejected' };
      default: return { label: 'Pendiente', icon: <Clock size={12} />, class: 'status-pending' };
    }
  };

  const roleLabels = { super_admin: 'Super Admin', admin_empresa: 'Administrador', contador: 'Contador', usuario: 'Usuario' };

  return (
    <Layout>
      <div className="approvals-page">
        <header className="approvals-header">
          <div className="header-info">
            <Users size={24} className="header-icon" />
            <div>
              <h1>Solicitudes de Acceso</h1>
              <p>Gestiona los usuarios y empresas que solicitan unirse al sistema</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn-refresh" onClick={fetchUsers} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'spin' : ''} /> Actualizar
            </button>
          </div>
        </header>

        <div className="approvals-filter-bar">
          <button className={`filter-tab ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>
            Pendientes
          </button>
          <button className={`filter-tab ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>
            Aprobados
          </button>
          <button className={`filter-tab ${filter === 'rejected' ? 'active' : ''}`} onClick={() => setFilter('rejected')}>
            Rechazados
          </button>
          <button className={`filter-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            Todos
          </button>
        </div>

        <div className="approvals-table-container">
          {loading ? (
            <div className="table-loading">Cargando solicitudes...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="table-empty">No hay solicitudes que coincidan con el filtro</div>
          ) : (
            <>
              {/* Desktop Table */}
              <table className="approvals-table desktop-only">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Solicitud Empresa</th>
                    <th>Asignar Empresa</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode='popLayout'>
                    {filteredUsers.map((u) => {
                      const badge = getStatusBadge(u.status);
                      const isSuperAdmin = u.role === 'super_admin';
                      return (
                        <motion.tr
                          key={u.uid}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <td>
                            <div className="user-info-cell">
                              <div className="user-avatar-small">
                                {u.displayName ? u.displayName[0].toUpperCase() : (u.email ? u.email[0].toUpperCase() : '?')}
                              </div>
                              <div className="user-info-stack">
                                <span className="user-name">{u.displayName || 'Sin nombre'}</span>
                                <span className="user-email">{u.email}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="company-name">{u.requestedCompany || 'Existente'}</span>
                          </td>
                          <td>
                            {u.status === 'pending' ? (
                              <select 
                                className="admin-select"
                                value={selectedCompany[u.uid] || u.companyId || ''}
                                onChange={(e) => setSelectedCompany({ ...selectedCompany, [u.uid]: e.target.value })}
                              >
                                <option value="">-- Usar Solicitada --</option>
                                {companies.map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="company-assigned">{getCompanyName(u.companyId)}</span>
                            )}
                          </td>
                          <td>
                            {isSuperAdmin ? (
                              <span className="role-badge-fixed"><Shield size={12} /> Super Admin</span>
                            ) : u.status === 'pending' ? (
                              <select
                                className="admin-select"
                                value={selectedRole[u.uid] || 'contador'}
                                onChange={(e) => setSelectedRole({ ...selectedRole, [u.uid]: e.target.value })}
                              >
                                {ROLES.map(r => (
                                  <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="role-badge-fixed">{roleLabels[u.role] || u.role}</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${badge.class}`}>
                              {badge.icon} {badge.label}
                            </span>
                          </td>
                          <td>
                            <div className="action-btns">
                              {u.status === 'pending' && (
                                <>
                                  <button className="action-btn action-approve" onClick={() => handleApprove(u.uid)}>
                                    <CheckCircle size={14} /> Aprobar
                                  </button>
                                  <button className="action-btn action-reject" onClick={() => handleReject(u.uid)}>
                                    <XCircle size={14} /> Rechazar
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>

              {/* Mobile Cards */}
              <div className="approvals-cards mobile-only">
                {filteredUsers.map((u) => {
                  const badge = getStatusBadge(u.status);
                  const isSuperAdmin = u.role === 'super_admin';
                  return (
                    <div key={u.uid} className="approval-card card">
                      <div className="approval-card-top">
                        <div className="user-info-cell">
                          <div className="user-avatar-small">
                            {u.displayName ? u.displayName[0].toUpperCase() : (u.email ? u.email[0].toUpperCase() : '?')}
                          </div>
                          <div className="user-info-stack">
                            <span className="user-name">{u.displayName || 'Sin nombre'}</span>
                            <span className="user-email">{u.email}</span>
                          </div>
                        </div>
                        <span className={`badge ${badge.class}`}>{badge.icon} {badge.label}</span>
                      </div>

                      <div className="approval-card-fields">
                        <div className="field-row">
                          <span className="field-label">Empresa solicitada</span>
                          <span>{u.requestedCompany || 'Existente'}</span>
                        </div>
                        <div className="field-row">
                          <span className="field-label">Asignar empresa</span>
                          {u.status === 'pending' ? (
                            <select
                              className="admin-select"
                              value={selectedCompany[u.uid] || u.companyId || ''}
                              onChange={(e) => setSelectedCompany({ ...selectedCompany, [u.uid]: e.target.value })}
                            >
                              <option value="">-- Usar Solicitada --</option>
                              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          ) : (
                            <span>{getCompanyName(u.companyId)}</span>
                          )}
                        </div>
                        <div className="field-row">
                          <span className="field-label">Rol</span>
                          {isSuperAdmin ? (
                            <span className="role-badge-fixed"><Shield size={12} /> Super Admin</span>
                          ) : u.status === 'pending' ? (
                            <select
                              className="admin-select"
                              value={selectedRole[u.uid] || 'contador'}
                              onChange={(e) => setSelectedRole({ ...selectedRole, [u.uid]: e.target.value })}
                            >
                              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                          ) : (
                            <span>{roleLabels[u.role] || u.role}</span>
                          )}
                        </div>
                      </div>

                      {u.status === 'pending' && (
                        <div className="approval-card-actions">
                          <button className="action-btn action-approve" onClick={() => handleApprove(u.uid)}>
                            <CheckCircle size={14} /> Aprobar
                          </button>
                          <button className="action-btn action-reject" onClick={() => handleReject(u.uid)}>
                            <XCircle size={14} /> Rechazar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdminApprovals;
