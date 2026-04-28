import { createContext, useContext, useState, useCallback } from 'react'
import { authAPI } from '../services/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('mm_user')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)

  const login = useCallback(async (email, password, role) => {
    setLoading(true)
    setError(null)
    try {
      // Try real API first; fall back to mock for development
      let data
      try {
        data = await authAPI.login(email, password, role)
        localStorage.setItem('mm_token', data.token)
      } catch {
        // MOCK fallback — remove when backend is ready
        data = {
          user: { id: 1, name: getDemoName(role), email, role },
          token: 'demo-token'
        }
        localStorage.setItem('mm_token', 'demo-token')
      }
      localStorage.setItem('mm_user', JSON.stringify(data.user))
      setUser(data.user)
      return data.user
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('mm_token')
    localStorage.removeItem('mm_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

function getDemoName(role) {
  const names = { principal: 'Dr. Anjali Rao', teacher: 'Ms. Priya Sharma', parent: 'Mr. Raj Kumar', admin: 'System Admin' }
  return names[role] || 'User'
}
