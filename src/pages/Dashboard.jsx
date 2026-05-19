import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import api from '../api/client';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, DollarSign, Package, Wallet, 
  BarChart3, Calendar, FileText, AlertCircle, PlusCircle 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const formatQ = (val) => `Q${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const StatCard = ({ title, value, icon, color, subtitle }) => (
  <motion.div whileHover={{ y: -4 }} className="stat-card">
    <div className={`stat-icon ${color}`}>{icon}</div>
    <div className="stat-content">
      <p className="stat-title">{title}</p>
      <h3 className="stat-value">{value}</h3>
      {subtitle && <span className="stat-subtitle">{subtitle}</span>}
    </div>
  </motion.div>
);

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const res = await api.get('/dashboard/summary');
        setData(res.data);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError(err.response?.data?.message || 'Error al cargar el dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const hasMovements = data && (data.totalAssets > 0 || data.totalLiabilities > 0 || data.monthlySales > 0 || data.monthlyExpenses > 0 || (data.latestEntries && data.latestEntries.length > 0));

  return (
    <Layout>
      <div className="dashboard-container">
        <header className="page-header">
          <div>
            <h1>Dashboard</h1>
            <p>Centro de control contable en tiempo real.</p>
          </div>
          <div className="date-display">
            {new Date().toLocaleDateString('es-GT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>

        {loading ? (
          <div className="dashboard-loading">
            <div className="loader-ring"></div>
            <p>Cargando datos financieros...</p>
          </div>
        ) : error ? (
          <div className="dashboard-error card">
            <AlertCircle size={48} />
            <h3>Error al cargar</h3>
            <p>{error}</p>
            <button className="btn-primary" onClick={() => window.location.reload()}>Reintentar</button>
          </div>
        ) : !hasMovements ? (
          <div className="dashboard-empty">
            <div className="empty-hero card">
              <div className="empty-icon-wrapper">
                <BarChart3 size={56} strokeWidth={1.2} />
              </div>
              <h2>Aún no hay movimientos registrados</h2>
              <p>Crea tu primera partida contable para ver estadísticas reales en tu dashboard.</p>
              <button className="btn-primary" onClick={() => navigate('/new-entry')}>
                <PlusCircle size={20} />
                <span>Crear Primera Partida</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="stats-grid">
              <StatCard
                title="Activos Totales"
                value={formatQ(data.totalAssets)}
                icon={<DollarSign />}
                color="blue"
              />
              <StatCard
                title="Ventas del Mes"
                value={formatQ(data.monthlySales)}
                icon={<TrendingUp />}
                color="green"
                subtitle="Ingresos registrados"
              />
              <StatCard
                title="Gastos del Mes"
                value={formatQ(data.monthlyExpenses)}
                icon={<TrendingDown />}
                color="red"
                subtitle="Costos y gastos"
              />
              <StatCard
                title={data.inventoryBalance > 0 ? 'Inventario' : 'Patrimonio'}
                value={formatQ(data.inventoryBalance > 0 ? data.inventoryBalance : data.totalEquity)}
                icon={data.inventoryBalance > 0 ? <Package /> : <Wallet />}
                color="purple"
              />
            </div>

            {/* Financial Summary Row */}
            <div className="summary-row">
              <div className="summary-card card">
                <div className="summary-header">
                  <h4>Resumen Financiero</h4>
                </div>
                <div className="summary-lines">
                  <div className="summary-line">
                    <span>Total Activos</span>
                    <span className="amount">{formatQ(data.totalAssets)}</span>
                  </div>
                  <div className="summary-line">
                    <span>Total Pasivos</span>
                    <span className="amount negative">{formatQ(data.totalLiabilities)}</span>
                  </div>
                  <div className="summary-line">
                    <span>Patrimonio</span>
                    <span className="amount">{formatQ(data.totalEquity)}</span>
                  </div>
                  <div className="summary-line highlight">
                    <span>Utilidad / Pérdida Neta</span>
                    <span className={`amount ${data.netIncome >= 0 ? 'positive' : 'negative'}`}>
                      {formatQ(data.netIncome)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Chart Area */}
              <div className="chart-card card">
                <div className="summary-header">
                  <h4>Ingresos vs Gastos del Mes</h4>
                </div>
                {data.chartData && data.chartData.length > 0 ? (
                  <div className="mini-chart">
                    {data.chartData.map((day, idx) => {
                      const maxVal = Math.max(...data.chartData.map(d => Math.max(d.ingresos, d.gastos)), 1);
                      return (
                        <div key={idx} className="chart-bar-group" title={`${day.date}\nIngresos: Q${day.ingresos.toLocaleString()}\nGastos: Q${day.gastos.toLocaleString()}`}>
                          <div className="bar-stack">
                            <div className="bar ingreso" style={{ height: `${(day.ingresos / maxVal) * 100}%` }}></div>
                            <div className="bar gasto" style={{ height: `${(day.gastos / maxVal) * 100}%` }}></div>
                          </div>
                          <span className="bar-label">{day.date.split('-')[2]}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="chart-empty">
                    <BarChart3 size={32} strokeWidth={1.5} />
                    <p>Sin datos este mes</p>
                  </div>
                )}
                <div className="chart-legend">
                  <span className="legend-item"><span className="legend-dot ingreso"></span>Ingresos</span>
                  <span className="legend-item"><span className="legend-dot gasto"></span>Gastos</span>
                </div>
              </div>
            </div>

            {/* Latest Entries */}
            <div className="recent-activity-card card">
              <div className="summary-header">
                <h4>Últimas Partidas</h4>
                <button className="btn-glass-sm" onClick={() => navigate('/entries')}>Ver todas</button>
              </div>
              <div className="activity-list">
                {data.latestEntries && data.latestEntries.length > 0 ? (
                  data.latestEntries.map((entry, idx) => (
                    <div key={entry.id || idx} className="activity-item">
                      <div className={`activity-indicator ${entry.type === 'AJUSTE' ? 'warning' : 'success'}`}></div>
                      <div className="activity-info">
                        <p className="activity-desc">{entry.description}</p>
                        <span className="activity-time">
                          <Calendar size={12} />
                          {new Date(entry.date).toLocaleDateString('es-GT', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <div className="activity-amount">Q{(entry.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </div>
                  ))
                ) : (
                  <p className="no-entries-text">No hay partidas recientes.</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
