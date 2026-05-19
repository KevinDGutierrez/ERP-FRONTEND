import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../api/client';

const BrandContext = createContext();

export const useBrand = () => useContext(BrandContext);

const DEFAULT_BRAND = {
  name: '',
  logo: null,
  theme: 'dark',
  nit: '',
  address: '',
  phone: '',
  email: '',
  slogan: ''
};

export const BrandProvider = ({ children }) => {
  const { profile } = useAuth();
  const [brand, setBrand] = useState(DEFAULT_BRAND);
  const [loading, setLoading] = useState(true);

  // Load brand from backend API when company is available
  useEffect(() => {
    if (!profile?.companyId || (profile.status !== 'active' && profile.role !== 'super_admin')) {
      setLoading(false);
      return;
    }

    const loadBrand = async () => {
      try {
        const res = await api.get('/companies/brand');
        setBrand(prev => ({ ...prev, ...res.data }));
      } catch (error) {
        // Silently fail for users without a company yet
        if (error.response?.status !== 400 && error.response?.status !== 404) {
          console.error("Error loading brand:", error);
        }
      } finally {
        setLoading(false);
      }
    };

    loadBrand();
  }, [profile?.companyId, profile?.status]);

  // Fields that belong to brand configuration (not company metadata)
  const BRAND_FIELDS = ['name', 'logo', 'theme', 'nit', 'address', 'phone', 'email', 'slogan'];

  const updateBrand = async (newConfig) => {
    // Optimistic update
    const updated = { ...brand, ...newConfig };
    setBrand(updated);

    if (profile?.companyId) {
      try {
        // Only send brand-safe fields
        const brandOnly = {};
        BRAND_FIELDS.forEach(key => {
          if (updated[key] !== undefined) brandOnly[key] = updated[key];
        });
        const res = await api.patch('/companies/brand', brandOnly);
        // Update with server response
        if (res.data.brand) {
          setBrand(prev => ({ ...prev, ...res.data.brand }));
        }
      } catch (error) {
        console.error("Error saving brand:", error);
        throw error; // Let Settings.jsx catch and show error
      }
    }
  };

  return (
    <BrandContext.Provider value={{ brand, updateBrand, loading }}>
      {children}
    </BrandContext.Provider>
  );
};
