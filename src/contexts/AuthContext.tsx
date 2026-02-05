import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { setAuthToken, clearAuthToken } from '@/lib/api-service';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      setAuthToken(token); // Sync token with api-service on init
    }
    return !!token;
  });

  const login = (token: string) => {
    setAuthToken(token); // This updates both localStorage and api-service
    setIsAuthenticated(true);
  };

  const logout = () => {
    clearAuthToken();
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
