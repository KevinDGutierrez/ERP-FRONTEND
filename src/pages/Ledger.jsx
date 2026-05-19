import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import api from '../api/client';
import {
  BookOpen, Calendar, ArrowRight, Search, Download,
  AlertCircle, FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import { exportLedgerPDF } from '../utils/pdfExport';
import './Ledger.css';

const formatQ = (val) => {
  const num = Number(val) || 0;
  if (num < 0) return `-Q${Math.abs(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `Q${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const Ledger = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [movements, setMovements] = useState([]);
  const [accountInfo, setAccountInfo] = useState(null);
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
        setAccounts(res.data || []);
      } catch (err) {
        console.error('Error fetching accounts:', err);
      } finally {
        setLoadingAccounts(false);
      }
    };
    fetchAccounts();
  }, []);

  const fetchLedger = async () => {
    if (!selectedAccountId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/entries/ledger?accountId=${selectedAccountId}&startDate=${filters.startDate}&endDate=${filters.endDate}`);
      setAccountInfo(res.data.account);
      setMovements(res.data.movements || []);
    } catch (err) {
      console.error('Error fetching ledger:', err);
      setError(err.response?.data?.message || 'Error al obtener el libro mayor.');
      setMovements([]);
    } finally {
      setLoading(false);
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
          {accountInfo && movements.length > 0 && (
            <div className="header-actions">
              <button
                className="btn-primary"
                onClick={() => exportLedgerPDF(accountInfo, movements)}
              >
                <Download size={20} />
                <span>Exportar PDF</span>
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
                <option value="">— Seleccionar cuenta —</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} — {acc.name}
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
                onClick={fetchLedger}
                disabled={loading || !selectedAccountId}
              >
                {loading ? <div className="spinner-small"></div> : <Search size={20} />}
                <span>Consultar</span>
              </button>
            </div>
          </div>
        </section>

        {/* Account Info Header */}
        {accountInfo && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="ledger-account-info card"
          >
            <div className="account-info-grid">
              <div className="info-item">
                <span className="info-label">Código</span>
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
                    <th>Descripción</th>
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
                      <td className="desc-cell">{m.description || '—'}</td>
                      <td>
                        <span className="type-badge">{m.type || '—'}</span>
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
      </div>
    </Layout>
  );
};

export default Ledger;
