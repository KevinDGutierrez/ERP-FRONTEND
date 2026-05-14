import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ArrowRight } from 'lucide-react';
import './Login.css';

const Login = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError('Credenciales inválidas. Verifica tu email y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGLoading(true);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch {
      setError('No se pudo iniciar sesión con Google.');
    } finally {
      setGLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Fondo animado */}
      <div className="auth-bg" aria-hidden>
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
      </div>

      <div className="auth-layout">
        {/* Hero izquierdo */}
        <motion.div
          className="auth-hero"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="auth-eyebrow">SaaS Enterprise · Contabilidad</span>
          <h1 className="auth-headline">STREET<br />LEDGER</h1>
          <p className="auth-lead">
            Infraestructura contable de precisión para empresas que no aceptan mediocridad.
          </p>
        </motion.div>

        {/* Panel derecho */}
        <div className="auth-panel-wrap">
          <motion.div
            className="auth-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="auth-panel-header">
              <div className="auth-logo-mark">SL</div>
              <h2 className="auth-panel-title">Bienvenido de nuevo</h2>
              <p className="auth-panel-sub">Ingresa tus credenciales para continuar</p>
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
              <div className="auth-field">
                <label className="auth-label">Correo corporativo</label>
                <input
                  className="auth-input"
                  type="email"
                  placeholder="usuario@empresa.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="auth-field">
                <label className="auth-label">Contraseña</label>
                <input
                  className="auth-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              {/* Botón principal rediseñado */}
              <button type="submit" className="auth-btn-primary" disabled={loading}>
                {loading ? (
                  <span className="auth-btn-spinner" />
                ) : (
                  <>Acceder al sistema <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            <div className="auth-divider"><span>o continúa con</span></div>

            {/* Google con logo original */}
            <button className="auth-btn-google" onClick={handleGoogle} disabled={gLoading}>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
              {gLoading ? 'Conectando...' : 'Continuar con Google'}
            </button>

            <p className="auth-footer-link">
              ¿Sin cuenta? <Link to="/register">Solicitar acceso →</Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Login;
