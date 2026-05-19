import React, { useState, useRef, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { useBrand } from '../context/BrandContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, Palette, Building2, Globe, Phone, Mail,
  Image as ImageIcon, Upload, Loader2, AlertTriangle,
  User, Camera, Check, ChevronRight
} from 'lucide-react';
import './Settings.css';

/* ── Helper: compress any image to base64 ── */
const compressImage = (file, maxWidth = 700) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/webp', 0.75);
        resolve(dataUrl.length > 1.2 * 1024 * 1024
          ? canvas.toDataURL('image/jpeg', 0.5)
          : dataUrl);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

/* ── Tabs by role ── */
const ALL_TABS = [
  { id: 'profile', label: 'Perfil', icon: User, roles: ['admin_empresa', 'contador', 'usuario'] },
  { id: 'company', label: 'Empresa', icon: Building2, roles: ['admin_empresa'] },
  { id: 'visual', label: 'Visual', icon: Palette, roles: ['admin_empresa'] },
];

const Settings = () => {
  const { brand, updateBrand } = useBrand();
  const { profile, user, updateProfileData } = useAuth();
  const role = profile?.role || 'usuario';
  const isCompanyAdmin = role === 'admin_empresa';
  const TABS = ALL_TABS.filter(tab => tab.roles.includes(role));

  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState(brand);
  const [userData, setUserData] = useState({ displayName: profile?.displayName || '' });

  /* profile photo state */
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(
    profile?.photoURL || user?.photoURL || null
  );
  const [profilePhotoData, setProfilePhotoData] = useState(null); // new base64

  /* brand logo state */
  const [logoPreview, setLogoPreview] = useState(brand.logo);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const profilePhotoRef = useRef(null);
  const logoRef = useRef(null);

  useEffect(() => {
    if (profile) {
      setUserData({ displayName: profile.displayName || '' });
      setProfilePhotoPreview(profile.photoURL || user?.photoURL || null);
    }
  }, [profile, user]);

  useEffect(() => {
    // Sync formData with loaded brand so we don't save empty defaults
    setFormData(brand);
    setLogoPreview(brand.logo);
  }, [brand]);

  const handleBrandChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUserChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  /* Profile photo upload */
  const handleProfilePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError(null);
    setSaving(true);
    try {
      const compressed = await compressImage(file, 400);
      setProfilePhotoPreview(compressed);
      setProfilePhotoData(compressed);
    } catch {
      setError('Error al procesar la imagen de perfil.');
    } finally {
      setSaving(false);
    }
  };

  /* Logo upload */
  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError(null);
    setSaving(true);
    try {
      const compressed = await compressImage(file, 700);
      const sizeBytes = compressed.length * 0.75;
      if (sizeBytes > 950 * 1024) {
        setError('La imagen es demasiado pesada incluso comprimida. Usa una imagen más pequeña.');
        setSaving(false);
        return;
      }
      setLogoPreview(compressed);
      setFormData(prev => ({ ...prev, logo: compressed }));
    } catch {
      setError('Error al procesar el logo.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const profilePayload = { ...userData };
      if (profilePhotoData) profilePayload.photoURL = profilePhotoData;
      await updateProfileData(profilePayload);
      if (isCompanyAdmin) await updateBrand(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setError('Error al guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="settings-container">
        {/* Page header */}
        <header className="settings-page-header">
          <div className="settings-header-icon">
            <Palette size={22} />
          </div>
          <div>
            <h1>Configuración</h1>
            <p>Administra tu perfil y la identidad visual de la empresa.</p>
          </div>
        </header>

        {/* Tabs */}
        <div className="settings-tabs">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            {/* ── TAB: PROFILE ── */}
            {activeTab === 'profile' && (
              <motion.div key="profile"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
                className="settings-tab-content"
              >
                {/* Avatar card */}
                <div className="settings-card profile-avatar-card">
                  <div className="avatar-upload-area">
                    <div className="avatar-upload-circle">
                      {profilePhotoPreview ? (
                        <img
                          src={profilePhotoPreview}
                          alt="Foto de perfil"
                          className="avatar-upload-img"
                          onError={() => setProfilePhotoPreview(null)}
                        />
                      ) : (
                        <div className="avatar-upload-placeholder">
                          {userData.displayName?.charAt(0)?.toUpperCase() ||
                           user?.email?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <button
                        type="button"
                        className="avatar-camera-btn"
                        onClick={() => profilePhotoRef.current?.click()}
                        title="Cambiar foto"
                      >
                        <Camera size={16} />
                      </button>
                      <input
                        type="file"
                        ref={profilePhotoRef}
                        style={{ display: 'none' }}
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleProfilePhotoChange}
                      />
                    </div>
                    <div className="avatar-upload-info">
                      <h3>{userData.displayName || 'Sin nombre'}</h3>
                      <p>{user?.email}</p>
                      <button
                        type="button"
                        className="avatar-change-btn"
                        onClick={() => profilePhotoRef.current?.click()}
                      >
                        <Upload size={14} />
                        Cambiar foto
                      </button>
                      {user?.providerData?.[0]?.providerId === 'google.com' && !profilePhotoData && (
                        <span className="google-photo-hint">
                          Foto cargada desde Google · Puedes reemplazarla
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Name card */}
                <div className="settings-card">
                  <div className="card-header">
                    <User size={18} />
                    <h3>Información Personal</h3>
                  </div>
                  <div className="card-body">
                    <div className="form-group">
                      <label>Nombre Completo</label>
                      <input
                        name="displayName"
                        value={userData.displayName}
                        onChange={handleUserChange}
                        placeholder="Ej. Juan Pérez"
                        className="settings-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Correo Electrónico</label>
                      <input
                        value={user?.email || ''}
                        disabled
                        className="settings-input disabled"
                        title="El correo no se puede cambiar desde aquí"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── TAB: COMPANY ── */}
            {activeTab === 'company' && (
              <motion.div key="company"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
                className="settings-tab-content"
              >
                <div className="settings-card">
                  <div className="card-header">
                    <Building2 size={18} />
                    <h3>Información de la Empresa</h3>
                  </div>
                  <div className="card-body">
                    <div className="form-group">
                      <label>Nombre de la Empresa</label>
                      <input name="name" value={formData.name} onChange={handleBrandChange} className="settings-input" />
                    </div>
                    <div className="form-group">
                      <label>NIT / ID Fiscal</label>
                      <input name="nit" value={formData.nit} onChange={handleBrandChange} className="settings-input" />
                    </div>
                    <div className="form-group">
                      <label>Eslogan / Lema</label>
                      <input name="slogan" value={formData.slogan} onChange={handleBrandChange} className="settings-input" />
                    </div>
                  </div>
                </div>

                <div className="settings-card">
                  <div className="card-header">
                    <Globe size={18} />
                    <h3>Contacto y Ubicación</h3>
                  </div>
                  <div className="card-body">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Teléfono</label>
                        <div className="input-icon-wrap">
                          <Phone size={15} className="input-icon" />
                          <input name="phone" value={formData.phone} onChange={handleBrandChange} className="settings-input with-icon" />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Correo de Empresa</label>
                        <div className="input-icon-wrap">
                          <Mail size={15} className="input-icon" />
                          <input name="email" value={formData.email} onChange={handleBrandChange} className="settings-input with-icon" />
                        </div>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Dirección Física</label>
                      <input name="address" value={formData.address} onChange={handleBrandChange} className="settings-input" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── TAB: VISUAL ── */}
            {activeTab === 'visual' && (
              <motion.div key="visual"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
                className="settings-tab-content two-col"
              >
                <div className="visual-form-col">
                  <div className="settings-card">
                    <div className="card-header">
                      <ImageIcon size={18} />
                      <h3>Logo de la Empresa</h3>
                    </div>
                    <div className="card-body">
                      <div className="logo-upload-zone" onClick={() => logoRef.current?.click()}>
                        <div className="logo-preview-box">
                          {logoPreview
                            ? <img src={logoPreview} alt="Logo" />
                            : <ImageIcon size={28} />}
                        </div>
                        <div className="logo-upload-text">
                          <Upload size={16} />
                          <span>Haz clic para subir un logo</span>
                          <small>PNG, JPG, WEBP — Optimización automática</small>
                        </div>
                        <input
                          type="file"
                          ref={logoRef}
                          style={{ display: 'none' }}
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          onChange={handleLogoChange}
                        />
                      </div>
                      <div className="form-group" style={{ marginTop: '1rem' }}>
                        <label>O pega una URL de imagen</label>
                        <div className="input-icon-wrap">
                          <ImageIcon size={15} className="input-icon" />
                          <input
                            name="logo"
                            value={formData.logo || ''}
                            onChange={(e) => {
                              handleBrandChange(e);
                              setLogoPreview(e.target.value);
                            }}
                            placeholder="https://..."
                            className="settings-input with-icon"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview sidebar */}
                <div className="visual-preview-col">
                  <div className="settings-card preview-card">
                    <div className="card-header">
                      <Palette size={18} />
                      <h3>Vista Previa</h3>
                    </div>
                    <div className="card-body">
                      <div className="preview-sidebar-mock">
                        <div className="mock-brand-row">
                          <div className="mock-logo">
                            {formData.logo
                              ? <img src={formData.logo} alt="Logo preview" />
                              : <span>{(formData.name || 'E').charAt(0)}</span>}
                          </div>
                          <div className="mock-brand-info">
                            <strong>{formData.name || 'Empresa'}</strong>
                            <small>{formData.slogan || 'Tu eslogan aquí'}</small>
                          </div>
                        </div>
                        <div className="mock-nav-items">
                          {['Dashboard', 'Catálogo', 'Libro Diario'].map(n => (
                            <div key={n} className="mock-nav-item">{n}</div>
                          ))}
                        </div>
                      </div>
                      <p className="preview-hint">Así se verá en el sidebar y los reportes.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Feedback */}
          {error && (
            <div className="settings-error">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="settings-success"
            >
              <Check size={16} />
              ¡Configuración guardada exitosamente!
            </motion.div>
          )}

          <button type="submit" className="save-btn" disabled={saving}>
            {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default Settings;
