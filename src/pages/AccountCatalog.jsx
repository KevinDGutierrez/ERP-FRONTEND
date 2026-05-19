import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import Modal from '../components/common/Modal';
import api from '../api/client';
import { Search, Plus, Filter, ArrowUpDown, AlertTriangle, CheckCircle2, BookOpen, X, Download } from 'lucide-react';
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

  // Ledger Modal State
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerData, setLedgerData] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  
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

  const handleViewLedger = async (account) => {
    setSelectedAccount(account);
    setLedgerOpen(true);
    setLedgerLoading(true);
    setLedgerError(null);
    setLedgerData(null);
    try {
      const response = await api.get(`/entries/ledger?accountId=${account.id}`);
      setLedgerData(response.data);
    } catch (err) {
      console.error('Error fetching ledger:', err);
      setLedgerError(err.response?.data?.message || 'Error al obtener el libro mayor');
    } finally {
      setLedgerLoading(false);
    }
  };

  const exportLedgerCSV = () => {
    if (!ledgerData || !ledgerData.movements || ledgerData.movements.length === 0) return;
    const acc = ledgerData.account || selectedAccount;

    const BOM = '\uFEFF';
    let csv = BOM + `Libro Mayor - ${acc.code || ''} ${acc.name || ''}\n`;
    csv += 'Fecha,Descripción,Ref.,Debe,Haber,Saldo\n';

    ledgerData.movements.forEach(m => {
      const desc = (m.description || '').replace(/"/g, '""');
      csv += `"${m.date}","${desc}","${m.referenceId || ''}",${(m.debit || 0).toFixed(2)},${(m.credit || 0).toFixed(2)},${(m.balance || 0).toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mayor_${(acc.code || 'cuenta').replace(/\./g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
                        (activeFilters.type === 'GASTOS' && type.toUpperCase() === 'GASTO') ||
                        (activeFilters.type === 'CAPITAL' && type.toUpperCase() === 'CAPITAL');

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
                    <option value="CAPITAL">Capital</option>
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
                          <button className="action-link" onClick={() => handleViewLedger(account)}>
                            <BookOpen size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                            Ver Mayor
                          </button>
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

      {/* Modal Nueva Cuenta */}
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
                <option value="CAPITAL">Capital</option>
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

      {/* Modal Libro Mayor */}
      {ledgerOpen && (
        <div className="modal-overlay" onClick={() => setLedgerOpen(false)}>
          <div className="ledger-modal animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="ledger-modal-header">
              <div className="ledger-title-group">
                <div className="ledger-icon-badge">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h2>Libro Mayor</h2>
                  {selectedAccount && (
                    <p className="ledger-account-info">
                      <span className="ledger-code">{selectedAccount.code}</span>
                      <span className="ledger-sep">—</span>
                      {selectedAccount.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="ledger-header-actions">
                {ledgerData && ledgerData.movements && ledgerData.movements.length > 0 && (
                  <button className="btn-glass-sm" onClick={exportLedgerCSV} title="Exportar CSV">
                    <Download size={16} />
                  </button>
                )}
                <button className="close-btn" onClick={() => setLedgerOpen(false)}>
                  <X size={22} />
                </button>
              </div>
            </div>
            <div className="ledger-modal-body">
              {ledgerLoading ? (
                <div className="ledger-loading">
                  <div className="spinner"></div>
                  <p>Cargando movimientos...</p>
                </div>
              ) : ledgerError ? (
                <div className="ledger-error">
                  <AlertTriangle size={32} />
                  <p>{ledgerError}</p>
                </div>
              ) : !ledgerData || !ledgerData.movements || ledgerData.movements.length === 0 ? (
                <div className="ledger-empty">
                  <BookOpen size={40} strokeWidth={1.5} />
                  <h3>Sin movimientos</h3>
                  <p>Esta cuenta no tiene movimientos registrados.</p>
                </div>
              ) : (
                <div className="ledger-table-scroll">
                  <table className="ledger-table">
                    <thead>
                      <tr>
                        <th>FECHA</th>
                        <th>DESCRIPCIÓN</th>
                        <th className="text-right">DEBE</th>
                        <th className="text-right">HABER</th>
                        <th className="text-right">SALDO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerData.movements.map((m, idx) => (
                        <tr key={idx}>
                          <td className="ledger-date">{new Date(m.date).toLocaleDateString('es-GT')}</td>
                          <td className="ledger-desc">{m.description}</td>
                          <td className="text-right ledger-amount">
                            {m.debit > 0 ? `Q${m.debit.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-'}
                          </td>
                          <td className="text-right ledger-amount">
                            {m.credit > 0 ? `Q${m.credit.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-'}
                          </td>
                          <td className={`text-right ledger-balance ${m.balance < 0 ? 'negative' : ''}`}>
                            Q{Math.abs(m.balance).toLocaleString(undefined, {minimumFractionDigits: 2})}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="ledger-total-row">
                        <td colSpan="2">SALDO FINAL</td>
                        <td className="text-right">
                          Q{ledgerData.movements.reduce((s, m) => s + (m.debit || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </td>
                        <td className="text-right">
                          Q{ledgerData.movements.reduce((s, m) => s + (m.credit || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </td>
                        <td className="text-right ledger-final-balance">
                          Q{Math.abs(ledgerData.movements[ledgerData.movements.length - 1]?.balance || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AccountCatalog;
