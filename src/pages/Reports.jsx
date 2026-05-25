import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import api from '../api/client';
import { 
  PieChart, 
  FileText, 
  BarChart, 
  Download, 
  RefreshCw, 
  AlertCircle,
  TrendingUp,
  Wallet,
  Building,
  ClipboardCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { exportTrialBalancePDF, exportProfitLossPDF, exportBalanceSheetPDF } from '../utils/pdfExport';
import './Reports.css';

const formatQ = (val) => {
  const num = Number(val) || 0;
  if (num < 0) {
    return `-Q${Math.abs(num).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  }
  return `Q${num.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
};

/* ────────────────────────────────────────────────── */
/* DIRECT PDF EXPORT (replaces window.print)         */
/* ────────────────────────────────────────────────── */
const handleExportPDF = (activeTab, data) => {
  if (!data) return;
  if (activeTab === 'trial') exportTrialBalancePDF(data, 'balance_comprobacion');
  else if (activeTab === 'adjusted') exportTrialBalancePDF(data, 'balance_saldos_ajustado');
  else if (activeTab === 'pnl') exportProfitLossPDF(data);
  else if (activeTab === 'balance') exportBalanceSheetPDF(data);
};

/* ────────────────────────────────────────────────── */
/* MAIN COMPONENT                                    */
/* ────────────────────────────────────────────────── */
const Reports = () => {
  const [activeTab, setActiveTab] = useState('trial');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = '';
      if (activeTab === 'trial') endpoint = '/entries/trial-balance';
      if (activeTab === 'adjusted') endpoint = '/entries/adjusted-trial-balance';
      if (activeTab === 'pnl') endpoint = '/entries/profit-loss';
      if (activeTab === 'balance') endpoint = '/entries/balance-sheet';

      const response = await api.get(endpoint);
      setData(response.data);
    } catch (err) {
      setError('No se pudo generar el reporte. Verifica la conexión con el servidor.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  return (
    <Layout>
      <div className="reports-container">
        <header className="page-header-premium">
          <div className="title-section">
            <div className="icon-badge">
              <BarChart size={24} />
            </div>
            <div>
              <h1>Reportes Financieros</h1>
              <p>Estados financieros en tiempo real generados a partir de tus partidas.</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn-glass-icon" onClick={fetchData} title="Refrescar">
              <RefreshCw size={20} className={loading ? 'spin' : ''} />
            </button>
            <button className="btn-primary" onClick={() => handleExportPDF(activeTab, data)} disabled={loading || !data}>
              <Download size={20} />
              <span>Exportar PDF</span>
            </button>
          </div>
        </header>

        <div className="reports-nav-tabs">
          <button 
            className={`report-tab ${activeTab === 'trial' ? 'active' : ''}`}
            onClick={() => setActiveTab('trial')}
          >
            <FileText size={18} />
            <span>Balance de Comprobación</span>
          </button>
          <button 
            className={`report-tab ${activeTab === 'adjusted' ? 'active' : ''}`}
            onClick={() => setActiveTab('adjusted')}
          >
            <ClipboardCheck size={18} />
            <span>Saldos Ajustado</span>
          </button>
          <button 
            className={`report-tab ${activeTab === 'pnl' ? 'active' : ''}`}
            onClick={() => setActiveTab('pnl')}
          >
            <TrendingUp size={18} />
            <span>Estado de Resultados</span>
          </button>
          <button 
            className={`report-tab ${activeTab === 'balance' ? 'active' : ''}`}
            onClick={() => setActiveTab('balance')}
          >
            <Wallet size={18} />
            <span>Balance General</span>
          </button>
        </div>

        <div className="report-viewport">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="report-loading"
              >
                <div className="loader-ring"></div>
                <p>Calculando saldos y generando estados financieros...</p>
              </motion.div>
            ) : error || !data ? (
              <motion.div 
                key="error"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="report-error"
              >
                <AlertCircle size={48} />
                <h3>Error al generar reporte</h3>
                <p>{error}</p>
                <button className="btn-primary" onClick={fetchData}>Intentar de nuevo</button>
              </motion.div>
            ) : (
              <motion.div 
                key="content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="report-data-view"
              >
                {activeTab === 'trial' && <TrialBalanceView data={data} />}
                {activeTab === 'adjusted' && <AdjustedTrialBalanceView data={data} />}
                {activeTab === 'pnl' && <ProfitLossView data={data} />}
                {activeTab === 'balance' && <BalanceSheetView data={data} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
};

/* ────────────────────────────────────────────────── */
/* SUB-VIEWS                                         */
/* ────────────────────────────────────────────────── */
const TrialBalanceView = ({ data }) => (
  <div className="report-card-premium card">
    <div className="report-card-header">
      <h3>Resumen de Saldos</h3>
      <span className="date-tag">{new Date(data.date.includes('T') ? data.date : data.date + 'T12:00:00').toLocaleDateString()}</span>
    </div>
    <div className="table-wrapper-scroll">
      <table className="modern-table">
        <thead>
          <tr>
            <th>CÓDIGO</th>
            <th>NOMBRE DE LA CUENTA</th>
            <th className="text-right">DEUDOR</th>
            <th className="text-right">ACREEDOR</th>
          </tr>
        </thead>
        <tbody>
          {data.accounts?.map(acc => (
            <tr key={acc.code}>
              <td className="code-font">{acc.code}</td>
              <td className="name-cell">{acc.name}</td>
              <td className="text-right amount-cell debe">
                {acc.balance > 0 ? `Q${acc.balance.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-'}
              </td>
              <td className="text-right amount-cell haber">
                {acc.balance < 0 ? `Q${Math.abs(acc.balance).toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="total-row">
            <td colSpan="2">TOTALES GENERALES</td>
            <td className="text-right">Q{(data.totals?.debe || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            <td className="text-right">Q{(data.totals?.haber || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
);

const AdjustedTrialBalanceView = ({ data }) => (
  <div className="report-card-premium card">
    <div className="report-card-header">
      <div className="header-with-icon">
        <ClipboardCheck size={18} />
        <h3>Balance de Saldos Ajustado</h3>
      </div>
      <span className="date-tag">{new Date(data.date.includes('T') ? data.date : data.date + 'T12:00:00').toLocaleDateString()}</span>
    </div>
    <div className="table-wrapper-scroll">
      <table className="modern-table">
        <thead>
          <tr>
            <th>CÓDIGO</th>
            <th>NOMBRE DE LA CUENTA</th>
            <th className="text-right">DEUDOR</th>
            <th className="text-right">ACREEDOR</th>
          </tr>
        </thead>
        <tbody>
          {data.accounts?.map(acc => (
            <tr key={acc.code}>
              <td className="code-font">{acc.code}</td>
              <td className="name-cell">{acc.name}</td>
              <td className="text-right amount-cell debe">
                {acc.balance > 0 ? `Q${acc.balance.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-'}
              </td>
              <td className="text-right amount-cell haber">
                {acc.balance < 0 ? `Q${Math.abs(acc.balance).toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="total-row">
            <td colSpan="2">TOTALES GENERALES</td>
            <td className="text-right">Q{(data.totals?.debe || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            <td className="text-right">Q{(data.totals?.haber || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
);

const ProfitLossView = ({ data }) => (
  <div className="pnl-container">
    <div className="pnl-summary-grid">
      <div className="pnl-stat-card card">
        <span className="label">Ingresos Totales</span>
        <span className="value positive">Q{data.resumen?.totalIngresos.toLocaleString()}</span>
      </div>
      <div className="pnl-stat-card card">
        <span className="label">Costos Totales</span>
        <span className="value negative">Q{data.resumen?.totalCostos.toLocaleString()}</span>
      </div>
      <div className="pnl-stat-card card highlight">
        <span className="label">Utilidad Neta</span>
        <span className="value">Q{data.resumen?.utilidadNeta.toLocaleString()}</span>
      </div>
    </div>

    <div className="report-card-premium card">
      <div className="pnl-detail-view">
        <div className="pnl-section">
          <div className="section-title">INGRESOS DE OPERACIÓN</div>
          <div className="pnl-line">
            <span>Ventas y Servicios</span>
            <span>Q{data.resumen?.totalIngresos.toLocaleString()}</span>
          </div>
          <div className="pnl-line total">
            <span>TOTAL INGRESOS</span>
            <span>Q{data.resumen?.totalIngresos.toLocaleString()}</span>
          </div>
        </div>

        <div className="pnl-section">
          <div className="section-title">COSTOS Y GASTOS</div>
          <div className="pnl-line">
            <span>Costo de Ventas</span>
            <span className="negative">(Q{data.resumen?.totalCostos.toLocaleString()})</span>
          </div>
          <div className="pnl-line subtotal">
            <span>UTILIDAD BRUTA</span>
            <span>Q{data.resumen?.utilidadBruta.toLocaleString()}</span>
          </div>
          <div className="pnl-line">
            <span>Gastos de Administración</span>
            <span className="negative">(Q{data.resumen?.totalGastos.toLocaleString()})</span>
          </div>
        </div>

        <div className="pnl-section final">
          <div className="pnl-line result">
            <span>UTILIDAD NETA DEL EJERCICIO</span>
            <span className="result-value">Q{data.resumen?.utilidadNeta.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const BalanceSheetView = ({ data }) => (
  <div className="balance-grid-layout">
    <div className="report-card-premium card">
      <div className="report-card-header">
        <div className="header-with-icon">
          <Building size={18} />
          <h3>Activos</h3>
        </div>
      </div>
      <div className="bs-lines">
        {data.activos?.map(a => (
          <div key={a.id || a.code} className="pnl-line">
            <span>{a.name}</span>
            <span>{formatQ(a.balance)}</span>
          </div>
        ))}
        <div className="pnl-line total">
          <span>TOTAL ACTIVO</span>
          <span>{formatQ(data.totales?.activo)}</span>
        </div>
      </div>
    </div>

    <div className="report-card-premium card">
      <div className="report-card-header">
        <div className="header-with-icon">
          <Wallet size={18} />
          <h3>Pasivo y Patrimonio</h3>
        </div>
      </div>
      <div className="bs-lines">
        <div className="bs-group-label">Pasivos</div>
        {data.pasivos?.map(p => (
          <div key={p.id || p.code} className="pnl-line">
            <span>{p.name}</span>
            <span>{formatQ(Math.abs(p.balance))}</span>
          </div>
        ))}
        
        <div className="bs-group-label" style={{ marginTop: '1.5rem' }}>Patrimonio</div>
        {data.patrimonio?.map(p => {
          const isResult = p.code === '3.2.01.01' || p.id === '_resultado_ejercicio' || p.name.toLowerCase() === 'resultado del ejercicio';
          const val = isResult ? p.balance : Math.abs(p.balance);
          return (
            <div key={p.id || p.code} className="pnl-line">
              <span>{p.name}</span>
              <span className={isResult && val < 0 ? 'negative' : ''}>{formatQ(val)}</span>
            </div>
          );
        })}
        
        <div className="pnl-line total">
          <span>TOTAL PASIVO Y CAPITAL</span>
          <span>{formatQ(data.totales?.patrimonio)}</span>
        </div>
      </div>
    </div>
  </div>
);

export default Reports;
