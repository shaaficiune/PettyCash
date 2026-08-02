import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

interface CompanySummary {
  id: string;
  name: string;
}

interface UserProfile {
  id: string;
  fullName: string;
  username: string;
  email?: string;
  phone?: string;
  employeeNumber: string;
  company: CompanySummary;
  companyId?: string;
  department: CompanySummary;
  departmentId?: string;
  role: 'SUPER_ADMIN' | 'ACCOUNTANT' | 'EMPLOYEE';
  resetPasswordRequired: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (loginData: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUserContext: (updatedFields: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse saved user credentials');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (loginData: any) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', loginData);
      const { accessToken, refreshToken, user: profile } = res.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(profile));
      setUser(profile);
    } catch (e) {
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (e) {
      console.warn('Logout endpoint call failed', e);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
      window.location.href = '/login';
    }
  };

  const updateUserContext = (updatedFields: Partial<UserProfile>) => {
    if (user) {
      const newUser = { ...user, ...updatedFields };
      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, updateUserContext }}>
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
