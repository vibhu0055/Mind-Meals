import { createContext, useContext, useState, useCallback } from 'react';
import { loginUser } from '../../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('mm_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('mm_token') || null);

  const login = useCallback(async (email, password, role) => {
    const res = await loginUser({ email, password, role });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('mm_token', newToken);
    localStorage.setItem('mm_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('mm_token');
    localStorage.removeItem('mm_user');
    setToken(null);
    setUser(null);
  }, []);

  const isAuthenticated = !!token && !!user;
  const role = user?.role || null;
  const isSchool = role === 'school';
  const isTeacher = role === 'teacher';

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated, role, isSchool, isTeacher }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
