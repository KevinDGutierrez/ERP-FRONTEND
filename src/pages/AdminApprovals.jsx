import React, { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import api from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, CheckCircle, XCircle, Clock, RefreshCw, Shield, ChevronDown, Building2 } from 'lucide-react';
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
  const [expandedUid, setExpandedUid] = useState(null);

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

  const getCompanyName = (companyId) => {
    if (!companyId) return 'Sin asignar';
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
      setExpandedUid(null);
    } catch (e) {
      console.error('Error approving user:', e);
      alert('Error al aprobar usuario.');
    }
  };

  const handleReject = async (uid) => {
    try {
      await api.post(`/admin/users/${uid}/reject`);
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, status: 'rejected' } : u));
      setExpandedUid(null);
    } catch (e) {
      console.error('Error rejecting user:', e);
      alert('Error al rechazar usuario.');
    }
  };

  const filteredUsers = users.filter(u => filter === 'all' || u.status === filter);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active': return { label: 'Activo', icon: <CheckCircle size={12} />, cls: 'status-active' };
      case 'rejected': return { label: 'Rechazado', icon: <XCircle size={12} />, cls: 'status-rejected' };
      default: return { label: 'Pendiente', icon: <Clock size={12} />, cls: 'status-pending' };
    }
  };

  const roleLabels = { super_admin: 'Super Admin', admin_empresa: 'Administrador', contador: 'Contador', usuario: 'Usuario' };

  const pendingCount = users.filter(u => u.status === 'pending').length;

  return (
    <Layout>
      <div className="approvals-page">
        <header className="approvals-header">
          <div className="header-info">
            <div className="header-icon-wrap">
              <Users size={22} />
            </div>
            <div>
              <h1>Solicitudes de Acceso</h1>
              <p>Gestiona los usuarios y empresas que solicitan unirse al sistema</p>
            </div>
          </div>
          <button className="btn-refresh" onClick={fetchUsers} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Actualizar
          </button>
        </header>

        <div className="approvals-filter-bar">
          {[
            { key: 'pending', label: 'Pendientes', count: users.filter(u => u.status === 'pending').length },
            { key: 'active', label: 'Aprobados', count: users.filter(u => u.status === 'active').length },
            { key: 'rejected', label: 'Rechazados', count: users.filter(u => u.status === 'rejected').length },
            { key: 'all', label: 'Todos', count: users.length },
          ].map(f => (
            <button
              key={f.key}
              className={`filter-tab ${filter === f.key ? 'active' : ''}`}
              onClick={() => { setFilter(f.key); setExpandedUid(null); }}
            >
              {f.label}
              {f.count > 0 && <span className="filter-count">{f.count}</span>}
            </button>
          ))}
        </div>

        <div className="approvals-list-container">
          {loading ? (
            <div className="table-loading">
              <RefreshCw size={20} className="spin" />
              Cargando solicitudes...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="table-empty">
              <Users size={40} />
              <p>No hay solicitudes que coincidan con el filtro</p>
            </div>
          ) : (
            <div className="approvals-list">
              {filteredUsers.map((u) => {
                const badge = getStatusBadge(u.status);
                const isSuperAdmin = u.role === 'super_admin';
                const isExpanded = expandedUid === u.uid;

                return (
                  <div key={u.uid} className={`approval-row ${isExpanded ? 'expanded' : ''}`}>
                    {/* Clickable summary row */}
                    <div
                      className="approval-summary"
                      onClick={() => setExpandedUid(isExpanded ? null : u.uid)}
                    >
                      <div className="user-info-cell">
                        <div className="user-avatar-small">
                          {u.photoURL
                            ? <img src={u.photoURL} alt="" className="avatar-img-sm" />
                            : (u.displayName ? u.displayName[0].toUpperCase() : (u.email ? u.email[0].toUpperCase() : '?'))
                          }
                        </div>
                        <div className="user-info-stack">
                          <span className="user-name">{u.displayName || 'Sin nombre'}</span>
                          <span className="user-email">{u.email}</span>
                        </div>
                      </div>

                      <div className="summary-right">
                        <span className="company-tag">
                          <Building2 size={12} />
                          {getCompanyName(u.companyId)}
                        </span>
                        <span className={`badge ${badge.cls}`}>
                          {badge.icon} {badge.label}
                        </span>
                        <ChevronDown size={16} className={`chevron ${isExpanded ? 'open' : ''}`} />
                      </div>
                    </div>

                    {/* Expandable detail panel */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          className="approval-detail"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="detail-inner">
                            <div className="detail-grid">
                              <div className="detail-field">
                                <span className="detail-label">Empresa Solicitada</span>
                                <span className="detail-value">{u.requestedCompany || getCompanyName(u.companyId)}</span>
                              </div>
                              <div className="detail-field">
                                <span className="detail-label">Método</span>
                                <span className="detail-value provider-badge">
                                  {(u.provider === 'google' || u.provider === 'google.com') ? '🔵 Google' : '📧 Email'}
                                </span>
                              </div>
                              <div className="detail-field">
                                <span className="detail-label">Rol actual</span>
                                <span className="detail-value">
                                  {isSuperAdmin
                                    ? <span className="role-badge-fixed"><Shield size={12} /> Super Admin</span>
                                    : (roleLabels[u.role] || u.role || 'Sin rol')
                                  }
                                </span>
                              </div>
                              <div className="detail-field">
                                <span className="detail-label">Estado</span>
                                <span className={`badge ${badge.cls}`}>{badge.icon} {badge.label}</span>
                              </div>
                            </div>

                            {u.status === 'pending' && (
                              <div className="approval-actions-panel">
                                <div className="action-selectors">
                                  <div className="selector-group">
                                    <label>Asignar empresa</label>
                                    <select
                                      className="admin-select"
                                      value={selectedCompany[u.uid] || u.companyId || ''}
                                      onChange={(e) => setSelectedCompany({ ...selectedCompany, [u.uid]: e.target.value })}
                                    >
                                      <option value="">-- Usar solicitada --</option>
                                      {companies.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="selector-group">
                                    <label>Asignar rol</label>
                                    <select
                                      className="admin-select"
                                      value={selectedRole[u.uid] || 'contador'}
                                      onChange={(e) => setSelectedRole({ ...selectedRole, [u.uid]: e.target.value })}
                                    >
                                      {ROLES.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                <div className="action-btns">
                                  <button className="action-btn action-approve" onClick={() => handleApprove(u.uid)}>
                                    <CheckCircle size={14} /> Aprobar
                                  </button>
                                  <button className="action-btn action-reject" onClick={() => handleReject(u.uid)}>
                                    <XCircle size={14} /> Rechazar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdminApprovals;
