import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Role } from '../types/index.js';
import { apiUrl } from '../services/api.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setLanguage: (lang: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('caresphere_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { i18n } = useTranslation();

  const fetchCurrentUser = async (authToken: string) => {
    try {
      const res = await fetch(apiUrl('/api/auth/me'), {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        // Sync language from user profile if set
        if (data.user.preferred_language && data.user.preferred_language !== i18n.language) {
          i18n.changeLanguage(data.user.preferred_language);
          localStorage.setItem('caresphere_lang', data.user.preferred_language);
        }
      } else {
        // Invalid or expired token
        logout();
      }
    } catch (err) {
      console.error('Failed to restore auth session:', err);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('caresphere_token', newToken);
    setToken(newToken);
    setUser(newUser);
    if (newUser.preferred_language) {
      i18n.changeLanguage(newUser.preferred_language);
      localStorage.setItem('caresphere_lang', newUser.preferred_language);
    }
  };

  const logout = () => {
    localStorage.removeItem('caresphere_token');
    setToken(null);
    setUser(null);
  };

  const setLanguage = async (newLang: string) => {
    i18n.changeLanguage(newLang);
    localStorage.setItem('caresphere_lang', newLang);

    if (token && user) {
      try {
        await fetch(apiUrl('/api/auth/update-language'), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ preferred_language: newLang })
        });
        setUser(prev => prev ? { ...prev, preferred_language: newLang } : null);
      } catch (err) {
        console.error('Failed to sync language to server profile:', err);
      }
    }
  };

  const refreshUser = async () => {
    if (token) {
      await fetchCurrentUser(token);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user ? user.role : null,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        setLanguage,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
