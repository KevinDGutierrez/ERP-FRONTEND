import React from 'react';
import Layout from '../components/layout/Layout';
import { motion } from 'framer-motion';
import { TrendingUp, Users, DollarSign, Package } from 'lucide-react';
import './Dashboard.css';

const StatCard = ({ title, value, icon, trend, color }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="stat-card"
  >
    <div className={`stat-icon ${color}`}>
      {icon}
    </div>
    <div className="stat-content">
      <p className="stat-title">{title}</p>
      <h3 className="stat-value">{value}</h3>
      {trend && <span className="stat-trend">↑ {trend}% este mes</span>}
    </div>
  </motion.div>
);

const Dashboard = () => {
  return (
    <Layout>
      <div className="dashboard-container">
        <header className="page-header">
          <div>
            <h1>Dashboard</h1>
            <p>Bienvenido al centro de control contable.</p>
          </div>
          <div className="date-display">
            {new Date().toLocaleDateString('es-GT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>

        <div className="stats-grid">
          <StatCard 
            title="Activos Totales" 
            value="Q150,240.00" 
            icon={<DollarSign />} 
            color="blue"
            trend="12"
          />
          <StatCard 
            title="Ventas del Mes" 
            value="Q24,500.00" 
            icon={<TrendingUp />} 
            color="green"
          />
          <StatCard 
            title="Colaboradores" 
            value="12" 
            icon={<Users />} 
            color="purple"
          />
          <StatCard 
            title="Inventario" 
            value="Q45,800.00" 
            icon={<Package />} 
            color="orange"
          />
        </div>

        <div className="dashboard-grid">
          <div className="main-chart-card">
            <h3>Flujo de Efectivo</h3>
            <div className="chart-placeholder">
              {/* Aquí irán los gráficos de Recharts */}
              <p>Gráfico de barras cargando...</p>
            </div>
          </div>
          <div className="recent-activity-card">
            <h3>Últimas Partidas</h3>
            <div className="activity-list">
              <div className="activity-item">
                <div className="activity-indicator success"></div>
                <div className="activity-info">
                  <p className="activity-desc">Venta al contado - Factura #501</p>
                  <span className="activity-time">Hace 2 horas</span>
                </div>
                <div className="activity-amount">Q1,120.00</div>
              </div>
              <div className="activity-item">
                <div className="activity-indicator danger"></div>
                <div className="activity-info">
                  <p className="activity-desc">Pago de Planilla - Mayo 2026</p>
                  <span className="activity-time">Hace 5 horas</span>
                </div>
                <div className="activity-amount">-Q5,000.00</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
