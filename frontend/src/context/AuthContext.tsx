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
  // Restore session synchronously from localStorage so isLoading starts false
  // and the spinner never flashes on page load.
  const [user, setUser] = useState<UserProfile | null>(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');
    if (savedUser && token) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        console.error('Failed to parse saved user credentials');
      }
    }
    return null;
  });
  // isLoading is always false — session is restored synchronously above.
  const isLoading = false;

  // Listen for forced-logout events dispatched by the api.ts 401 interceptor
  // when a token refresh fails (e.g. session expired). This avoids any hard
  // page reload — setUser(null) triggers ProtectedRoute to redirect via React Router.
  useEffect(() => {
    const handleForcedLogout = () => {
      setUser(null);
    };
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, []);

  const login = async (loginData: any) => {
    // NOTE: do NOT touch isLoading here — it is only for the initial
    // session-restore check on mount. The LoginPage manages its own
    // local loading state. Touching isLoading here caused ProtectedRoute
    // to re-evaluate and appear to "refresh" the page on failed logins.
    const res = await api.post('/auth/login', loginData);
    const { accessToken, refreshToken, user: profile } = res.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(profile));
    setUser(profile);
    // Any thrown error propagates naturally to the caller (LoginPage)
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    // Clear session immediately so UI reacts instantly
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    // ProtectedRoute will detect isAuthenticated=false and redirect to /login
    // via React Router — no hard page reload needed.
    try {
      if (refreshToken) {
        // Fire-and-forget: tell server to invalidate token
        api.post('/auth/logout', { refreshToken }).catch(() => {});
      }
    } catch (e) {
      // ignore
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
