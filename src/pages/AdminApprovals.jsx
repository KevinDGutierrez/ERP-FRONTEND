import React, { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import api from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import './AdminApprovals.css';

const AdminApprovals = () => {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('pending');
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState({});

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

  const handleApprove = async (uid) => {
    const companyId = selectedCompany[uid] || users.find(u => u.uid === uid)?.companyId;
    if (!companyId && !users.find(u => u.uid === uid)?.requestedCompany) {
      alert('Debes seleccionar o confirmar una empresa.');
      return;
    }
    
    try {
      await api.patch(`/admin/users/${uid}/approve`, { 
        companyId, 
        companyName: companyId ? null : users.find(u => u.uid === uid)?.requestedCompany,
        role: 'usuario' 
      });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, status: 'active', companyId } : u));
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
            <table className="approvals-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Solicitud Empresa</th>
                  <th>Asignar Empresa</th>
                  <th>Método</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode='popLayout'>
                  {filteredUsers.map((u) => {
                    const badge = getStatusBadge(u.status);
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
                          <div className="company-request">
                            <span className="company-name">{u.requestedCompany || 'Existente'}</span>
                          </div>
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
                            <span className="company-assigned">{u.companyId || 'N/A'}</span>
                          )}
                        </td>
                        <td>
                          <span className="provider-badge">{(u.provider === 'google' || u.provider === 'google.com') ? 'Google' : 'Email'}</span>
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
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdminApprovals;
