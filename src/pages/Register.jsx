import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ArrowRight, Building2, User, Camera, X } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import api from '../api/client';
import './Login.css';

const Register = () => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPass] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, loginWithGoogle } = useAuth();
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
    setError('');

    if (password !== confirmPassword) return setError('Las contraseñas no coinciden.');
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');

    // Validación de empresa: debe seleccionar una o escribir una nueva
    if (!selectedCompanyId && !companyName.trim()) {
      return setError('Debes seleccionar una empresa o escribir el nombre de una nueva.');
    }

    setLoading(true);
    try {
      await register(email, password, {
        displayName,
        companyId: selectedCompanyId,
        companyName: selectedCompanyId ? null : companyName.trim()
      });

      navigate('/pending-approval');
    } catch (err) {
      setError(err.message || 'Error al crear la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    try {
      await loginWithGoogle();
      // AuthContext y App.jsx se encargarán de redirigir según el estado del perfil
    } catch {
      setError('No se pudo registrar con Google.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" aria-hidden>
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
      </div>

      <div className="auth-layout">
        <motion.div
          className="auth-hero"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="auth-eyebrow">Solicitud de acceso</span>
          <h1 className="auth-headline">NOIR<br />ACCESS</h1>
          <p className="auth-lead">
            Tu perfil quedará en revisión hasta ser aprobado por un administrador. 
            Proceso de verificación empresarial estricto.
          </p>
        </motion.div>

        <div className="auth-panel-wrap">
          <motion.div
            className="auth-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="auth-panel-header">
              <div className="auth-logo-mark">SL</div>
              <h2 className="auth-panel-title">Crear perfil</h2>
              <p className="auth-panel-sub">Acceso sujeto a aprobación del administrador</p>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  className="auth-error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="auth-form">
              {/* Photo upload removed per user request */}

              <div className="auth-field">
                <label className="auth-label">Nombre Completo</label>
                <div className="input-with-icon">
                  <User size={16} />
                  <input 
                    className="auth-input" 
                    type="text" 
                    placeholder="Tu nombre"
                    value={displayName} 
                    onChange={e => setDisplayName(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label">Correo electrónico</label>
                <input className="auth-input" type="email" placeholder="usuario@empresa.com"
                  value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              
              <div className="auth-field">
                <label className="auth-label">Empresa</label>
                <div className="input-with-icon">
                  <Building2 size={16} />
                  <select 
                    className="auth-input" 
                    value={selectedCompanyId} 
                    onChange={e => {
                      setSelectedCompanyId(e.target.value);
                      if (e.target.value) setCompanyName('');
                    }}
                  >
                    <option value="">-- Solicitar nueva empresa --</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!selectedCompanyId && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="auth-field"
                >
                  <label className="auth-label">Nombre de tu Nueva Empresa</label>
                  <div className="input-with-icon">
                    <Building2 size={16} />
                    <input 
                      className="auth-input" 
                      type="text" 
                      placeholder="Ej. Mi Empresa S.A."
                      value={companyName} 
                      onChange={e => setCompanyName(e.target.value)} 
                      required={!selectedCompanyId} 
                    />
                  </div>
                </motion.div>
              )}

              <div className="auth-field-row">
                <div className="auth-field">
                  <label className="auth-label">Contraseña</label>
                  <input className="auth-input" type="password" placeholder="Mínimo 6"
                    value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <div className="auth-field">
                  <label className="auth-label">Confirmar</label>
                  <input className="auth-input" type="password" placeholder="••••••••"
                    value={confirmPassword} onChange={e => setConfirmPass(e.target.value)} required />
                </div>
              </div>

              <button type="submit" className="auth-btn-primary" disabled={loading}>
                {loading ? <span className="auth-btn-spinner" /> : <>Solicitar acceso <ArrowRight size={16} /></>}
              </button>
            </form>

            <div className="auth-divider"><span>o regístrate con</span></div>

            <button className="auth-btn-google" onClick={handleGoogle} type="button">
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Registrarse con Google
            </button>

            <p className="auth-footer-link">
              ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión →</Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Register;
