import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut 
} from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const updateProfile = async (data) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, data, { merge: true });
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  };

  useEffect(() => {
    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const token = await firebaseUser.getIdToken();
        localStorage.setItem('auth_token', token);

        // Listener en tiempo real para el perfil
        const docRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data());
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (err) => {
          console.error("Error profile snapshot:", err);
          setLoading(false);
        });
      } else {
        setUser(null);
        setProfile(null);
        localStorage.removeItem('auth_token');
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  
  const register = async (email, password, companyData) => {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    const docRef = doc(db, 'users', res.user.uid);
    await setDoc(docRef, {
      email,
      displayName: null,
      provider: 'password',
      status: 'pending',
      role: 'usuario',
      companyId: companyData.companyId || null,
      requestedCompany: companyData.companyId ? null : companyData.companyName,
      createdAt: serverTimestamp()
    });
    return res;
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    // Ya no creamos el perfil aquí para obligar al usuario a elegir empresa en /complete-profile
    return res;
  };

  const logout = () => signOut(auth);

  const value = {
    user,
    profile,
    loading,
    login,
    register,
    loginWithGoogle,
    logout,
    updateProfileData: updateProfile,
    isAdmin: profile?.role === 'super_admin',
    isActive: profile?.status === 'active'
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
