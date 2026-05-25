import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../api/client'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gym_user')) } catch { return null }
  })

  const [activeSessionId, setActiveSessionIdState] = useState(() => {
    const s = localStorage.getItem('gym_active_session')
    return s ? Number(s) : null
  })

  const setActiveSession = (id) => {
    setActiveSessionIdState(id ?? null)
    if (id != null) {
      localStorage.setItem('gym_active_session', String(id))
    } else {
      localStorage.removeItem('gym_active_session')
    }
  }

  // Verify stored session is still open when user changes
  useEffect(() => {
    if (!user) { setActiveSession(null); return }
    if (!activeSessionId) return
    api.getSession(activeSessionId)
      .then(s => { if (s.ended_at) setActiveSession(null) })
      .catch(() => setActiveSession(null))
  }, [user?.id])

  const selectUser = (u) => {
    setUser(u)
    localStorage.setItem('gym_user', JSON.stringify(u))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('gym_user')
    setActiveSession(null)
  }

  return (
    <AppContext.Provider value={{ user, selectUser, logout, activeSessionId, setActiveSession }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
