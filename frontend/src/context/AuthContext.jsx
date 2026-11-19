import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('hisabkitab_user') || localStorage.getItem('hisabkitab_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [business, setBusiness] = useState(() => {
    try {
      const saved = sessionStorage.getItem('hisabkitab_business') || localStorage.getItem('hisabkitab_business');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [businesses, setBusinesses] = useState([]);
  const [token, setToken] = useState(() => {
    return sessionStorage.getItem('hisabkitab_token') || localStorage.getItem('hisabkitab_token');
  });
  const [isLoading, setIsLoading] = useState(false);
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
        logout(true); // Silent transition to login on token expiration
        return response;
      }
      return response;
    } catch (err) {
      throw err;
    }
  };

  // Background token verification on initial page mount (silent token refresh, zero UI flash)
  useEffect(() => {
    const savedToken = sessionStorage.getItem('hisabkitab_token') || localStorage.getItem('hisabkitab_token');
    if (!savedToken) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${savedToken}` },
      signal: controller.signal
    })
      .then(async (res) => {
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setBusiness(data.business);
          setBusinesses(data.businesses || []);
          setToken(savedToken);
          try {
            sessionStorage.setItem('hisabkitab_user', JSON.stringify(data.user));
            localStorage.setItem('hisabkitab_user', JSON.stringify(data.user));
            if (data.business) {
              sessionStorage.setItem('hisabkitab_business', JSON.stringify(data.business));
              localStorage.setItem('hisabkitab_business', JSON.stringify(data.business));
            }
          } catch (e) {}
        } else {
          sessionStorage.removeItem('hisabkitab_token');
          localStorage.removeItem('hisabkitab_token');
          sessionStorage.removeItem('hisabkitab_user');
          localStorage.removeItem('hisabkitab_user');
          sessionStorage.removeItem('hisabkitab_business');
          localStorage.removeItem('hisabkitab_business');
          setToken(null);
          setUser(null);
        }
      })
      .catch((err) => {
        console.warn('Initial session check skipped / offline:', err);
      });
  }, []);

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
      sessionStorage.setItem('hisabkitab_token', data.token);
      localStorage.setItem('hisabkitab_token', data.token);
      sessionStorage.setItem('hisabkitab_user', JSON.stringify(data.user));
      localStorage.setItem('hisabkitab_user', JSON.stringify(data.user));
      if (data.business) {
        sessionStorage.setItem('hisabkitab_business', JSON.stringify(data.business));
        localStorage.setItem('hisabkitab_business', JSON.stringify(data.business));
      }
      setToken(data.token);
      setUser(data.user);
      if (data.business) {
        setBusiness(data.business);
      }
      setIsLoading(false);
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
      localStorage.setItem('hisabkitab_token', data.token);
      sessionStorage.setItem('hisabkitab_user', JSON.stringify(data.user));
      localStorage.setItem('hisabkitab_user', JSON.stringify(data.user));
      if (data.business) {
        sessionStorage.setItem('hisabkitab_business', JSON.stringify(data.business));
        localStorage.setItem('hisabkitab_business', JSON.stringify(data.business));
      }
      setToken(data.token);
      setUser(data.user);
      if (data.business) {
        setBusiness(data.business);
      }
      setIsLoading(false);
      showToast(`Welcome to HisabKitab, ${data.user.full_name}! Your account is ready.`, 'success');
      return true;
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    }
  };

  const logout = (silent = false) => {
    sessionStorage.removeItem('hisabkitab_token');
    localStorage.removeItem('hisabkitab_token');
    sessionStorage.removeItem('hisabkitab_user');
    localStorage.removeItem('hisabkitab_user');
    sessionStorage.removeItem('hisabkitab_business');
    localStorage.removeItem('hisabkitab_business');
    setToken(null);
    setUser(null);
    setBusiness(null);
    if (!silent) {
      showToast('Logged out securely.', 'info');
    }
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

  const deleteBusiness = async (businessId) => {
    try {
      const res = await apiFetch(`/api/settings/businesses/${businessId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to delete store');

      showToast(data.message || 'Store outlet removed successfully.', 'success');
      if (data.user) {
        setUser(data.user);
        try {
          sessionStorage.setItem('hisabkitab_user', JSON.stringify(data.user));
          localStorage.setItem('hisabkitab_user', JSON.stringify(data.user));
        } catch (e) {}
      }
      if (data.business) {
        setBusiness(data.business);
        try {
          sessionStorage.setItem('hisabkitab_business', JSON.stringify(data.business));
          localStorage.setItem('hisabkitab_business', JSON.stringify(data.business));
        } catch (e) {}
      }
      await fetchBusinesses();
      refreshData();
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
        deleteBusiness,
        dataVersion,
        refreshData
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
