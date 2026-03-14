import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

const API = 'http://localhost:8000/api/v1'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })

  const login = useCallback(async (username, password) => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || 'Ошибка входа')
    }
    const data = await res.json()
    const meRes = await fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    })
    const me = meRes.ok ? await meRes.json() : {}
    const userInfo = {
      id: data.user_id,
      role: data.role,
      username: me.username || username,
      class_name: me.class_name || null,
    }
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user', JSON.stringify(userInfo))
    setToken(data.access_token)
    setUser(userInfo)
    return data.role
  }, [])

  const register = useCallback(async (payload) => {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || 'Ошибка регистрации')
    }
    return res.json()
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
