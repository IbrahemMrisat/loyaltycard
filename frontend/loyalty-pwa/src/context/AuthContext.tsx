import React, { createContext, useContext, useState } from 'react';
import { api } from '../api/client';

interface AuthState {
  token: string | null;
  role: string | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: localStorage.getItem('token'),
    role: localStorage.getItem('role'),
    isLoading: false,
  });

  const login = async (email: string, password: string) => {
    setState(s => ({ ...s, isLoading: true }));
    const res = await api.post('/auth/login', { email, password });
    const { access_token, role } = res.data;
    localStorage.setItem('token', access_token);
    localStorage.setItem('role', role);
    setState({ token: access_token, role, isLoading: false });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setState({ token: null, role: null, isLoading: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}