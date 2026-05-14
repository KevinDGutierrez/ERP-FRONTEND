import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import Modal from '../components/common/Modal';
import api from '../api/client';
import { Search, Plus, Filter, ArrowUpDown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import './AccountCatalog.css';

const AccountCatalog = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [newAccount, setNewAccount] = useState({
    parentId: '',
    name: '',
    type: 'ACTIVO',
    nature: 'DEUDORA'
  });

  // Filter State
  const [activeFilters, setActiveFilters] = useState({
    type: 'ALL',
    nature: 'ALL'
  });

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/accounts');
      setAccounts(response.data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    try {
      await api.post('/accounts', newAccount);
      setSuccess(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccess(false);
        fetchAccounts();
        setNewAccount({
          parentId: '',
          name: '',
          type: 'ACTIVO',
          nature: 'DEUDORA'
        });
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear la cuenta');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredAccounts = accounts.filter(acc => {
    // Defensive checks to prevent crashes if data is missing
    const name = acc.name || '';
    const code = acc.code || '';
    const type = acc.type || '';
    const nature = acc.nature || '';

    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         code.includes(searchTerm);
    
    // Support both singular and plural (e.g., INGRESO vs INGRESOS) and case-insensitive matching
    const matchesType = activeFilters.type === 'ALL' || 
                        type.toUpperCase() === activeFilters.type ||
                        (activeFilters.type === 'INGRESOS' && type.toUpperCase() === 'INGRESO') ||
                        (activeFilters.type === 'COSTOS' && type.toUpperCase() === 'COSTO') ||
                        (activeFilters.type === 'GASTOS' && type.toUpperCase() === 'GASTO');

    const matchesNature = activeFilters.nature === 'ALL' || 
                          nature.toUpperCase() === activeFilters.nature;
    
    return matchesSearch && matchesType && matchesNature;
  });

  // Filter potential parent accounts based on selected type
  const potentialParents = accounts.filter(acc => {
    const accountType = (acc.type || '').toUpperCase().replace(/S$/, '');
    const selectedType = newAccount.type.toUpperCase().replace(/S$/, '');
    return accountType === selectedType;
  });

  return (
    <Layout>
      <div className="catalog-container">
        <header className="page-header">
          <div>
            <h1>Catálogo de Cuentas</h1>
            <p>Gestiona el plan de cuentas de la empresa.</p>
          </div>
          <button className="add-btn" onClick={() => setIsModalOpen(true)}>
            <Plus size={20} />
            Nueva Cuenta
          </button>
        </header>

        <div className="table-controls">
          <div className="search-bar">
            <Search size={18} />
            <input 
              placeholder="Buscar por nombre o código..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-wrapper">
            <button 
              className={`filter-btn ${isFilterOpen ? 'active' : ''}`}
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <Filter size={18} />
              Filtros
              {(activeFilters.type !== 'ALL' || activeFilters.nature !== 'ALL') && (
                <span className="filter-badge"></span>
              )}
            </button>

            {isFilterOpen && (
              <div className="filter-dropdown animate-slide-up">
                <div className="filter-section">
                  <label>Tipo de Cuenta</label>
                  <select 
                    value={activeFilters.type}
                    onChange={(e) => setActiveFilters({...activeFilters, type: e.target.value})}
                  >
                    <option value="ALL">Todos los tipos</option>
                    <option value="ACTIVO">Activo</option>
                    <option value="PASIVO">Pasivo</option>
                    <option value="PATRIMONIO">Patrimonio</option>
                    <option value="INGRESOS">Ingresos</option>
                    <option value="COSTOS">Costos</option>
                    <option value="GASTOS">Gastos</option>
                  </select>
                </div>
                <div className="filter-section">
                  <label>Naturaleza</label>
                  <select 
                    value={activeFilters.nature}
                    onChange={(e) => setActiveFilters({...activeFilters, nature: e.target.value})}
                  >
                    <option value="ALL">Todas</option>
                    <option value="DEUDORA">Deudora</option>
                    <option value="ACREEDORA">Acreedora</option>
                  </select>
                </div>
                <button 
                  className="clear-filters"
                  onClick={() => setActiveFilters({type: 'ALL', nature: 'ALL'})}
                >
                  Limpiar Filtros
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="table-card">
          {loading ? (
            <div className="table-loading">
              <div className="spinner"></div>
              Cargando catálogo...
            </div>
          ) : (
            <div className="table-scroll-container">
              <table className="account-table">
                <thead>
                  <tr>
                    <th>Código <ArrowUpDown size={14} /></th>
                    <th>Nombre de la Cuenta</th>
                    <th>Tipo</th>
                    <th>Naturaleza</th>
                    <th>Saldo Actual</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.length > 0 ? (
                    filteredAccounts.map(account => (
                      <tr key={account.id}>
                        <td className="code-cell">{account.code}</td>
                        <td className="name-cell">{account.name}</td>
                        <td>
                          <span className={`badge ${(account.type || '').toLowerCase().replace(/s$/, '')}`}>
                            {account.type}
                          </span>
                        </td>
                        <td>{account.nature}</td>
                        <td className="amount-cell">Q{(account.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td>
                          <button className="action-link">Ver Mayor</button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="empty-table">
                        No se encontraron cuentas con los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Nueva Cuenta Contable"
      >
        <form className="modal-form" onSubmit={handleCreateAccount}>
          <div className="form-group">
            <label>Cuenta Superior (Padre)</label>
            <select 
              value={newAccount.parentId}
              onChange={e => {
                const pId = e.target.value;
                const parent = accounts.find(a => a.id === pId);
                if (parent) {
                  setNewAccount({
                    ...newAccount,
                    parentId: pId,
                    type: parent.type,
                    nature: parent.nature
                  });
                } else {
                  setNewAccount({
                    ...newAccount,
                    parentId: pId
                  });
                }
              }}
            >
              <option value="">-- Sin cuenta superior (Raíz) --</option>
              {potentialParents.map(parent => (
                <option key={parent.id} value={parent.id}>
                  {parent.code} - {parent.name}
                </option>
              ))}
            </select>
            <small style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>
              El código se generará automáticamente según la cuenta seleccionada.
            </small>
          </div>
          <div className="form-group">
            <label>Nombre de la Cuenta</label>
            <input 
              type="text" 
              placeholder="Ej: Caja General" 
              value={newAccount.name}
              onChange={e => setNewAccount({...newAccount, name: e.target.value})}
              required
            />
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label>Tipo</label>
              <select 
                value={newAccount.type}
                onChange={e => setNewAccount({...newAccount, type: e.target.value})}
                disabled={!!newAccount.parentId}
              >
                <option value="ACTIVO">Activo</option>
                <option value="PASIVO">Pasivo</option>
                <option value="PATRIMONIO">Patrimonio</option>
                <option value="INGRESOS">Ingresos</option>
                <option value="COSTOS">Costos</option>
                <option value="GASTOS">Gastos</option>
              </select>
            </div>
            <div className="form-group">
              <label>Naturaleza</label>
              <select 
                value={newAccount.nature}
                onChange={e => setNewAccount({...newAccount, nature: e.target.value})}
                disabled={!!newAccount.parentId}
              >
                <option value="DEUDORA">Deudora</option>
                <option value="ACREEDORA">Acreedora</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="alert error">
              <AlertTriangle size={18} />
              {error}
            </div>
          )}

          {success && (
            <div className="alert success">
              <CheckCircle2 size={18} />
              Cuenta creada correctamente
            </div>
          )}

          <div className="modal-actions">
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={() => setIsModalOpen(false)}
              disabled={formLoading}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={formLoading}
            >
              {formLoading ? 'Guardando...' : 'Crear Cuenta'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};

export default AccountCatalog;

