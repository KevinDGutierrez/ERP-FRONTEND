import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { motion } from 'framer-motion';
import { Building2, User, Phone, Briefcase, ArrowRight, LogOut, Camera, X } from 'lucide-react';
import { storage } from '../config/firebase';
import './Login.css';

const CompleteProfile = () => {
  const { user, profile, updateProfileData, logout } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [requestedCompany, setRequestedCompany] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await api.get('/companies');
        setCompanies(res.data.companies || []);
      } catch (err) {
        console.error('Error fetching companies:', err);
      }
    };
    fetchCompanies();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!requestedCompany && !companyId) {
      return setError('Debes indicar a qué empresa perteneces para enviar la solicitud.');
    }
    
    setLoading(true);
    try {
      // Photo upload removed per user request
      const photoURL = profile?.photoURL || null;

      const success = await updateProfileData({
        displayName,
        email: user.email,
        photoURL,
        provider: user.providerData[0]?.providerId === 'google.com' ? 'google' : (user.providerData[0]?.providerId || 'password'),
        status: 'pending',
        role: 'usuario',
        requestedCompany: companyId ? null : requestedCompany,
        companyId: companyId || null,
        phone,
        position,
        createdAt: profile?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      if (success) {
        navigate('/pending-approval');
      } else {
        setError('No se pudo actualizar el perfil.');
      }
    } catch (err) {
      setError('Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" aria-hidden>
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
      </div>

      <div className="auth-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <motion.div
          className="auth-panel"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ maxWidth: '500px' }}
        >
          <div className="auth-panel-header">
            <div className="auth-logo-mark">CP</div>
            <h2 className="auth-panel-title">Completa tu perfil</h2>
            <p className="auth-panel-sub">Necesitamos estos datos para procesar tu solicitud de acceso</p>
          </div>

          {/* Photo upload removed per user request */}

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label className="auth-label">Nombre Completo</label>
              <div className="input-with-icon">
                <User size={16} />
                <input className="auth-input" value={displayName} onChange={e => setDisplayName(e.target.value)} required />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Empresa</label>
              <div className="input-with-icon">
                <Building2 size={16} />
                <select 
                  className="auth-input" 
                  value={companyId} 
                  onChange={e => {
                    setCompanyId(e.target.value);
                    if (e.target.value) setRequestedCompany('');
                  }}
                >
                  <option value="">-- Solicitar nueva empresa --</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {!companyId && (
              <div className="auth-field">
                <label className="auth-label">Nombre de la nueva empresa</label>
                <div className="input-with-icon">
                  <Building2 size={16} />
                  <input className="auth-input" value={requestedCompany} onChange={e => setRequestedCompany(e.target.value)} placeholder="Ej. Tech Solutions S.A." required={!companyId} />
                </div>
              </div>
            )}

            <div className="auth-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="auth-field">
                <label className="auth-label">Teléfono (Opcional)</label>
                <input className="auth-input" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="auth-field">
                <label className="auth-label">Cargo (Opcional)</label>
                <input className="auth-input" value={position} onChange={e => setPosition(e.target.value)} />
              </div>
            </div>

            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? 'Enviando...' : <>Enviar Solicitud <ArrowRight size={16} /></>}
            </button>
          </form>

          <button className="auth-btn-google" style={{ marginTop: '20px', border: 'none', background: 'transparent' }} onClick={logout}>
            <LogOut size={16} /> Cerrar sesión y volver
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default CompleteProfile;
