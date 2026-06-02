import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import api from '../api/client';
import {
  BookOpen, Calendar, ArrowRight, Search, Download,
  AlertCircle, FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import { exportLedgerPDF, exportFullLedgerPDF } from '../utils/pdfExport';
import { exportLedgerExcel, exportFullLedgerExcel } from '../utils/excelExport';
import './Ledger.css';

const formatQ = (val) => {
  const num = Number(val) || 0;
  if (num < 0) return `-Q${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `Q${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const Ledger = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [movements, setMovements] = useState([]);
  const [accountInfo, setAccountInfo] = useState(null);
  const [allLedgers, setAllLedgers] = useState([]);
  const [viewMode, setViewMode] = useState('general');
  const [showEmptyAccounts, setShowEmptyAccounts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Fetch accounts for the dropdown
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await api.get('/accounts');
        const accountsData = res.data || [];
        setAccounts(accountsData);
        fetchAllLedgers(accountsData, filters.startDate, filters.endDate);
      } catch (err) {
        console.error('Error fetching accounts:', err);
        setLoadingAccounts(false);
      }
    };
    fetchAccounts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAllLedgers = async (accountsList, start, end) => {
    setLoading(true);
    setError(null);
    try {
      const promises = accountsList.map(acc =>
        api.get(`/entries/ledger?accountId=${acc.id}&startDate=${start}&endDate=${end}`)
          .then(res => res.data)
          .catch(err => null)
      );
      const results = await Promise.all(promises);
      const validLedgers = results.filter(r => r && r.account).map(r => {
        const tDebit = (r.movements || []).reduce((s, m) => s + (m.debit || 0), 0);
        const tCredit = (r.movements || []).reduce((s, m) => s + (m.credit || 0), 0);
        const fBalance = r.movements && r.movements.length > 0 ? r.movements[r.movements.length - 1].balance : 0;
        return {
          accountInfo: r.account,
          movements: r.movements || [],
          totalDebit: tDebit,
          totalCredit: tCredit,
          finalBalance: fBalance
        };
      });
      setAllLedgers(validLedgers);
      setViewMode('general');
    } catch (err) {
      console.error(err);
      setError('Error al obtener los libros mayores.');
    } finally {
      setLoading(false);
      setLoadingAccounts(false);
    }
  };

  const handleCardClick = (accountId) => {
    setSelectedAccountId(accountId);
    const ledger = allLedgers.find(l => l.accountInfo.id === accountId);
    if (ledger) {
      setAccountInfo(ledger.accountInfo);
      setMovements(ledger.movements);
      setViewMode('individual');
    }
  };

  const fetchLedger = async () => {
    if (!selectedAccountId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/entries/ledger?accountId=${selectedAccountId}&startDate=${filters.startDate}&endDate=${filters.endDate}`);
      setAccountInfo(res.data.account);
      setMovements(res.data.movements || []);
      setViewMode('individual');
    } catch (err) {
      console.error('Error fetching ledger:', err);
      setError(err.response?.data?.message || 'Error al obtener el libro mayor.');
      setMovements([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConsultar = () => {
    if (!selectedAccountId) {
      fetchAllLedgers(accounts, filters.startDate, filters.endDate);
    } else {
      fetchLedger();
    }
  };

  const totalDebit = movements.reduce((s, m) => s + (m.debit || 0), 0);
  const totalCredit = movements.reduce((s, m) => s + (m.credit || 0), 0);
  const finalBalance = movements.length > 0 ? movements[movements.length - 1].balance : 0;

  return (
    <Layout>
      <div className="ledger-container">
        <header className="page-header-premium">
          <div className="title-section">
            <div className="icon-badge">
              <BookOpen size={24} />
            </div>
            <div>
              <h1>Libro Mayor</h1>
              <p>Movimientos detallados por cuenta contable.</p>
            </div>
          </div>
          {((viewMode === 'individual' && accountInfo && movements.length > 0) || (viewMode === 'general' && allLedgers.length > 0)) && (
            <div className="header-actions">
              <button
                className="btn-primary"
                onClick={() => viewMode === 'general' ? exportFullLedgerExcel(allLedgers.filter(l => showEmptyAccounts || l.movements.length > 0), filters.startDate) : exportLedgerExcel(accountInfo, movements)}
                title="Exportar Excel"
              >
                <Download size={20} />
                <span>Excel</span>
              </button>
              <button
                className="btn-primary"
                onClick={() => viewMode === 'general' ? exportFullLedgerPDF(allLedgers.filter(l => showEmptyAccounts || l.movements.length > 0), filters.startDate) : exportLedgerPDF(accountInfo, movements)}
                title="Exportar PDF"
              >
                <Download size={20} />
                <span>PDF</span>
              </button>
            </div>
          )}
        </header>

        {/* Filters */}
        <section className="filters-card card">
          <div className="ledger-filters-grid">
            <div className="filter-group filter-account">
              <label>Cuenta contable</label>
              <select
                value={selectedAccountId}
                onChange={e => setSelectedAccountId(e.target.value)}
                disabled={loadingAccounts}
              >
                <option value="">â€” Todas las cuentas (Vista General) â€”</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} â€” {acc.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Desde</label>
              <div className="input-with-icon">
                <Calendar size={18} />
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
            </div>
            <div className="filter-connector">
              <ArrowRight size={20} />
            </div>
            <div className="filter-group">
              <label>Hasta</label>
              <div className="input-with-icon">
                <Calendar size={18} />
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="filter-actions">
              <button
                className="btn-primary btn-search"
                onClick={handleConsultar}
                disabled={loading}
              >
                {loading ? <div className="spinner-small"></div> : <Search size={20} />}
                <span>Consultar</span>
              </button>
            </div>
          </div>
          {viewMode === 'general' && (
            <div className="ledger-options" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input 
                type="checkbox" 
                id="showEmptyAccounts" 
                checked={showEmptyAccounts} 
                onChange={(e) => setShowEmptyAccounts(e.target.checked)} 
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="showEmptyAccounts" style={{ cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Mostrar cuentas sin movimientos
              </label>
            </div>
          )}
        </section>

        {/* General View */}
        {viewMode === 'general' && (
          <div className="ledger-general-view">
            {loading ? (
              <div className="loading-state-premium">
                <div className="loader-ring"></div>
                <p>Consultando libros mayores...</p>
              </div>
            ) : error ? (
              <div className="empty-state-premium card">
                <AlertCircle size={40} strokeWidth={1.5} />
                <h3>Error</h3>
                <p>{error}</p>
              </div>
            ) : allLedgers.length === 0 ? (
              <div className="empty-state-premium card">
                <BookOpen size={48} strokeWidth={1.2} />
                <h3>Sin cuentas</h3>
                <p>No se encontraron cuentas con la configuraciÃ³n actual.</p>
              </div>
            ) : (
              allLedgers.filter(ledger => showEmptyAccounts || ledger.movements.length > 0).map((ledger, idx) => (
                <div key={ledger.accountInfo.id} className="general-ledger-block" style={{ marginBottom: '3rem' }}>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="ledger-account-info card hover-effect"
                    onClick={() => handleCardClick(ledger.accountInfo.id)}
                    style={{ cursor: 'pointer', border: '1px solid transparent', transition: 'border-color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                    title="Clic para ver detalle de esta cuenta"
                  >
                    <div className="account-info-grid">
                      <div className="info-item">
                        <span className="info-label">CÃ³digo</span>
                        <span className="info-value code">{ledger.accountInfo.code}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Cuenta</span>
                        <span className="info-value">{ledger.accountInfo.name}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Naturaleza</span>
                        <span className={`info-value nature-badge ${ledger.accountInfo.nature === 'DEUDORA' ? 'deudora' : 'acreedora'}`}>
                          {ledger.accountInfo.nature}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Total Debe</span>
                        <span className="info-value">{formatQ(ledger.totalDebit)}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Total Haber</span>
                        <span className="info-value">{formatQ(ledger.totalCredit)}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Saldo Final</span>
                        <span className={`info-value ${ledger.finalBalance >= 0 ? 'positive' : 'negative'}`}>
                          {formatQ(ledger.finalBalance)}
                        </span>
                      </div>
                    </div>
                  </motion.div>

                  {ledger.movements.length === 0 ? (
                    <div className="empty-state-premium card" style={{ marginTop: '1rem', padding: '1.5rem', minHeight: 'auto' }}>
                      <FileText size={24} strokeWidth={1.5} />
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>Sin movimientos</p>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="ledger-table-card card"
                      style={{ marginTop: '1rem' }}
                    >
                      <div className="ledger-table-scroll">
                        <table className="modern-table ledger-table">
                          <thead>
                            <tr>
                              <th>Fecha</th>
                              <th>#</th>
                              <th>DescripciÃ³n</th>
                              <th>Tipo</th>
                              <th className="text-right">Debe</th>
                              <th className="text-right">Haber</th>
                              <th className="text-right">Saldo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ledger.movements.map((m, mIdx) => (
                              <tr key={mIdx}>
                                <td className="date-cell">{m.date}</td>
                                <td className="partida-cell">{mIdx + 1}</td>
                                <td className="desc-cell">{m.description || 'â€”'}</td>
                                <td>
                                  <span className="type-badge">{m.type || 'â€”'}</span>
                                </td>
                                <td className="text-right amount-cell debe">
                                  {m.debit ? formatQ(m.debit) : '-'}
                                </td>
                                <td className="text-right amount-cell haber">
                                  {m.credit ? formatQ(m.credit) : '-'}
                                </td>
                                <td className={`text-right amount-cell ${m.balance >= 0 ? 'positive' : 'negative'}`}>
                                  {formatQ(m.balance)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="total-row">
                              <td colSpan="4">TOTALES</td>
                              <td className="text-right">{formatQ(ledger.totalDebit)}</td>
                              <td className="text-right">{formatQ(ledger.totalCredit)}</td>
                              <td className="text-right">{formatQ(ledger.finalBalance)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Individual View */}
        {viewMode === 'individual' && (
          <>
        {/* Account Info Header */}
        {accountInfo && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="ledger-account-info card"
          >
            <div className="account-info-grid">
              <div className="info-item">
                <span className="info-label">CÃ³digo</span>
                <span className="info-value code">{accountInfo.code}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Cuenta</span>
                <span className="info-value">{accountInfo.name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Naturaleza</span>
                <span className={`info-value nature-badge ${accountInfo.nature === 'DEUDORA' ? 'deudora' : 'acreedora'}`}>
                  {accountInfo.nature}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Total Debe</span>
                <span className="info-value">{formatQ(totalDebit)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Total Haber</span>
                <span className="info-value">{formatQ(totalCredit)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Saldo Final</span>
                <span className={`info-value ${finalBalance >= 0 ? 'positive' : 'negative'}`}>
                  {formatQ(finalBalance)}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Results */}
        {error ? (
          <div className="empty-state-premium card">
            <AlertCircle size={40} strokeWidth={1.5} />
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        ) : !accountInfo && !loading ? (
          <div className="empty-state-premium card">
            <BookOpen size={48} strokeWidth={1.2} />
            <h3>Selecciona una cuenta</h3>
            <p>Elige una cuenta contable y define el rango de fechas para ver sus movimientos.</p>
          </div>
        ) : loading ? (
          <div className="loading-state-premium">
            <div className="loader-ring"></div>
            <p>Consultando movimientos...</p>
          </div>
        ) : movements.length === 0 ? (
          <div className="empty-state-premium card">
            <FileText size={40} strokeWidth={1.5} />
            <h3>Sin movimientos</h3>
            <p>No hay movimientos para esta cuenta en el rango seleccionado.</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="ledger-table-card card"
          >
            <div className="ledger-table-scroll">
              <table className="modern-table ledger-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>#</th>
                    <th>DescripciÃ³n</th>
                    <th>Tipo</th>
                    <th className="text-right">Debe</th>
                    <th className="text-right">Haber</th>
                    <th className="text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m, idx) => (
                    <motion.tr
                      key={idx}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                    >
                      <td className="date-cell">{m.date}</td>
                      <td className="partida-cell">{idx + 1}</td>
                      <td className="desc-cell">{m.description || 'â€”'}</td>
                      <td>
                        <span className="type-badge">{m.type || 'â€”'}</span>
                      </td>
                      <td className="text-right amount-cell debe">
                        {m.debit ? formatQ(m.debit) : '-'}
                      </td>
                      <td className="text-right amount-cell haber">
                        {m.credit ? formatQ(m.credit) : '-'}
                      </td>
                      <td className={`text-right amount-cell ${m.balance >= 0 ? 'positive' : 'negative'}`}>
                        {formatQ(m.balance)}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="total-row">
                    <td colSpan="4">TOTALES</td>
                    <td className="text-right">{formatQ(totalDebit)}</td>
                    <td className="text-right">{formatQ(totalCredit)}</td>
                    <td className="text-right">{formatQ(finalBalance)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </motion.div>
        )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Ledger;
