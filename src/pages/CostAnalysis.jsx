import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/layout/Layout';
import api from '../api/client';
import { 
  Calculator, 
  Settings2, 
  Cpu, 
  BarChart3, 
  Sliders, 
  Save, 
  RotateCcw, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  TrendingUp, 
  Layers, 
  DollarSign, 
  Package, 
  RefreshCw,
  Info
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import './CostAnalysis.css';

// Formateador monetario para Quetzales (ej: Q1,250.00 o -Q500.00)
const formatQ = (val) => {
  const num = Number(val) || 0;
  if (num < 0) {
    return `-Q${Math.abs(num).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }
  return `Q${num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

// Formateador para unidades
const formatUnits = (val) => {
  const num = Number(val) || 0;
  return num.toLocaleString('es-GT', { maximumFractionDigits: 2 });
};

// Formateador para porcentajes
const formatPct = (val) => {
  const num = Number(val) || 0;
  return `${num.toFixed(2)}%`;
};

// Datos de ejemplo académico
const EXAMPLE_DATA = {
  normalCapacity: 10000,
  actualProduction: 10000,
  unitsSold: 8000,
  unitSalePrice: 150,
  variableCosts: {
    directMaterials: 35,
    directLabor: 25,
    variableManufacturingOverhead: 10,
    variableSelling: 5
  },
  fixedCosts: {
    manufacturing: 120000,
    administration: 80000
  }
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

const CostAnalysis = () => {
  const [activeTab, setActiveTab] = useState('data'); // 'data' | 'engine' | 'dashboard' | 'whatif'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error'|'info', message: '' }

  // Inputs guardados en la base de datos (línea base)
  const [baseInputs, setBaseInputs] = useState(EXAMPLE_DATA);
  // Resultados del cálculo de la línea base
  const [baseResults, setBaseResults] = useState(null);

  // Formulario editable para Pestaña 1
  const [formData, setFormData] = useState(EXAMPLE_DATA);

  // Estado para Pestaña 4: Simulación What-If
  const [simulationPercentages, setSimulationPercentages] = useState({
    production: 0,
    sales: 0,
    price: 0,
    variableCosts: 0,
    fixedMfg: 0
  });
  const [simulatedInputs, setSimulatedInputs] = useState(null);
  const [simulatedResults, setSimulatedResults] = useState(null);

  // Cargar datos iniciales desde el backend
  const fetchAnalysisData = async () => {
    try {
      setLoading(true);
      setFeedback(null);
      const res = await api.get('/cost-analysis');
      if (res.data) {
        const inputs = res.data.inputs || EXAMPLE_DATA;
        setBaseInputs(inputs);
        setFormData(inputs);
        setBaseResults(res.data.results || null);
      }
    } catch (err) {
      console.error('Error al cargar análisis de costos:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Error al conectar con el servidor para cargar los datos.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysisData();
  }, []);

  // Manejo de cambios en formulario
  const handleInputChange = (field, value, nested = null) => {
    const numValue = value === '' ? '' : Math.max(0, parseFloat(value) || 0);
    setFormData(prev => {
      if (nested) {
        return {
          ...prev,
          [nested]: {
            ...prev[nested],
            [field]: numValue
          }
        };
      }
      return {
        ...prev,
        [field]: numValue
      };
    });
  };

  // Validaciones locales antes de enviar
  const validateInputsLocally = (inputs) => {
    if (Number(inputs.normalCapacity) <= 0) {
      return 'La capacidad normal debe ser mayor que cero.';
    }
    if (Number(inputs.unitsSold) > Number(inputs.actualProduction)) {
      return `Las ventas (${inputs.unitsSold}) no pueden superar la producción real (${inputs.actualProduction}) ya que no se contempla inventario inicial en este modelo.`;
    }
    return null;
  };

  // Guardar y calcular (PUT /api/cost-analysis)
  const handleSaveAndCalculate = async (e) => {
    e?.preventDefault();
    const validationError = validateInputsLocally(formData);
    if (validationError) {
      setFeedback({ type: 'error', message: validationError });
      return;
    }

    try {
      setSaving(true);
      setFeedback(null);
      const res = await api.put('/cost-analysis', formData);
      setBaseInputs(res.data.inputs);
      setBaseResults(res.data.results);
      setFeedback({
        type: 'success',
        message: res.data.message || 'Parámetros guardados y calculados con éxito.'
      });
      // Limpiar simulación para que se base en los nuevos datos
      resetSimulation(res.data.inputs);
    } catch (err) {
      console.error('Error al guardar:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Error al guardar parámetros de costos.'
      });
    } finally {
      setSaving(false);
    }
  };

  // Restablecer formulario a la línea base guardada
  const handleResetForm = () => {
    setFormData(baseInputs);
    setFeedback({
      type: 'info',
      message: 'Formulario restablecido a los valores guardados.'
    });
  };

  // Cargar ejemplo académico (solo llena el form, no guarda automáticamente)
  const handleLoadExample = () => {
    setFormData(EXAMPLE_DATA);
    setFeedback({
      type: 'info',
      message: 'Datos de ejemplo cargados en el formulario. Presiona "Guardar y calcular" para confirmar.'
    });
  };

  // -------------------------------------------------------------
  // SIMULACIÓN WHAT-IF (Pestaña 4)
  // -------------------------------------------------------------
  const runSimulation = async (newPercentages = null, overrideInputs = null) => {
    const percentages = newPercentages || simulationPercentages || {
      production: 0,
      sales: 0,
      price: 0,
      variableCosts: 0,
      fixedMfg: 0
    };
    if (newPercentages) {
      setSimulationPercentages(newPercentages);
    }
    let targetInputs;

    if (overrideInputs) {
      targetInputs = overrideInputs;
    } else {
      const prodMult = 1 + ((percentages.production || 0) / 100);
      const salesMult = 1 + ((percentages.sales || 0) / 100);
      const priceMult = 1 + ((percentages.price || 0) / 100);
      const varCostMult = 1 + ((percentages.variableCosts || 0) / 100);
      const fixedMfgMult = 1 + ((percentages.fixedMfg || 0) / 100);

      targetInputs = {
        normalCapacity: baseInputs.normalCapacity,
        actualProduction: Math.round(baseInputs.actualProduction * prodMult),
        unitsSold: Math.round(baseInputs.unitsSold * salesMult),
        unitSalePrice: Number((baseInputs.unitSalePrice * priceMult).toFixed(2)),
        variableCosts: {
          directMaterials: Number((baseInputs.variableCosts.directMaterials * varCostMult).toFixed(2)),
          directLabor: Number((baseInputs.variableCosts.directLabor * varCostMult).toFixed(2)),
          variableManufacturingOverhead: Number((baseInputs.variableCosts.variableManufacturingOverhead * varCostMult).toFixed(2)),
          variableSelling: Number((baseInputs.variableCosts.variableSelling * varCostMult).toFixed(2)),
        },
        fixedCosts: {
          manufacturing: Math.round(baseInputs.fixedCosts.manufacturing * fixedMfgMult),
          administration: baseInputs.fixedCosts.administration
        }
      };
    }

    // Validación preventiva en simulación
    if (targetInputs.unitsSold > targetInputs.actualProduction) {
      setFeedback({
        type: 'error',
        message: `Simulación inválida: Las ventas simuladas (${targetInputs.unitsSold}) superarían la producción real simulada (${targetInputs.actualProduction}).`
      });
      return;
    }

    try {
      setSimulating(true);
      const res = await api.post('/cost-analysis/simulate', targetInputs);
      setSimulatedInputs(res.data.inputs);
      setSimulatedResults(res.data.results);
      setFeedback(null);
    } catch (err) {
      console.error('Error en simulación:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Error al ejecutar la simulación.'
      });
    } finally {
      setSimulating(false);
    }
  };

  // Botón rápido académico: Producción +20%, Ventas iguales
  const handleQuickProductionPlus20 = () => {
    const updatedInputs = {
      ...baseInputs,
      actualProduction: Math.round(baseInputs.actualProduction * 1.2),
      // Ventas se mantienen exactamente iguales
      unitsSold: baseInputs.unitsSold
    };
    const nextPercentages = {
      production: 20,
      sales: 0,
      price: 0,
      variableCosts: 0,
      fixedMfg: 0
    };
    setSimulationPercentages(nextPercentages);
    runSimulation(nextPercentages, updatedInputs);
  };

  // Restablecer simulación
  const resetSimulation = (referenceBase = baseInputs) => {
    setSimulationPercentages({
      production: 0,
      sales: 0,
      price: 0,
      variableCosts: 0,
      fixedMfg: 0
    });
    setSimulatedInputs(null);
    setSimulatedResults(null);
  };

  // Preparar datos para gráficos del Dashboard
  const profitChartData = useMemo(() => {
    if (!baseResults) return [];
    return [
      {
        name: 'Costeo Absorbente',
        utilidad: baseResults.absorption.operatingProfit,
        fill: '#3b82f6'
      },
      {
        name: 'Costeo Directo',
        utilidad: baseResults.direct.operatingProfit,
        fill: '#10b981'
      }
    ];
  }, [baseResults]);

  const costsStructureData = useMemo(() => {
    if (!baseResults) return [];
    return [
      { name: 'Costos Fijos', value: baseResults.summary.totalFixedCosts },
      { name: 'Costos Variables Periodo', value: baseResults.summary.totalVariableCostsIncurred }
    ];
  }, [baseResults]);

  const unitCostCompositionData = useMemo(() => {
    if (!baseResults || !baseInputs) return [];
    return [
      { name: 'Materia Prima', valor: Number(baseInputs.variableCosts.directMaterials) || 0 },
      { name: 'Mano de Obra', valor: Number(baseInputs.variableCosts.directLabor) || 0 },
      { name: 'GIF Variable', valor: Number(baseInputs.variableCosts.variableManufacturingOverhead) || 0 },
      { name: 'Tasa Fija / GIF Fijo', valor: Number(baseResults.rates.fixedMfgRate) || 0 }
    ];
  }, [baseResults, baseInputs]);

  // Render tooltip común para Recharts
  const renderMoneyTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div style={{
        background: 'var(--surface-raised, #161618)',
        border: '1px solid var(--border, #333)',
        borderRadius: '8px',
        padding: '10px 14px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        fontSize: '13px'
      }}>
        <p style={{ fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary, #fff)' }}>
          {payload[0].name}
        </p>
        <p style={{ margin: 0, color: payload[0].payload.fill || 'var(--primary, #3b82f6)' }}>
          Monto: {formatQ(payload[0].value)}
        </p>
      </div>
    );
  };

  return (
    <Layout>
      <div className="cost-analysis-container">
        {/* ENCABEZADO DE LA PÁGINA */}
        <div className="cost-header-premium">
          <div className="cost-header-title">
            <div className="cost-icon-badge">
              <Calculator size={28} />
            </div>
            <div>
              <h1>Sistema de Diagnóstico de Costos y Margen de Contribución</h1>
              <p>Análisis dinámico mediante Costeo Absorbente y Costeo Directo</p>
            </div>
          </div>
          <div className="cost-header-actions">
            <button 
              className="btn-glass"
              onClick={fetchAnalysisData}
              disabled={loading}
              title="Recargar datos del servidor"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {/* MENSAJES DE FEEDBACK / ALERTA */}
        <AnimatePresence>
          {feedback && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }}
              className={`cost-alert ${feedback.type}`}
            >
              {feedback.type === 'error' && <AlertTriangle size={20} />}
              {feedback.type === 'success' && <CheckCircle2 size={20} />}
              {feedback.type === 'info' && <Info size={20} />}
              <span>{feedback.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* NAVEGACIÓN POR PESTAÑAS */}
        <div className="cost-nav-tabs">
          <button 
            className={`cost-tab-button ${activeTab === 'data' ? 'active' : ''}`}
            onClick={() => setActiveTab('data')}
          >
            <Settings2 size={18} />
            <span>1. Datos</span>
          </button>
          <button 
            className={`cost-tab-button ${activeTab === 'engine' ? 'active' : ''}`}
            onClick={() => setActiveTab('engine')}
          >
            <Cpu size={18} />
            <span>2. Motor de Cálculo</span>
          </button>
          <button 
            className={`cost-tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <BarChart3 size={18} />
            <span>3. Dashboard</span>
          </button>
          <button 
            className={`cost-tab-button ${activeTab === 'whatif' ? 'active' : ''}`}
            onClick={() => setActiveTab('whatif')}
          >
            <Sliders size={18} />
            <span>4. Simulación What-If</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* PESTAÑA 1: DATOS / PARÁMETROS DINÁMICOS */}
        {/* ======================================================== */}
        {activeTab === 'data' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <form onSubmit={handleSaveAndCalculate}>
              <div className="cost-form-grid">
                {/* Tarjeta 1: Producción y Ventas */}
                <div className="cost-card">
                  <div className="cost-card-header">
                    <Package size={20} color="var(--primary)" />
                    <h3>Producción y Ventas</h3>
                  </div>
                  <div className="cost-card-body">
                    <div className="cost-field">
                      <label className="cost-field-label">Capacidad Normal (Unidades)</label>
                      <input 
                        type="number"
                        min="1"
                        step="1"
                        required
                        className="cost-field-input"
                        value={formData.normalCapacity}
                        onChange={(e) => handleInputChange('normalCapacity', e.target.value)}
                        placeholder="Ej. 10000"
                      />
                      <span className="cost-field-help">Base para calcular la tasa fija unitaria (mayor a cero).</span>
                    </div>

                    <div className="cost-field">
                      <label className="cost-field-label">Producción Real (Unidades)</label>
                      <input 
                        type="number"
                        min="0"
                        step="1"
                        required
                        className="cost-field-input"
                        value={formData.actualProduction}
                        onChange={(e) => handleInputChange('actualProduction', e.target.value)}
                        placeholder="Ej. 10000"
                      />
                      <span className="cost-field-help">Unidades efectivamente fabricadas en el período.</span>
                    </div>

                    <div className="cost-field">
                      <label className="cost-field-label">Ventas (Unidades)</label>
                      <input 
                        type="number"
                        min="0"
                        step="1"
                        required
                        className="cost-field-input"
                        value={formData.unitsSold}
                        onChange={(e) => handleInputChange('unitsSold', e.target.value)}
                        placeholder="Ej. 8000"
                      />
                      <span className="cost-field-help">Debe ser menor o igual a la producción real (sin inv. inicial).</span>
                    </div>

                    <div className="cost-field">
                      <label className="cost-field-label">Precio de Venta Unitario</label>
                      <div className="cost-field-input-wrap">
                        <span className="cost-field-prefix">Q</span>
                        <input 
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          className="cost-field-input with-prefix"
                          value={formData.unitSalePrice}
                          onChange={(e) => handleInputChange('unitSalePrice', e.target.value)}
                          placeholder="Ej. 150.00"
                        />
                      </div>
                      <span className="cost-field-help">Precio de factura por cada unidad comercializada.</span>
                    </div>
                  </div>
                </div>

                {/* Tarjeta 2: Costos Variables Unitarios */}
                <div className="cost-card">
                  <div className="cost-card-header">
                    <TrendingUp size={20} color="var(--success)" />
                    <h3>Costos Variables Unitarios</h3>
                  </div>
                  <div className="cost-card-body">
                    <div className="cost-field">
                      <label className="cost-field-label">Materia Prima Directa / Unidad</label>
                      <div className="cost-field-input-wrap">
                        <span className="cost-field-prefix">Q</span>
                        <input 
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          className="cost-field-input with-prefix"
                          value={formData.variableCosts.directMaterials}
                          onChange={(e) => handleInputChange('directMaterials', e.target.value, 'variableCosts')}
                          placeholder="Ej. 35.00"
                        />
                      </div>
                    </div>

                    <div className="cost-field">
                      <label className="cost-field-label">Mano de Obra Directa / Unidad</label>
                      <div className="cost-field-input-wrap">
                        <span className="cost-field-prefix">Q</span>
                        <input 
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          className="cost-field-input with-prefix"
                          value={formData.variableCosts.directLabor}
                          onChange={(e) => handleInputChange('directLabor', e.target.value, 'variableCosts')}
                          placeholder="Ej. 25.00"
                        />
                      </div>
                    </div>

                    <div className="cost-field">
                      <label className="cost-field-label">GIF Variables / Unidad</label>
                      <div className="cost-field-input-wrap">
                        <span className="cost-field-prefix">Q</span>
                        <input 
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          className="cost-field-input with-prefix"
                          value={formData.variableCosts.variableManufacturingOverhead}
                          onChange={(e) => handleInputChange('variableManufacturingOverhead', e.target.value, 'variableCosts')}
                          placeholder="Ej. 10.00"
                        />
                      </div>
                    </div>

                    <div className="cost-field">
                      <label className="cost-field-label">Gastos Variables de Venta / Unidad</label>
                      <div className="cost-field-input-wrap">
                        <span className="cost-field-prefix">Q</span>
                        <input 
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          className="cost-field-input with-prefix"
                          value={formData.variableCosts.variableSelling}
                          onChange={(e) => handleInputChange('variableSelling', e.target.value, 'variableCosts')}
                          placeholder="Ej. 5.00"
                        />
                      </div>
                      <span className="cost-field-help">Comisiones o empaque variable por venta.</span>
                    </div>
                  </div>
                </div>

                {/* Tarjeta 3: Costos Fijos Totales */}
                <div className="cost-card">
                  <div className="cost-card-header">
                    <DollarSign size={20} color="var(--warning)" />
                    <h3>Costos Fijos Totales</h3>
                  </div>
                  <div className="cost-card-body">
                    <div className="cost-field">
                      <label className="cost-field-label">Costos Fijos de Producción (GIF Fijos)</label>
                      <div className="cost-field-input-wrap">
                        <span className="cost-field-prefix">Q</span>
                        <input 
                          type="number"
                          min="0"
                          step="1"
                          required
                          className="cost-field-input with-prefix"
                          value={formData.fixedCosts.manufacturing}
                          onChange={(e) => handleInputChange('manufacturing', e.target.value, 'fixedCosts')}
                          placeholder="Ej. 120000"
                        />
                      </div>
                      <span className="cost-field-help">Depreciación de planta, sueldos de supervisión fija de fábrica, etc.</span>
                    </div>

                    <div className="cost-field">
                      <label className="cost-field-label">Gastos Fijos de Administración</label>
                      <div className="cost-field-input-wrap">
                        <span className="cost-field-prefix">Q</span>
                        <input 
                          type="number"
                          min="0"
                          step="1"
                          required
                          className="cost-field-input with-prefix"
                          value={formData.fixedCosts.administration}
                          onChange={(e) => handleInputChange('administration', e.target.value, 'fixedCosts')}
                          placeholder="Ej. 80000"
                        />
                      </div>
                      <span className="cost-field-help">Sueldos de administración, alquiler de oficinas generales.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="cost-form-actions">
                <button 
                  type="button" 
                  className="btn-glass"
                  onClick={handleLoadExample}
                >
                  <Sparkles size={16} />
                  <span>Cargar Ejemplo</span>
                </button>
                <button 
                  type="button" 
                  className="btn-glass"
                  onClick={handleResetForm}
                >
                  <RotateCcw size={16} />
                  <span>Restablecer</span>
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={saving}
                >
                  <Save size={16} />
                  <span>{saving ? 'Guardando...' : 'Guardar y Calcular'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* PESTAÑA 2: MOTOR DE CÁLCULO */}
        {/* ======================================================== */}
        {activeTab === 'engine' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {!baseResults ? (
              <div className="card text-center" style={{ padding: '40px' }}>
                <p>No hay cálculos disponibles. Ingresa y guarda los parámetros en la pestaña "Datos".</p>
              </div>
            ) : (
              <>
                {/* Métricas clave del motor */}
                <div className="metrics-row">
                  <div className="metric-pill">
                    <span className="metric-pill-label">Tasa Fija / Unidad</span>
                    <span className="metric-pill-value">{formatQ(baseResults.rates.fixedMfgRate)}</span>
                    <span className="metric-pill-sub">Fijos Fab. / Capacidad Normal</span>
                  </div>

                  <div className="metric-pill">
                    <span className="metric-pill-label">CV Fabricación / Unidad</span>
                    <span className="metric-pill-value">{formatQ(baseResults.rates.unitVariableMfgCost)}</span>
                    <span className="metric-pill-sub">MP + MO + GIF Variable</span>
                  </div>

                  <div className="metric-pill">
                    <span className="metric-pill-label">Costo Absorbente / Unidad</span>
                    <span className="metric-pill-value">{formatQ(baseResults.rates.unitAbsorptionCost)}</span>
                    <span className="metric-pill-sub">CV Fab. + Tasa Fija</span>
                  </div>

                  <div className="metric-pill">
                    <span className="metric-pill-label">Inventario Final</span>
                    <span className="metric-pill-value">{formatUnits(baseResults.inventory.endingInventory)} u</span>
                    <span className="metric-pill-sub">Producción Real - Ventas</span>
                  </div>

                  <div className="metric-pill">
                    <span className="metric-pill-label">Variación de Volumen</span>
                    <span className="metric-pill-value" style={{
                      color: baseResults.absorption.volumeVariance > 0.01 
                        ? 'var(--warning)' 
                        : baseResults.absorption.volumeVariance < -0.01 
                          ? 'var(--success)' 
                          : 'inherit'
                    }}>
                      {formatQ(baseResults.absorption.volumeVariance)}
                    </span>
                    <span className="metric-pill-sub">
                      {baseResults.absorption.volumeVarianceType === 'subaplicacion' && '⚠ Subaplicación (Desfavorable)'}
                      {baseResults.absorption.volumeVarianceType === 'sobreaplicacion' && '✓ Sobreaplicación (Favorable)'}
                      {baseResults.absorption.volumeVarianceType === 'exacta' && 'Exacta (Producción = Capacidad)'}
                    </span>
                  </div>
                </div>

                {/* Estados de Resultados Comparativos lado a lado */}
                <div className="statements-comparison">
                  {/* Costeo Absorbente */}
                  <div className="statement-card">
                    <div className="statement-header absorption">
                      <h3>Estado de Resultados — Costeo Absorbente</h3>
                      <span className="badge badge-info">Tradicional</span>
                    </div>
                    <table className="statement-table">
                      <tbody>
                        <tr>
                          <td>Ventas ({formatUnits(baseResults.inventory.unitsSold)} u × {formatQ(baseInputs.unitSalePrice)})</td>
                          <td className="amount">{formatQ(baseResults.absorption.revenue)}</td>
                        </tr>
                        <tr>
                          <td>(-) Costo de Ventas Absorbente ({formatUnits(baseResults.inventory.unitsSold)} u × {formatQ(baseResults.rates.unitAbsorptionCost)})</td>
                          <td className="amount">({formatQ(baseResults.absorption.cogs)})</td>
                        </tr>
                        <tr className="subtotal">
                          <td>= Margen / Utilidad Bruta antes de Variación</td>
                          <td className="amount">{formatQ(baseResults.absorption.grossMarginBeforeVariance)}</td>
                        </tr>
                        <tr>
                          <td>
                            {baseResults.absorption.volumeVariance >= 0 ? '(-)' : '(+)'} Variación de Capacidad/Volumen ({baseResults.absorption.volumeVarianceType})
                          </td>
                          <td className="amount">
                            {baseResults.absorption.volumeVariance >= 0 
                              ? `(${formatQ(baseResults.absorption.volumeVariance)})` 
                              : formatQ(Math.abs(baseResults.absorption.volumeVariance))}
                          </td>
                        </tr>
                        <tr>
                          <td>(-) Gastos Variables de Venta</td>
                          <td className="amount">({formatQ(baseResults.absorption.variableSellingExpenses)})</td>
                        </tr>
                        <tr>
                          <td>(-) Gastos Fijos de Administración</td>
                          <td className="amount">({formatQ(baseResults.absorption.fixedAdminExpenses)})</td>
                        </tr>
                        <tr className="total-profit">
                          <td>= Utilidad de Operación — Costeo Absorbente</td>
                          <td className={`amount ${baseResults.absorption.operatingProfit >= 0 ? 'positive' : 'negative'}`}>
                            {formatQ(baseResults.absorption.operatingProfit)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Costeo Directo */}
                  <div className="statement-card">
                    <div className="statement-header direct">
                      <h3>Estado de Resultados — Costeo Directo</h3>
                      <span className="badge badge-success">Marginal</span>
                    </div>
                    <table className="statement-table">
                      <tbody>
                        <tr>
                          <td>Ventas ({formatUnits(baseResults.inventory.unitsSold)} u × {formatQ(baseInputs.unitSalePrice)})</td>
                          <td className="amount">{formatQ(baseResults.direct.revenue)}</td>
                        </tr>
                        <tr>
                          <td>(-) Costo Variable de Ventas ({formatUnits(baseResults.inventory.unitsSold)} u × {formatQ(baseResults.rates.unitVariableMfgCost)})</td>
                          <td className="amount">({formatQ(baseResults.direct.variableCogs)})</td>
                        </tr>
                        <tr>
                          <td>(-) Gastos Variables de Venta</td>
                          <td className="amount">({formatQ(baseResults.direct.variableSellingExpenses)})</td>
                        </tr>
                        <tr className="subtotal">
                          <td>= Margen de Contribución Total ({formatPct(baseResults.direct.contributionMarginRatio)})</td>
                          <td className="amount">{formatQ(baseResults.direct.contributionMargin)}</td>
                        </tr>
                        <tr>
                          <td>(-) Costos Fijos de Producción (del período)</td>
                          <td className="amount">({formatQ(baseResults.direct.fixedMfgExpenses)})</td>
                        </tr>
                        <tr>
                          <td>(-) Gastos Fijos de Administración</td>
                          <td className="amount">({formatQ(baseResults.direct.fixedAdminExpenses)})</td>
                        </tr>
                        <tr className="total-profit">
                          <td>= Utilidad de Operación — Costeo Directo</td>
                          <td className={`amount ${baseResults.direct.operatingProfit >= 0 ? 'positive' : 'negative'}`}>
                            {formatQ(baseResults.direct.operatingProfit)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sección de Reconciliación de Utilidades */}
                <div className="reconciliation-panel">
                  <div className="reconciliation-header">
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                        Reconciliación de Utilidades
                      </h3>
                      <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                        Demostración matemática de la diferencia entre ambos métodos de costeo
                      </p>
                    </div>
                    <div className={`reconciliation-status-badge ${baseResults.reconciliation.isReconciled ? 'ok' : 'warning'}`}>
                      {baseResults.reconciliation.isReconciled ? (
                        <>
                          <CheckCircle2 size={18} />
                          <span>✓ Reconciliación correcta</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={18} />
                          <span>⚠ Revisar reconciliación</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="reconciliation-grid">
                    <div className="reconciliation-item">
                      <div className="reconciliation-item-label">Utilidad Absorbente</div>
                      <div className="reconciliation-item-val">{formatQ(baseResults.reconciliation.absorptionProfit)}</div>
                    </div>

                    <div className="reconciliation-item">
                      <div className="reconciliation-item-label">Utilidad Directa</div>
                      <div className="reconciliation-item-val">{formatQ(baseResults.reconciliation.directProfit)}</div>
                    </div>

                    <div className="reconciliation-item">
                      <div className="reconciliation-item-label">Diferencia Real (Abs - Dir)</div>
                      <div className="reconciliation-item-val" style={{ color: 'var(--primary)' }}>
                        {formatQ(baseResults.reconciliation.profitDifference)}
                      </div>
                    </div>

                    <div className="reconciliation-item">
                      <div className="reconciliation-item-label">Variación Inventario (u)</div>
                      <div className="reconciliation-item-val">{formatUnits(baseResults.reconciliation.inventoryVariation)} u</div>
                    </div>

                    <div className="reconciliation-item">
                      <div className="reconciliation-item-label">Tasa Fija / Unidad</div>
                      <div className="reconciliation-item-val">{formatQ(baseResults.reconciliation.fixedMfgRate)}</div>
                    </div>

                    <div className="reconciliation-item">
                      <div className="reconciliation-item-label">Costo Fijo en Inv. (ΔInv × Tasa)</div>
                      <div className="reconciliation-item-val" style={{ color: 'var(--success)' }}>
                        {formatQ(baseResults.reconciliation.fixedCostInInventory)}
                      </div>
                    </div>
                  </div>

                  <div className="reconciliation-formula-note">
                    <strong>Fórmula Teórica: </strong> 
                    Utilidad Absorbente - Utilidad Directa = Variación Inventario × Tasa Fija
                    <br />
                    <span>
                      Diferencia residual detectada: {formatQ(baseResults.reconciliation.reconciliationDifference)} (Tolerancia: &lt; Q0.01)
                    </span>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* PESTAÑA 3: DASHBOARD VISUAL */}
        {/* ======================================================== */}
        {activeTab === 'dashboard' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {!baseResults ? (
              <div className="card text-center" style={{ padding: '40px' }}>
                <p>No hay datos calculados para mostrar en el Dashboard.</p>
              </div>
            ) : (
              <>
                {/* KPI Obligatorios */}
                <div className="dashboard-kpi-grid">
                  <div className="kpi-card">
                    <div className="kpi-icon-box green">
                      <TrendingUp size={24} />
                    </div>
                    <div className="kpi-content">
                      <span className="kpi-label">Margen de Contribución Total</span>
                      <span className="kpi-value">{formatQ(baseResults.direct.contributionMargin)}</span>
                    </div>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-icon-box purple">
                      <BarChart3 size={24} />
                    </div>
                    <div className="kpi-content">
                      <span className="kpi-label">Margen de Contribución %</span>
                      <span className="kpi-value">{formatPct(baseResults.direct.contributionMarginRatio)}</span>
                    </div>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-icon-box blue">
                      <Layers size={24} />
                    </div>
                    <div className="kpi-content">
                      <span className="kpi-label">Utilidad Operación (Absorbente)</span>
                      <span className="kpi-value" style={{
                        color: baseResults.absorption.operatingProfit >= 0 ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {formatQ(baseResults.absorption.operatingProfit)}
                      </span>
                    </div>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-icon-box amber">
                      <DollarSign size={24} />
                    </div>
                    <div className="kpi-content">
                      <span className="kpi-label">Utilidad Operación (Directo)</span>
                      <span className="kpi-value" style={{
                        color: baseResults.direct.operatingProfit >= 0 ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {formatQ(baseResults.direct.operatingProfit)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Gráficos */}
                <div className="dashboard-charts-grid">
                  {/* Gráfico 1: Comparación de Utilidad */}
                  <div className="chart-card">
                    <div className="chart-card-header">
                      <h3>Comparación de Utilidad</h3>
                      <span className="badge badge-info">Absorbente vs Directo</span>
                    </div>
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={280} minWidth={0}>
                        <BarChart data={profitChartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                          <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} />
                          <YAxis 
                            stroke="var(--text-secondary)" 
                            tick={{ fill: 'var(--text-secondary)' }}
                            tickFormatter={(v) => `Q${(v / 1000).toFixed(0)}k`}
                          />
                          <Tooltip content={renderMoneyTooltip} />
                          <Bar dataKey="utilidad" radius={[6, 6, 0, 0]}>
                            {profitChartData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.utilidad >= 0 ? entry.fill : '#ef4444'} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Gráfico 2: Costos Fijos vs Variables */}
                  <div className="chart-card">
                    <div className="chart-card-header">
                      <h3>Costos Fijos vs. Variables del Período</h3>
                      <span className="badge badge-muted">Estructura de Costos</span>
                    </div>
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={280} minWidth={0}>
                        <PieChart>
                          <Pie
                            data={costsStructureData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={85}
                            innerRadius={50}
                            paddingAngle={5}
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          >
                            <Cell fill="#f59e0b" />
                            <Cell fill="#3b82f6" />
                          </Pie>
                          <Tooltip content={renderMoneyTooltip} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Gráfico 3 (Opcional): Composición del Costo Unitario Absorbente */}
                  <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                    <div className="chart-card-header">
                      <h3>Composición del Costo Unitario Absorbente</h3>
                      <span className="badge badge-success">Total: {formatQ(baseResults.rates.unitAbsorptionCost)} / unidad</span>
                    </div>
                    <div className="chart-container" style={{ height: '220px' }}>
                      <ResponsiveContainer width="100%" height={220} minWidth={0}>
                        <BarChart layout="vertical" data={unitCostCompositionData} margin={{ top: 10, right: 30, left: 100, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                          <XAxis type="number" stroke="var(--text-secondary)" tickFormatter={(v) => `Q${v}`} />
                          <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" width={90} />
                          <Tooltip content={renderMoneyTooltip} />
                          <Bar dataKey="valor" fill="#8b5cf6" radius={[0, 6, 6, 0]}>
                            {unitCostCompositionData.map((_, i) => (
                              <Cell key={`bar-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* PESTAÑA 4: SIMULACIÓN WHAT-IF */}
        {/* ======================================================== */}
        {activeTab === 'whatif' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="what-if-control-panel">
              <div className="what-if-header">
                <div>
                  <h3>Panel de Simulación de Escenarios (Sensibilidad)</h3>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                    Simula variaciones porcentuales sin alterar los datos base guardados en Firestore.
                  </p>
                </div>
                <div className="what-if-badge">
                  Simulación Activa en Memoria
                </div>
              </div>

              {/* Sliders de Variación */}
              <div className="what-if-sliders-grid">
                <div className="simulation-control">
                  <div className="sim-control-top">
                    <span className="sim-control-label">Producción Real</span>
                    <span className="sim-control-val">{simulationPercentages.production > 0 ? `+${simulationPercentages.production}` : simulationPercentages.production}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="-50" 
                    max="100" 
                    step="5"
                    className="sim-slider"
                    value={simulationPercentages.production}
                    onChange={(e) => {
                      const newP = { ...simulationPercentages, production: parseFloat(e.target.value) };
                      runSimulation(newP);
                    }}
                  />
                </div>

                <div className="simulation-control">
                  <div className="sim-control-top">
                    <span className="sim-control-label">Ventas (Unidades)</span>
                    <span className="sim-control-val">{simulationPercentages.sales > 0 ? `+${simulationPercentages.sales}` : simulationPercentages.sales}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="-50" 
                    max="100" 
                    step="5"
                    className="sim-slider"
                    value={simulationPercentages.sales}
                    onChange={(e) => {
                      const newP = { ...simulationPercentages, sales: parseFloat(e.target.value) };
                      runSimulation(newP);
                    }}
                  />
                </div>

                <div className="simulation-control">
                  <div className="sim-control-top">
                    <span className="sim-control-label">Precio de Venta</span>
                    <span className="sim-control-val">{simulationPercentages.price > 0 ? `+${simulationPercentages.price}` : simulationPercentages.price}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="-50" 
                    max="50" 
                    step="5"
                    className="sim-slider"
                    value={simulationPercentages.price}
                    onChange={(e) => {
                      const newP = { ...simulationPercentages, price: parseFloat(e.target.value) };
                      runSimulation(newP);
                    }}
                  />
                </div>

                <div className="simulation-control">
                  <div className="sim-control-top">
                    <span className="sim-control-label">Costos Variables</span>
                    <span className="sim-control-val">{simulationPercentages.variableCosts > 0 ? `+${simulationPercentages.variableCosts}` : simulationPercentages.variableCosts}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="-50" 
                    max="50" 
                    step="5"
                    className="sim-slider"
                    value={simulationPercentages.variableCosts}
                    onChange={(e) => {
                      const newP = { ...simulationPercentages, variableCosts: parseFloat(e.target.value) };
                      runSimulation(newP);
                    }}
                  />
                </div>

                <div className="simulation-control">
                  <div className="sim-control-top">
                    <span className="sim-control-label">Costos Fijos de Fab.</span>
                    <span className="sim-control-val">{simulationPercentages.fixedMfg > 0 ? `+${simulationPercentages.fixedMfg}` : simulationPercentages.fixedMfg}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="-50" 
                    max="50" 
                    step="5"
                    className="sim-slider"
                    value={simulationPercentages.fixedMfg}
                    onChange={(e) => {
                      const newP = { ...simulationPercentages, fixedMfg: parseFloat(e.target.value) };
                      runSimulation(newP);
                    }}
                  />
                </div>
              </div>

              {/* Botones de Escenarios Rápidos */}
              <div className="what-if-quick-actions">
                <button 
                  type="button" 
                  className="btn-primary"
                  onClick={handleQuickProductionPlus20}
                  disabled={simulating}
                >
                  <Sparkles size={16} />
                  <span>Escenario Académico: Producción +20% (Ventas iguales)</span>
                </button>
                <button 
                  type="button" 
                  className="btn-glass"
                  onClick={() => resetSimulation()}
                  disabled={simulating}
                >
                  <RotateCcw size={16} />
                  <span>Restablecer Simulación</span>
                </button>
              </div>
            </div>

            {/* Tabla Comparativa: Escenario Base vs Escenario Simulado */}
            <div className="comparison-table-card">
              <div className="comparison-table-header">
                <h3>Escenario Base vs. Escenario Simulado</h3>
                {simulatedResults && (
                  <span className="badge badge-info">
                    {simulating ? 'Calculando...' : 'Simulación actualizada'}
                  </span>
                )}
              </div>
              <div className="comparison-table-wrapper">
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th>Variable / Indicador</th>
                      <th>Escenario Base</th>
                      <th>Escenario Simulado</th>
                      <th>Diferencia Absoluta</th>
                      <th>Diferencia %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Producción Real */}
                    {(() => {
                      const base = baseInputs.actualProduction;
                      const sim = simulatedInputs ? simulatedInputs.actualProduction : base;
                      const diff = sim - base;
                      const pct = base > 0 ? (diff / base) * 100 : 0;
                      return (
                        <tr>
                          <td>Producción Real (Unidades)</td>
                          <td>{formatUnits(base)}</td>
                          <td>{formatUnits(sim)}</td>
                          <td className={diff > 0 ? 'diff-positive' : diff < 0 ? 'diff-negative' : 'diff-neutral'}>
                            {diff > 0 ? `+${formatUnits(diff)}` : formatUnits(diff)}
                          </td>
                          <td className={diff > 0 ? 'diff-positive' : diff < 0 ? 'diff-negative' : 'diff-neutral'}>
                            {formatPct(pct)}
                          </td>
                        </tr>
                      );
                    })()}

                    {/* Ventas */}
                    {(() => {
                      const base = baseInputs.unitsSold;
                      const sim = simulatedInputs ? simulatedInputs.unitsSold : base;
                      const diff = sim - base;
                      const pct = base > 0 ? (diff / base) * 100 : 0;
                      return (
                        <tr>
                          <td>Ventas (Unidades)</td>
                          <td>{formatUnits(base)}</td>
                          <td>{formatUnits(sim)}</td>
                          <td className={diff > 0 ? 'diff-positive' : diff < 0 ? 'diff-negative' : 'diff-neutral'}>
                            {diff > 0 ? `+${formatUnits(diff)}` : formatUnits(diff)}
                          </td>
                          <td className={diff > 0 ? 'diff-positive' : diff < 0 ? 'diff-negative' : 'diff-neutral'}>
                            {formatPct(pct)}
                          </td>
                        </tr>
                      );
                    })()}

                    {/* Margen de Contribución */}
                    {(() => {
                      const base = baseResults?.direct.contributionMargin || 0;
                      const sim = simulatedResults ? simulatedResults.direct.contributionMargin : base;
                      const diff = sim - base;
                      const pct = base > 0 ? (diff / base) * 100 : 0;
                      return (
                        <tr>
                          <td>Margen de Contribución Total</td>
                          <td>{formatQ(base)}</td>
                          <td>{formatQ(sim)}</td>
                          <td className={diff > 0 ? 'diff-positive' : diff < 0 ? 'diff-negative' : 'diff-neutral'}>
                            {diff > 0 ? `+${formatQ(diff)}` : formatQ(diff)}
                          </td>
                          <td className={diff > 0 ? 'diff-positive' : diff < 0 ? 'diff-negative' : 'diff-neutral'}>
                            {formatPct(pct)}
                          </td>
                        </tr>
                      );
                    })()}

                    {/* Utilidad Absorbente */}
                    {(() => {
                      const base = baseResults?.absorption.operatingProfit || 0;
                      const sim = simulatedResults ? simulatedResults.absorption.operatingProfit : base;
                      const diff = sim - base;
                      const pct = base !== 0 ? (diff / Math.abs(base)) * 100 : 0;
                      return (
                        <tr style={{ background: 'rgba(59, 130, 246, 0.04)' }}>
                          <td><strong>Utilidad de Operación (Absorbente)</strong></td>
                          <td><strong>{formatQ(base)}</strong></td>
                          <td><strong>{formatQ(sim)}</strong></td>
                          <td className={diff > 0 ? 'diff-positive' : diff < 0 ? 'diff-negative' : 'diff-neutral'}>
                            <strong>{diff > 0 ? `+${formatQ(diff)}` : formatQ(diff)}</strong>
                          </td>
                          <td className={diff > 0 ? 'diff-positive' : diff < 0 ? 'diff-negative' : 'diff-neutral'}>
                            <strong>{formatPct(pct)}</strong>
                          </td>
                        </tr>
                      );
                    })()}

                    {/* Utilidad Directa */}
                    {(() => {
                      const base = baseResults?.direct.operatingProfit || 0;
                      const sim = simulatedResults ? simulatedResults.direct.operatingProfit : base;
                      const diff = sim - base;
                      const pct = base !== 0 ? (diff / Math.abs(base)) * 100 : 0;
                      return (
                        <tr style={{ background: 'rgba(16, 185, 129, 0.04)' }}>
                          <td><strong>Utilidad de Operación (Directo)</strong></td>
                          <td><strong>{formatQ(base)}</strong></td>
                          <td><strong>{formatQ(sim)}</strong></td>
                          <td className={diff > 0 ? 'diff-positive' : diff < 0 ? 'diff-negative' : 'diff-neutral'}>
                            <strong>{diff > 0 ? `+${formatQ(diff)}` : formatQ(diff)}</strong>
                          </td>
                          <td className={diff > 0 ? 'diff-positive' : diff < 0 ? 'diff-negative' : 'diff-neutral'}>
                            <strong>{formatPct(pct)}</strong>
                          </td>
                        </tr>
                      );
                    })()}

                    {/* Inventario Final */}
                    {(() => {
                      const base = baseResults?.inventory.endingInventory || 0;
                      const sim = simulatedResults ? simulatedResults.inventory.endingInventory : base;
                      const diff = sim - base;
                      const pct = base > 0 ? (diff / base) * 100 : 0;
                      return (
                        <tr>
                          <td>Inventario Final (Unidades)</td>
                          <td>{formatUnits(base)} u</td>
                          <td>{formatUnits(sim)} u</td>
                          <td className={diff > 0 ? 'diff-positive' : diff < 0 ? 'diff-negative' : 'diff-neutral'}>
                            {diff > 0 ? `+${formatUnits(diff)}` : formatUnits(diff)} u
                          </td>
                          <td className={diff > 0 ? 'diff-positive' : diff < 0 ? 'diff-negative' : 'diff-neutral'}>
                            {formatPct(pct)}
                          </td>
                        </tr>
                      );
                    })()}

                    {/* Variación de Capacidad/Volumen */}
                    {(() => {
                      const base = baseResults?.absorption.volumeVariance || 0;
                      const sim = simulatedResults ? simulatedResults.absorption.volumeVariance : base;
                      const diff = sim - base;
                      return (
                        <tr>
                          <td>Variación de Capacidad / Volumen</td>
                          <td>{formatQ(base)}</td>
                          <td>{formatQ(sim)}</td>
                          <td className="diff-neutral">
                            {diff > 0 ? `+${formatQ(diff)}` : formatQ(diff)}
                          </td>
                          <td className="diff-neutral">—</td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </Layout>
  );
};

export default CostAnalysis;
