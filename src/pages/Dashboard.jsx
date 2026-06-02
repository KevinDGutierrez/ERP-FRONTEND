import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import api from '../api/client';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, DollarSign, Package, Wallet, 
  BarChart3, Calendar, FileText, AlertCircle, PlusCircle 
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, PieChart, Pie
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const formatQ = (val) => `Q${(val || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

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

const CHART_COLORS = {
  ingresos: '#10b981',
  gastos: '#ef4444'
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div style={{
      background: 'var(--surface, #1e1e2e)',
      border: '1px solid var(--border, #333)',
      borderRadius: 10,
      padding: '12px 16px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      fontSize: 13
    }}>
      <p style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-primary, #fff)' }}>Día {label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: '2px 0' }}>
          {p.name}: Q{(p.value || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
        </p>
      ))}
    </div>
  );
};

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

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

  // Prepare pie data for financial breakdown
  const pieData = data ? [
    { name: 'Ingresos', value: data.monthlySales || 0 },
    { name: 'Costos', value: Math.abs(data.monthlyExpenses || 0) * 0.4 },
    { name: 'Gastos', value: Math.abs(data.monthlyExpenses || 0) * 0.6 },
  ].filter(d => d.value > 0) : [];

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
                    <span>Utilidad / PÃ©rdida Neta</span>
                    <span className={`amount ${data.netIncome >= 0 ? 'positive' : 'negative'}`}>
                      {formatQ(data.netIncome)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Chart Area â€” Recharts */}
              <div className="chart-card card">
                <div className="summary-header">
                  <h4>Ingresos vs Gastos del Mes</h4>
                </div>
                {data.chartData && data.chartData.length > 0 ? (
                  <div className="recharts-wrapper">
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={data.chartData.map(d => ({
                        ...d,
                        dia: d.date.split('-')[2]
                      }))} barGap={2} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #333)" opacity={0.3} />
                        <XAxis
                          dataKey="dia"
                          tick={{ fill: 'var(--text-muted, #888)', fontSize: 11 }}
                          axisLine={{ stroke: 'var(--border, #333)' }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: 'var(--text-muted, #888)', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.05)' }} />
                        <Legend
                          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                          iconType="circle"
                          iconSize={8}
                        />
                        <Bar dataKey="ingresos" name="Ingresos" fill={CHART_COLORS.ingresos} radius={[4, 4, 0, 0]} maxBarSize={28} />
                        <Bar dataKey="gastos" name="Gastos" fill={CHART_COLORS.gastos} radius={[4, 4, 0, 0]} maxBarSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="chart-empty">
                    <BarChart3 size={32} strokeWidth={1.5} />
                    <p>Sin datos este mes</p>
                  </div>
                )}
              </div>
            </div>

            {/* Latest Entries */}
            <div className="recent-activity-card card">
              <div className="summary-header">
                <h4>Últimas Partidas</h4>
                <button className="btn-ghost-sm" onClick={() => navigate('/entries')}>Ver todas</button>
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
                          {new Date(entry.date + 'T12:00:00').toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="activity-amount">Q{(entry.total || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div>
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

