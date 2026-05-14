import React, { useState, useRef, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { useBrand } from '../context/BrandContext';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Save, Palette, Building2, Globe, Phone, Mail, Image as ImageIcon, Upload, Loader2, AlertTriangle, User } from 'lucide-react';
import './Settings.css';

const Settings = () => {
  const { brand, updateBrand } = useBrand();
  const { profile, updateProfile } = useAuth();
  
  const [formData, setFormData] = useState(brand);
  const [userData, setUserData] = useState({
    displayName: profile?.displayName || ''
  });
  
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(brand.logo);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Sincronizar si el perfil cambia
  useEffect(() => {
    if (profile) {
      setUserData({ displayName: profile.displayName || '' });
    }
  }, [profile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUserChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Redimensionar si es mayor a 700px
          const MAX_WIDTH = 700;
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Comprimir (usar webp si es soportado, fallback a jpeg)
          const dataUrl = canvas.toDataURL('image/webp', 0.75);
          
          // Verificar tamaño final (aproximado en base64)
          // 1 char base64 ~= 0.75 bytes. 900KB ~= 1.2M chars.
          if (dataUrl.length > 1.2 * 1024 * 1024) {
            // Si sigue siendo muy grande, intentar comprimir más agresivo
            resolve(canvas.toDataURL('image/jpeg', 0.5));
          } else {
            resolve(dataUrl);
          }
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const compressedBase64 = await compressImage(file);
      
      // Validación final de peso real (Firestore limit is 1MB per document, but we store other data too)
      const stringSizeInBytes = (compressedBase64.length * 0.75);
      if (stringSizeInBytes > 950 * 1024) {
        setError("Incluso después de comprimir, la imagen es demasiado pesada. Por favor usa una imagen más pequeña.");
        setUploading(false);
        return;
      }

      setPreviewUrl(compressedBase64);
      setFormData(prev => ({ ...prev, logo: compressedBase64 }));
    } catch (err) {
      console.error("Compression error:", err);
      setError("Error al procesar la imagen.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setError(null);
    try {
      // Guardar datos personales
      await updateProfile(userData);
      
      // Guardar datos de marca
      await updateBrand(formData);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving settings:", err);
      setError("Error al guardar la configuración.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout>
      <div className="settings-container">
        <header className="page-header">
          <div>
            <h1>Configuración</h1>
            <p>Personaliza la identidad visual y datos de tu empresa (Marca Blanca).</p>
          </div>
        </header>

        <div className="settings-grid">
          <form onSubmit={handleSubmit} className="settings-form">
            {/* Sección Personal */}
            <div className="settings-card">
              <div className="card-header">
                <User size={20} />
                <h3>Perfil Personal</h3>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label>Tu Nombre Completo</label>
                  <div className="input-with-icon">
                    <User size={16} />
                    <input 
                      name="displayName" 
                      value={userData.displayName} 
                      onChange={handleUserChange} 
                      placeholder="Ej. Juan Pérez"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-card">
              <div className="card-header">
                <Building2 size={20} />
                <h3>Información de la Empresa</h3>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label>Nombre de la Empresa</label>
                  <input name="name" value={formData.name} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>NIT / ID Fiscal</label>
                  <input name="nit" value={formData.nit} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Eslogan / Lema</label>
                  <input name="slogan" value={formData.slogan} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div className="settings-card">
              <div className="card-header">
                <Globe size={20} />
                <h3>Contacto y Ubicación</h3>
              </div>
              <div className="card-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Teléfono</label>
                    <div className="input-with-icon">
                      <Phone size={16} />
                      <input name="phone" value={formData.phone} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Correo Electrónico</label>
                    <div className="input-with-icon">
                      <Mail size={16} />
                      <input name="email" value={formData.email} onChange={handleChange} />
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label>Dirección Física</label>
                  <input name="address" value={formData.address} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div className="settings-card">
              <div className="card-header">
                <Palette size={20} />
                <h3>Identidad Visual</h3>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label>Logo de la Empresa</label>
                  <div className="logo-upload-box">
                    <div className="logo-preview-small">
                      {previewUrl ? <img src={previewUrl} alt="Preview" /> : <ImageIcon size={24} />}
                    </div>
                    <div className="logo-upload-actions">
                      <button 
                        type="button" 
                        className="btn-glass"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
                        {uploading ? 'Subiendo...' : 'Subir Imagen'}
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        onChange={handleFileChange}
                      />
                      <span className="upload-hint">PNG, JPG, WEBP (Optimización automática)</span>
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label>URL del Logo (Opcional)</label>
                  <div className="input-with-icon">
                    <ImageIcon size={16} />
                    <input 
                      name="logo" 
                      value={formData.logo || ''} 
                      onChange={(e) => {
                        handleChange(e);
                        setPreviewUrl(e.target.value);
                      }} 
                      placeholder="https://..." 
                    />
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="settings-error">
                <AlertTriangle size={18} />
                <span>{error}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="settings-success">
                <span>¡Configuración guardada exitosamente!</span>
              </div>
            )}

            <button type="submit" className="save-btn" disabled={uploading}>
              {uploading ? <Loader2 size={20} className="spin" /> : <Save size={20} />}
              {uploading ? 'Guardando...' : 'Guardar Cambios'}
            </button>

            {saveSuccess && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="save-toast"
              >
                ¡Configuración de Marca Blanca actualizada!
              </motion.div>
            )}
          </form>

          <div className="preview-section">
            <h3>Vista Previa</h3>
            <div className="preview-card" data-theme={formData.theme}>
              <div className="preview-header">
                <div className="preview-logo">
                  {formData.logo ? <img src={formData.logo} alt="Logo" /> : 'SS'}
                </div>
                <div className="preview-info">
                  <h4>{formData.name}</h4>
                  <p>{formData.slogan}</p>
                </div>
              </div>
              <div className="preview-body">
                <div className="preview-item">
                  <strong>NIT:</strong> {formData.nit}
                </div>
                <div className="preview-item">
                  <strong>Dir:</strong> {formData.address}
                </div>
              </div>
            </div>
            <p className="preview-hint">Así se verá tu marca en el sidebar, reportes y cabeceras del sistema.</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
