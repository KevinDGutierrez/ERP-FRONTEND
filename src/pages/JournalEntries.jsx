import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import api from '../api/client';
import { 
  History, 
  Calendar, 
  Search, 
  Filter, 
  ArrowRight, 
  Download, 
  FileSpreadsheet,
  AlertCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './JournalEntries.css';

import { exportJournalPDF } from '../utils/pdfExport';
import { exportJournalExcel } from '../utils/excelExport';



const JournalEntries = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const fetchEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      // Usamos el endpoint correcto sin el prefijo duplicado /api
      const response = await api.get(`/entries/daily-book?startDate=${filters.startDate}&endDate=${filters.endDate}`);
      setEntries(response.data);
    } catch (err) {
      console.error('Error fetching journal entries:', err);
      setError(err.response?.data?.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const totalDebe = entries.reduce((acc, entry) => 
    acc + (entry.details?.reduce((sum, d) => sum + (d.debit || 0), 0) || 0), 0
  );

  const totalHaber = entries.reduce((acc, entry) => 
    acc + (entry.details?.reduce((sum, d) => sum + (d.credit || 0), 0) || 0), 0
  );

  return (
    <Layout>
      <div className="journal-container">
        <header className="page-header-premium">
          <div className="title-section">
            <div className="icon-badge">
              <History size={24} />
            </div>
            <div>
              <h1>Libro Diario</h1>
              <p>Registro cronológico de todas las operaciones contables de la empresa.</p>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-item">
              <span className="stat-label">Total Debe</span>
              <span className="stat-value">Q{totalDebe.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-label">Total Haber</span>
              <span className="stat-value">Q{totalHaber.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
          </div>
        </header>

        {/* Card de Filtros */}
        <section className="filters-card card">
          <div className="filters-grid">
            <div className="filter-group">
              <label>Desde</label>
              <div className="input-with-icon">
                <Calendar size={18} />
                <input 
                  type="date" 
                  value={filters.startDate} 
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})} 
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
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})} 
                />
              </div>
            </div>
            <div className="filter-actions">
              <button className="btn-primary btn-search" onClick={fetchEntries} disabled={loading}>
                {loading ? <div className="spinner-small"></div> : <Search size={20} />}
                <span>Aplicar Filtros</span>
              </button>
              <button className="btn-glass" title="Exportar Excel" onClick={() => exportJournalExcel(entries)}>
                <FileSpreadsheet size={20} />
              </button>
              <button className="btn-glass" title="Exportar PDF" onClick={() => exportJournalPDF(entries)}>
                <Download size={20} />
              </button>
            </div>
          </div>
        </section>

        {/* Listado de Partidas */}
        <div className="journal-content-scroll">
          {loading ? (
            <div className="loading-state-premium">
              <div className="loader-ring"></div>
              <p>Procesando registros contables...</p>
            </div>
          ) : error ? (
            <div className="error-state-premium card">
              <AlertCircle size={48} />
              <h3>Error de Conexión</h3>
              <p>{error}</p>
              <button className="btn-primary" onClick={fetchEntries}>Reintentar</button>
            </div>
          ) : entries.length === 0 ? (
            <div className="empty-state-premium card">
              <div className="empty-icon">
                <Clock size={40} />
              </div>
              <h3>Sin movimientos</h3>
              <p>No se encontraron partidas registradas en el rango de fechas seleccionado.</p>
              <button className="btn-glass" onClick={() => setFilters({
                startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0]
              })}>Ver todo el año</button>
            </div>
          ) : (
            <div className="entries-stack">
              {entries.map((entry, idx) => (
                <motion.div 
                  key={entry.id} 
                  className="entry-card-premium card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <div className="entry-head">
                    <div className="entry-info">
                      <span className="entry-tag">Partida #{idx + 1}</span>
                      <span className="entry-date-bubble">
                        <Calendar size={14} />
                        {new Date(entry.date + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    <div className={`entry-type-tag ${entry.type?.toLowerCase()}`}>
                      {entry.type}
                    </div>
                  </div>
                  
                  <div className="entry-desc">
                    {entry.description}
                  </div>

                  <div className="entry-table-wrapper">
                    <table className="modern-table">
                      <thead>
                        <tr>
                          <th>CÓDIGO</th>
                          <th>CUENTA</th>
                          <th className="text-right">DEBE</th>
                          <th className="text-right">HABER</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.details?.map((detail, dIdx) => (
                          <tr key={dIdx} className={detail.credit > 0 ? 'row-credit' : ''}>
                            <td className="code-font">{detail.accountCode}</td>
                            <td className="name-cell">
                              {detail.credit > 0 && <span className="indent-arrow">↳</span>}
                              {detail.accountName}
                            </td>
                            <td className="text-right amount-cell debe">
                              {detail.debit > 0 ? `Q${detail.debit.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-'}
                            </td>
                            <td className="text-right amount-cell haber">
                              {detail.credit > 0 ? `Q${detail.credit.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default JournalEntries;
