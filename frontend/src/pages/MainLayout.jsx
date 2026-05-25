import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, BarChart2, Activity } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { api } from '../api/client'

export default function MainLayout() {
  const { user, activeSessionId, setActiveSession } = useApp()
  const navigate = useNavigate()
  const [showStartModal, setShowStartModal] = useState(false)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!user) navigate('/', { replace: true })
  }, [user])

  if (!user) return null

  const handleCenterPress = () => {
    if (activeSessionId) {
      navigate(`/session/${activeSessionId}`)
    } else {
      setShowStartModal(true)
    }
  }

  const handleStartSession = async () => {
    setStarting(true)
    try {
      const session = await api.startSession(user.id)
      setActiveSession(session.id)
      setShowStartModal(false)
      navigate(`/session/${session.id}`)
    } catch (e) {
      alert(e.message)
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>

      <nav
        className="flex-shrink-0 bg-slate-900 border-t border-slate-800 safe-bottom"
        style={{ overflow: 'visible' }}
      >
        <div className="flex items-end h-16">

          {/* Dashboard */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                isActive ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
              }`
            }
          >
            <LayoutDashboard size={22} />
            Dashboard
          </NavLink>

          {/* ── Center session button — always visible ── */}
          <div
            className="w-20 flex-shrink-0 flex justify-center"
            style={{ position: 'relative', height: '64px' }}
          >
            {/* Outer wrapper: handles pulse-scale + ring shadow (no overflow:hidden so shadow is visible) */}
            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                width: '64px',
                height: '64px',
                borderRadius: '9999px',
                animation: activeSessionId
                  ? 'gym-pulse-active 2s ease-in-out infinite'
                  : 'none',
              }}
            >
              <button
                onClick={handleCenterPress}
                aria-label={activeSessionId ? 'Rutina activa' : 'Iniciar rutina'}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '9999px',
                  border: '4px solid #0f172a', /* slate-900 */
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  /* Inactive base */
                  background: activeSessionId ? 'transparent' : '#4f46e5',
                  boxShadow: activeSessionId
                    ? 'none'
                    : '0 4px 20px rgba(99,102,241,0.35)',
                  transition: 'transform 80ms',
                }}
                onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.93)')}
                onPointerUp={e => (e.currentTarget.style.transform = '')}
                onPointerLeave={e => (e.currentTarget.style.transform = '')}
              >
                {/* Spinning conic gradient — only when active */}
                {activeSessionId && (
                  <div
                    style={{
                      position: 'absolute',
                      width: '220%',
                      height: '220%',
                      top: '-60%',
                      left: '-60%',
                      background:
                        'conic-gradient(from 0deg, #047857, #059669, #10b981, #34d399, #6ee7b7, #34d399, #10b981, #059669, #047857)',
                      animation: 'gym-spin 2s linear infinite',
                    }}
                  />
                )}

                {/* Slight dark overlay for icon contrast */}
                {activeSessionId && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.18)',
                      zIndex: 5,
                    }}
                  />
                )}

                <Activity
                  size={26}
                  color="white"
                  style={{ position: 'relative', zIndex: 10 }}
                />
              </button>
            </div>
          </div>

          {/* Progreso */}
          <NavLink
            to="/history"
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                isActive ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
              }`
            }
          >
            <BarChart2 size={22} />
            Progreso
          </NavLink>

        </div>
      </nav>

      {/* ── Start session modal ── */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => !starting && setShowStartModal(false)}
          />
          <div className="relative w-full bg-slate-800 rounded-t-3xl p-6 space-y-5">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-600 rounded-full" />

            <div className="pt-2 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <Activity size={22} className="text-emerald-400" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg leading-tight">
                  ¿Iniciar sesión de hoy?
                </h2>
                <p className="text-slate-400 text-sm mt-0.5">
                  Se registrará como nueva sesión de entrenamiento
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowStartModal(false)}
                disabled={starting}
                className="py-3.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleStartSession}
                disabled={starting}
                className="py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl font-semibold transition-colors"
              >
                {starting ? 'Iniciando…' : 'Empezar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
