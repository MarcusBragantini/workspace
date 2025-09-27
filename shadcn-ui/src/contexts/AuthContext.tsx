import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        try {
          const profileData = await apiClient.getProfile();
          setUser(profileData.user);
          setToken(storedToken);
        } catch (error) {
          console.error('Error fetching user data:', error);
          localStorage.removeItem('auth_token');
          apiClient.clearToken();
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password);
      const { token: newToken, user: userData } = response;
      
      localStorage.setItem('auth_token', newToken);
      setToken(newToken);
      setUser(userData);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      await apiClient.register(email, password, name);
      // After registration, automatically log in
      await login(email, password);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    apiClient.clearToken();
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'admin';

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    isAuthenticated,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};