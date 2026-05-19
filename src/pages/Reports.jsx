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
  ChevronRight,
  TrendingUp,
  Wallet,
  Building
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './Reports.css';

const formatQ = (val) => {
  const num = Number(val) || 0;
  if (num < 0) {
    return `-Q${Math.abs(num).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  }
  return `Q${num.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
};

const generatePrintHTML = (title, bodyContent) => `
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a1a; font-size: 12px; }
    .report-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1a1a1a; padding-bottom: 16px; }
    .report-header h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    .report-header p { font-size: 11px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #f0f0f0; padding: 10px 14px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #333; }
    td { padding: 8px 14px; border-bottom: 1px solid #e0e0e0; font-size: 12px; }
    .text-right { text-align: right; }
    .total-row td { font-weight: 700; border-top: 2px solid #333; background: #f8f8f8; font-size: 13px; }
    .section-title { font-size: 13px; font-weight: 700; color: #2563eb; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: 0.03em; }
    .summary-line { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 13px; }
    .summary-line.total { border-top: 2px solid #333; border-bottom: none; font-weight: 700; font-size: 14px; padding-top: 12px; }
    .summary-line.subtotal { font-weight: 600; color: #2563eb; }
    .summary-line .negative { color: #dc2626; }
    .summary-line .positive { color: #16a34a; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .col-title { font-size: 15px; font-weight: 700; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #333; }
    .group-label { font-size: 11px; font-weight: 700; color: #666; text-transform: uppercase; margin: 16px 0 6px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="report-header">
    <h1>${title}</h1>
    <p>Generado el ${new Date().toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' })} — Street Ledger ERP</p>
  </div>
  ${bodyContent}
</body>
</html>
`;

const exportReportPDF = (activeTab, data) => {
  if (!data) return;

  let title = '';
  let bodyContent = '';

  if (activeTab === 'trial') {
    title = 'Balance de Comprobación';
    const rows = (data.accounts || []).map(acc => `
      <tr>
        <td style="font-family:monospace;font-weight:600">${acc.code}</td>
        <td>${acc.name}</td>
        <td class="text-right">${acc.balance > 0 ? formatQ(acc.balance) : '-'}</td>
        <td class="text-right">${acc.balance < 0 ? formatQ(Math.abs(acc.balance)) : '-'}</td>
      </tr>
    `).join('');
    bodyContent = `
      <table>
        <thead><tr><th>CÓDIGO</th><th>NOMBRE DE LA CUENTA</th><th class="text-right">DEUDOR</th><th class="text-right">ACREEDOR</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr class="total-row">
          <td colspan="2">TOTALES GENERALES</td>
          <td class="text-right">${formatQ(data.totals?.debe)}</td>
          <td class="text-right">${formatQ(data.totals?.haber)}</td>
        </tr></tfoot>
      </table>
    `;
  } else if (activeTab === 'pnl') {
    title = 'Estado de Resultados';
    const r = data.resumen || {};
    bodyContent = `
      <div class="section-title">INGRESOS DE OPERACIÓN</div>
      <div class="summary-line"><span>Ventas y Servicios</span><span>${formatQ(r.totalIngresos)}</span></div>
      <div class="summary-line total"><span>TOTAL INGRESOS</span><span>${formatQ(r.totalIngresos)}</span></div>
      
      <div class="section-title">COSTOS Y GASTOS</div>
      <div class="summary-line"><span>Costo de Ventas</span><span class="negative">(${formatQ(r.totalCostos)})</span></div>
      <div class="summary-line subtotal"><span>UTILIDAD BRUTA</span><span>${formatQ(r.utilidadBruta)}</span></div>
      <div class="summary-line"><span>Gastos de Administración</span><span class="negative">(${formatQ(r.totalGastos)})</span></div>
      
      <div style="margin-top:24px;padding:16px;background:#f0fdf4;border:2px solid #16a34a;border-radius:8px;">
        <div class="summary-line total"><span>UTILIDAD NETA DEL EJERCICIO</span><span class="positive">${formatQ(r.utilidadNeta)}</span></div>
      </div>
    `;
  } else if (activeTab === 'balance') {
    title = 'Balance General';
    const activoRows = (data.activos || []).map(a => `<div class="summary-line"><span>${a.name}</span><span>${formatQ(a.balance)}</span></div>`).join('');
    const pasivoRows = (data.pasivos || []).map(p => `<div class="summary-line"><span>${p.name}</span><span>${formatQ(Math.abs(p.balance))}</span></div>`).join('');
    const patrimonioRows = (data.patrimonio || []).map(p => {
      const isResult = p.code === '3.2.01.01' || p.id === '_resultado_ejercicio' || p.name.toLowerCase() === 'resultado del ejercicio';
      const val = isResult ? p.balance : Math.abs(p.balance);
      return `<div class="summary-line"><span>${p.name}</span><span>${formatQ(val)}</span></div>`;
    }).join('');
    bodyContent = `
      <div class="two-col">
        <div>
          <div class="col-title">Activos</div>
          ${activoRows}
          <div class="summary-line total"><span>TOTAL ACTIVO</span><span>${formatQ(data.totales?.activo)}</span></div>
        </div>
        <div>
          <div class="col-title">Pasivo y Patrimonio</div>
          <div class="group-label">Pasivos</div>
          ${pasivoRows}
          <div class="group-label" style="margin-top:16px">Patrimonio</div>
          ${patrimonioRows}
          <div class="summary-line total"><span>TOTAL PASIVO Y CAPITAL</span><span>${formatQ(data.totales?.patrimonio)}</span></div>
        </div>
      </div>
    `;
  }

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  printWindow.document.write(generatePrintHTML(title, bodyContent));
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
};

const Reports = () => {
  const [activeTab, setActiveTab] = useState('trial'); // trial, pnl, balance
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = '';
      if (activeTab === 'trial') endpoint = '/entries/trial-balance';
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
            <button className="btn-primary" onClick={() => exportReportPDF(activeTab, data)} disabled={loading || !data}>
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

const TrialBalanceView = ({ data }) => (
  <div className="report-card-premium card">
    <div className="report-card-header">
      <h3>Resumen de Saldos</h3>
      <span className="date-tag">{new Date(data.date).toLocaleDateString()}</span>
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
