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

  const [activeSessionStartedAt, setActiveSessionStartedAtState] = useState(() => {
    return localStorage.getItem('gym_active_session_started_at') || null
  })

  const [statsCache, setStatsCacheState] = useState({})
  const setStatsCache = (userId, data) =>
    setStatsCacheState(prev => ({ ...prev, [userId]: data }))

  // id: number | null   startedAt: ISO string | null
  const setActiveSession = (id, startedAt = null) => {
    setActiveSessionIdState(id ?? null)
    setActiveSessionStartedAtState(startedAt ?? null)
    if (id != null) {
      localStorage.setItem('gym_active_session', String(id))
      if (startedAt) localStorage.setItem('gym_active_session_started_at', String(startedAt))
      else           localStorage.removeItem('gym_active_session_started_at')
    } else {
      localStorage.removeItem('gym_active_session')
      localStorage.removeItem('gym_active_session_started_at')
    }
  }

  useEffect(() => {
    if (!user) { setActiveSession(null); return }
    if (!activeSessionId) return
    api.getSession(activeSessionId)
      .then(s => {
        if (s.ended_at) setActiveSession(null)
        else if (!activeSessionStartedAt && s.started_at)
          setActiveSessionStartedAtState(s.started_at)
      })
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
    <AppContext.Provider value={{
      user, selectUser, logout,
      activeSessionId, activeSessionStartedAt, setActiveSession,
      statsCache, setStatsCache,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
