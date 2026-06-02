import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import api from '../api/client';
import { 
  Plus, 
  Trash2, 
  Save, 
  FileText, 
  Calendar, 
  AlertTriangle,
  CheckCircle2,
  PlusCircle
} from 'lucide-react';
import './NewEntry.css';

const SearchableSelect = ({ value, onChange, options, placeholder, required }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = React.useRef(null);

  useEffect(() => {
    const selected = options.find(o => o.id === value);
    if (selected) {
      setSearch(`[${selected.code}] ${selected.name}`);
    } else {
      setSearch('');
    }
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        const selected = options.find(o => o.id === value);
        setSearch(selected ? `[${selected.code}] ${selected.name}` : '');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, options]);

  const filteredOptions = options.filter(o => 
    o.name.toLowerCase().includes(search.toLowerCase()) || 
    o.code.includes(search)
  );

  return (
    <div className="searchable-select" ref={wrapperRef} style={{ position: 'relative' }}>
      <input
        type="text"
        className="account-select"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setIsOpen(true);
          onChange('');
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        required={required && !value}
        style={{ width: '100%', boxSizing: 'border-box' }}
      />
      {isOpen && (
        <div className="searchable-dropdown" style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          maxHeight: '200px',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-card, white)',
          border: '1px solid var(--border, #e5e7eb)',
          borderRadius: '6px',
          zIndex: 50,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          {filteredOptions.length > 0 ? filteredOptions.map(opt => (
            <div 
              key={opt.id}
              style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border, #f3f4f6)', color: 'var(--text-primary, #374151)', fontSize: '0.9rem' }}
              onMouseDown={() => {
                onChange(opt.id);
                setSearch(`[${opt.code}] ${opt.name}`);
                setIsOpen(false);
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-hover, #f3f4f6)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <span style={{ fontWeight: 600, marginRight: '8px', color: 'var(--primary)' }}>[{opt.code}]</span>
              {opt.name}
            </div>
          )) : (
            <div style={{ padding: '8px 12px', color: '#9ca3af', fontSize: '0.9rem' }}>No se encontraron cuentas</div>
          )}
        </div>
      )}
    </div>
  );
};

const NewEntry = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    type: 'DIARIO',
    details: [
      { accountId: '', debit: 0, credit: 0 },
      { accountId: '', debit: 0, credit: 0 }
    ]
  });

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await api.get('/accounts');
        setAccounts(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Error fetching accounts:', err);
      }
    };
    fetchAccounts();
  }, []);

  const handleDetailChange = (index, field, value) => {
    const newDetails = [...formData.details];
    newDetails[index][field] = field === 'accountId' ? value : parseFloat(value || 0);
    setFormData({ ...formData, details: newDetails });
  };

  const addRow = () => {
    setFormData({
      ...formData,
      details: [...formData.details, { accountId: '', debit: 0, credit: 0 }]
    });
  };

  const removeRow = (index) => {
    if (formData.details.length <= 2) return;
    const newDetails = formData.details.filter((_, i) => i !== index);
    setFormData({ ...formData, details: newDetails });
  };

  const totalDebe = formData.details.reduce((acc, d) => acc + (d.debit || 0), 0);
  const totalHaber = formData.details.reduce((acc, d) => acc + (d.credit || 0), 0);
  const isSquared = Math.abs(totalDebe - totalHaber) < 0.01;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const hasEmptyAccounts = formData.details.some(d => !d.accountId);
    if (hasEmptyAccounts) {
      setError('Por favor, selecciona una cuenta válida en todas las líneas de la partida.');
      return;
    }
    if (!isSquared) {
      setError('La partida no está cuadrada (Debe != Haber)');
      return;
    }
    if (!formData.description.trim()) {
      setError('La descripción es obligatoria');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.post('/entries', formData);
      setSuccess(true);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        description: '',
        type: 'DIARIO',
        details: [
          { accountId: '', debit: 0, credit: 0 },
          { accountId: '', debit: 0, credit: 0 }
        ]
      });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar la partida');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="new-entry-container">
        <header className="page-header-premium">
          <div className="title-section">
            <div className="icon-badge">
              <PlusCircle size={24} />
            </div>
            <div>
              <h1>Nueva Partida</h1>
              <p>Registra un nuevo movimiento contable en el sistema</p>
            </div>
          </div>
          
          <div className={`square-indicator ${isSquared ? 'squared' : 'not-squared'}`}>
            {isSquared ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            <span>{isSquared ? 'Partida Cuadrada' : 'No Cuadrada'}</span>
          </div>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="form-main-card card">
            <div className="form-header-grid">
              <div className="form-group">
                <label>Fecha Contable</label>
                <div className="input-with-icon">
                  <Calendar size={18} />
                  <input 
                    type="date" 
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Tipo de Comprobante</label>
                <select 
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  required
                >
                  <option value="DIARIO">Libro Diario</option>
                  <option value="AJUSTE">Ajuste Contable</option>
                  <option value="APERTURA">Apertura</option>
                  <option value="CIERRE">Cierre</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Descripción / Glosa</label>
              <textarea 
                placeholder="Escribe la descripción de la operación..."
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                required
              />
            </div>
          </div>

          <section className="entry-details-section">
            <div className="details-header">
              <FileText size={18} className="text-primary" />
              <h3>Detalle de Movimientos</h3>
            </div>

            <div className="details-table-container">
              <table className="details-table">
                <thead>
                  <tr>
                    <th>Cuenta Contable</th>
                    <th className="text-right" style={{width: '200px'}}>Debe (Q)</th>
                    <th className="text-right" style={{width: '200px'}}>Haber (Q)</th>
                    <th className="action-col"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.details.map((detail, index) => (
                    <tr key={index}>
                      <td>
                        <SearchableSelect
                          value={detail.accountId}
                          onChange={val => handleDetailChange(index, 'accountId', val)}
                          options={accounts}
                          placeholder="Buscar cuenta por nombre o código..."
                          required={true}
                        />
                      </td>
                      <td>
                        <input 
                          type="number" 
                          step="0.01"
                          className="amount-input"
                          placeholder="0.00"
                          value={detail.debit || ''}
                          onChange={e => handleDetailChange(index, 'debit', e.target.value)}
                        />
                      </td>
                      <td>
                        <input 
                          type="number" 
                          step="0.01"
                          className="amount-input"
                          placeholder="0.00"
                          value={detail.credit || ''}
                          onChange={e => handleDetailChange(index, 'credit', e.target.value)}
                        />
                      </td>
                      <td className="action-col">
                        <button 
                          type="button" 
                          className="remove-row-btn"
                          onClick={() => removeRow(index)}
                          disabled={formData.details.length <= 2}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="totals-row">
                    <td>
                      <button type="button" className="btn-add-row" onClick={addRow}>
                        <Plus size={16} /> Agregar línea
                      </button>
                    </td>
                    <td className={`total-cell ${!isSquared ? 'error' : ''}`}>
                      Q{totalDebe.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    </td>
                    <td className={`total-cell ${!isSquared ? 'error' : ''}`}>
                      Q{totalHaber.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <footer className="form-footer">
            {error && (
              <div className="alert-box error-alert">
                <AlertTriangle size={18} />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="alert-box success-alert">
                <CheckCircle2 size={18} />
                <span>Partida guardada exitosamente</span>
              </div>
            )}
            
            <div className="action-buttons">
              <button type="submit" className="btn-primary btn-save" disabled={loading}>
                {loading ? <div className="spinner-small"></div> : <><Save size={20} /> Guardar Partida</>}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </Layout>
  );
};

export default NewEntry;
