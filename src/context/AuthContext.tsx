/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

const API_BASE = 'http://localhost:8080/api/v1';

interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
}

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
    const headers = { Authorization: `Bearer ${credential}` };

    let userData: User;

    const getRes = await fetch(`${API_BASE}/users/me`, { headers });
    const getData = await getRes.json();

    if (getRes.ok && getData.code === 200) {
      userData = getData.result;
    } else {
      const createRes = await fetch(`${API_BASE}/users/me`, {
        method: 'POST',
        headers,
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createData.errorMessage || 'Failed to create user account');
      }
      userData = createData.result;
    }

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
