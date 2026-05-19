import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const BrandContext = createContext();

export const useBrand = () => useContext(BrandContext);

export const BrandProvider = ({ children }) => {
  const { profile } = useAuth();
  const [brand, setBrand] = useState({
    name: 'Street Studio Code, S.A.',
    logo: null,
    theme: 'dark',
    nit: '1234567-8',
    address: 'Guatemala City, Guatemala',
    phone: '+502 1234 5678',
    email: 'contacto@streetstudio.com',
    slogan: 'Tecnología e Inteligencia Contable'
  });
  const [loading, setLoading] = useState(true);

  // Cargar desde Firestore si el usuario tiene empresa
  useEffect(() => {
    if (!profile?.companyId || (profile.status !== 'active' && profile.role !== 'super_admin')) {
      setLoading(false);
      return;
    }

    const brandRef = doc(db, 'companies', profile.companyId);
    
    const unsubscribe = onSnapshot(brandRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBrand(prev => ({ ...prev, ...data }));
      }
      setLoading(false);
    }, (error) => {
      // Si no hay permisos (ej. usuario no aprobado), simplemente no cargamos la marca
      // Silenciamos el error si es por permisos para no confundir al usuario
      if (error.code !== 'permission-denied') {
        console.error("Error al cargar la marca:", error);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.companyId]);

  // Fields that belong to brand configuration (not company metadata)
  const BRAND_FIELDS = ['name', 'logo', 'theme', 'nit', 'address', 'phone', 'email', 'slogan'];

  const updateBrand = async (newConfig) => {
    const updated = { ...brand, ...newConfig };
    setBrand(updated);
    
    // Only persist brand-specific fields to the company doc
    if (profile?.companyId) {
      try {
        const brandRef = doc(db, 'companies', profile.companyId);
        const brandOnly = {};
        BRAND_FIELDS.forEach(key => {
          if (updated[key] !== undefined) brandOnly[key] = updated[key];
        });
        await setDoc(brandRef, brandOnly, { merge: true });
      } catch (error) {
        console.error("Error saving brand to Firestore:", error);
      }
    }
  };

  return (
    <BrandContext.Provider value={{ brand, updateBrand, loading }}>
      {children}
    </BrandContext.Provider>
  );
};
