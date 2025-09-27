import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface License {
  id: number;
  license_key: string;
  license_type: string;
  expires_at: string;
  days_remaining: number;
  active_devices: number;
  max_devices: number;
}

interface AuthContextType {
  user: User | null;
  licenses: License[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  validateLicense: (licenseKey: string) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      refreshProfile();
    } else {
      setIsLoading(false);
    }
  }, []);

  const refreshProfile = async () => {
    try {
      const response = await apiClient.getProfile();
      setUser(response.user);
      setLicenses(response.licenses || []);
    } catch (error) {
      console.error('Failed to refresh profile:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await apiClient.login(email, password);
    setUser(response.user);
    await refreshProfile();
  };

  const register = async (email: string, password: string, name: string) => {
    await apiClient.register(email, password, name);
  };

  const logout = () => {
    apiClient.clearToken();
    setUser(null);
    setLicenses([]);
  };

  const generateDeviceFingerprint = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('fingerprint', 2, 2);
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    return btoa(fingerprint).slice(0, 32);
  };

  const validateLicense = async (licenseKey: string): Promise<boolean> => {
    try {
      const deviceFingerprint = generateDeviceFingerprint();
      await apiClient.validateLicense(licenseKey, deviceFingerprint);
      return true;
    } catch (error) {
      console.error('License validation failed:', error);
      return false;
    }
  };

  const value = {
    user,
    licenses,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    validateLicense,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}