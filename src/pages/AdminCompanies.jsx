import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import Modal from '../components/common/Modal';
import api from '../api/client';
import { Building, Plus, Search, Edit2, Power, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import './AdminCompanies.css';

const AdminCompanies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [form, setForm] = useState({
    name: '', legalName: '', nit: '', email: '', phone: ''
  });

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await api.get('/companies/all');
      setCompanies(res.data.companies || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCompanies(); }, []);

  const openCreate = () => {
    setEditingCompany(null);
    setForm({ name: '', legalName: '', nit: '', email: '', phone: '' });
    setError(null);
    setSuccess(null);
    setModalOpen(true);
  };

  const openEdit = (company) => {
    setEditingCompany(company);
    setForm({
      name: company.name || '',
      legalName: company.legalName || '',
      nit: company.nit || '',
      email: company.email || '',
      phone: company.phone || ''
    });
    setError(null);
    setSuccess(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    try {
      if (editingCompany) {
        await api.patch(`/companies/${editingCompany.id}`, form);
        setSuccess('Empresa actualizada');
      } else {
        await api.post('/companies', form);
        setSuccess('Empresa creada');
      }
      setTimeout(() => { setModalOpen(false); setSuccess(null); fetchCompanies(); }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar');
    } finally {
      setFormLoading(false);
    }
  };

  const toggleStatus = async (company) => {
    try {
      const newStatus = company.status === 'active' ? 'inactive' : 'active';
      await api.patch(`/companies/${company.id}`, { status: newStatus });
      fetchCompanies();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = companies.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.nit || '').includes(search) ||
    (c.legalName || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="admin-companies-container">
        <header className="page-header-premium">
          <div className="title-section">
            <div className="icon-badge"><Building size={24} /></div>
            <div>
              <h1>Empresas</h1>
              <p>Administra las empresas registradas en la plataforma.</p>
            </div>
          </div>
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={20} />
            <span>Nueva Empresa</span>
          </button>
        </header>

        <div className="companies-toolbar">
          <div className="search-bar">
            <Search size={18} />
            <input placeholder="Buscar por nombre, NIT o razón social..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="company-count">{filtered.length} empresa{filtered.length !== 1 ? 's' : ''}</div>
        </div>

        {loading ? (
          <div className="loading-state-premium"><div className="loader-ring"></div><p>Cargando empresas...</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state-premium card">
            <Building size={40} strokeWidth={1.5} />
            <h3>Sin empresas</h3>
            <p>No se encontraron empresas. Crea una nueva para comenzar.</p>
          </div>
        ) : (
          <div className="companies-grid">
            {filtered.map((company, idx) => (
              <motion.div
                key={company.id}
                className="company-card card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <div className="company-card-header">
                  <div className="company-name-group">
                    <h3>{company.name}</h3>
                    {company.legalName && <span className="legal-name">{company.legalName}</span>}
                  </div>
                  <span className={`status-dot ${company.status === 'active' ? 'active' : 'inactive'}`}>
                    {company.status === 'active' ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                <div className="company-details-grid">
                  {company.nit && <div className="detail-item"><span className="detail-label">NIT</span><span>{company.nit}</span></div>}
                  {company.email && <div className="detail-item"><span className="detail-label">Correo</span><span>{company.email}</span></div>}
                  {company.phone && <div className="detail-item"><span className="detail-label">Teléfono</span><span>{company.phone}</span></div>}
                  <div className="detail-item">
                    <span className="detail-label">Creada</span>
                    <span>{company.createdAt
                      ? new Date(company.createdAt.seconds ? company.createdAt.seconds * 1000 : company.createdAt).toLocaleDateString('es-GT')
                      : '—'}</span>
                  </div>
                </div>
                <div className="company-card-actions">
                  <button className="btn-glass-sm" onClick={() => openEdit(company)} title="Editar">
                    <Edit2 size={16} />
                  </button>
                  <button
                    className={`btn-glass-sm ${company.status === 'active' ? 'warn' : 'success'}`}
                    onClick={() => toggleStatus(company)}
                    title={company.status === 'active' ? 'Desactivar' : 'Activar'}
                  >
                    <Power size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingCompany ? 'Editar Empresa' : 'Nueva Empresa'}>
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre Comercial *</label>
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="Ej: Street Studio" />
          </div>
          <div className="form-group">
            <label>Razón Social</label>
            <input type="text" value={form.legalName} onChange={e => setForm({...form, legalName: e.target.value})} placeholder="Ej: Street Studio S.A." />
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label>NIT</label>
              <input type="text" value={form.nit} onChange={e => setForm({...form, nit: e.target.value})} placeholder="123456-7" />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+502 ..." />
            </div>
          </div>
          <div className="form-group">
            <label>Correo</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="admin@empresa.com" />
          </div>

          {error && <div className="alert error"><AlertTriangle size={18} />{error}</div>}
          {success && <div className="alert success"><CheckCircle2 size={18} />{success}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)} disabled={formLoading}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={formLoading}>
              {formLoading ? 'Guardando...' : editingCompany ? 'Actualizar' : 'Crear Empresa'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};

export default AdminCompanies;
