/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { getMe, createMe } from '../api/users';
import type { User } from '../api/users';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (credential: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('user');
      const savedToken = localStorage.getItem('token');
      if (savedUser && savedUser !== 'undefined') {
        setUser(JSON.parse(savedUser));
      }
      if (savedToken) {
        setToken(savedToken);
      }
    } catch (error) {
      console.error('Failed to restore session from localStorage:', error);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  }, []);

  const login = async (credential: string) => {
    const userData = (await getMe(credential)) ?? (await createMe(credential));

    setUser(userData);
    setToken(credential);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', credential);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
