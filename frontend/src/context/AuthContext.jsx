import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [token, setToken] = useState(() => {
    // Clean any permanent tokens so opening in a new tab/session always requires login for security
    try {
      localStorage.removeItem('hisabkitab_token');
    } catch (e) {}
    return sessionStorage.getItem('hisabkitab_token');
  });
  const [isLoading, setIsLoading] = useState(true);
  const [dataVersion, setDataVersion] = useState(0);
  const { showToast } = useToast();

  const refreshData = () => setDataVersion((v) => v + 1);

  const apiFetch = async (endpoint, options = {}) => {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    try {
      const response = await fetch(url, { ...options, headers });
      if (response.status === 401) {
        logout();
        throw new Error('Session expired. Please log in again.');
      }
      return response;
    } catch (err) {
      throw err;
    }
  };

  const checkMe = async () => {
    setIsLoading(true);
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setBusiness(data.business);
        setBusinesses(data.businesses || []);
      } else {
        sessionStorage.removeItem('hisabkitab_token');
        localStorage.removeItem('hisabkitab_token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Auth verification error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkMe();
  }, [token]);

  const login = async (username, password) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Login failed.');
      }
      // Store in sessionStorage so closing tab forces fresh signin for security
      sessionStorage.setItem('hisabkitab_token', data.token);
      localStorage.removeItem('hisabkitab_token');
      setToken(data.token);
      setUser(data.user);
      if (data.business) {
        setBusiness(data.business);
      }
      showToast(`Welcome back, ${data.user.full_name}!`, 'success');
      return true;
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    }
  };

  const signup = async (formData) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Sign up failed.');
      }
      sessionStorage.setItem('hisabkitab_token', data.token);
      localStorage.removeItem('hisabkitab_token');
      setToken(data.token);
      setUser(data.user);
      if (data.business) {
        setBusiness(data.business);
      }
      showToast(`Welcome to HisabKitab, ${data.user.full_name}! Your account is ready.`, 'success');
      return true;
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    }
  };

  const logout = () => {
    sessionStorage.removeItem('hisabkitab_token');
    localStorage.removeItem('hisabkitab_token');
    setToken(null);
    setUser(null);
    setBusiness(null);
    showToast('Logged out securely.', 'info');
  };

  const fetchBusinesses = async () => {
    if (!token) return;
    try {
      const res = await apiFetch('/api/settings/businesses');
      if (res.ok) {
        const list = await res.json();
        setBusinesses(list || []);
      }
    } catch (err) {
      console.error('Failed to load businesses list:', err);
    }
  };

  const switchBusiness = async (businessId) => {
    try {
      const res = await apiFetch(`/api/settings/switch-business/${businessId}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to switch business');
      
      setUser(data.user);
      setBusiness(data.business);
      await fetchBusinesses();
      refreshData();
      showToast(data.message || 'Switched active store', 'success');
      return true;
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    }
  };

  const createBusiness = async (bizPayload) => {
    try {
      const res = await apiFetch('/api/settings/businesses', {
        method: 'POST',
        body: JSON.stringify(bizPayload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to create business');
      
      showToast(data.message || 'New business branch added!', 'success');
      if (data.business && data.business.id) {
        await switchBusiness(data.business.id);
      } else {
        await fetchBusinesses();
        refreshData();
      }
      return true;
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    }
  };

  const refreshBusiness = async () => {
    if (!token) return;
    try {
      const res = await apiFetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setBusiness(data);
      }
      await fetchBusinesses();
    } catch (err) {
      console.error('Failed to reload business profile:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        businesses,
        token,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isStaff: user?.role === 'staff',
        isInventoryManager: user?.role === 'inventory_manager',
        canAccessInvoices: user?.role === 'admin' || user?.role === 'staff',
        canCreateInvoice: user?.role === 'admin' || user?.role === 'staff',
        isLoading,
        login,
        signup,
        logout,
        apiFetch,
        refreshBusiness,
        fetchBusinesses,
        switchBusiness,
        createBusiness,
        dataVersion,
        refreshData
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
