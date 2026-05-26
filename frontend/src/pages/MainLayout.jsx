import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, BarChart2, Activity } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { api } from '../api/client'

export default function MainLayout() {
  const { user, activeSessionId, setActiveSession } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const histActive = location.pathname.startsWith('/history')
  const [showStartModal, setShowStartModal] = useState(false)
  const [showEndModal, setShowEndModal] = useState(false)
  const [starting, setStarting] = useState(false)
  const [ending, setEnding] = useState(false)
  const [endSessionInfo, setEndSessionInfo] = useState(null)

  // Load session summary when end modal opens
  useEffect(() => {
    if (!showEndModal || !activeSessionId) return
    setEndSessionInfo(null)
    api.getSession(activeSessionId)
      .then(s => setEndSessionInfo(s))
      .catch(() => {})
  }, [showEndModal])

  const fmtElapsed = (startedAt) => {
    if (!startedAt) return ''
    const start = new Date(/Z$|[+-]\d{2}/.test(startedAt) ? startedAt : startedAt.replace(' ', 'T') + 'Z')
    const secs = Math.floor((Date.now() - start.getTime()) / 1000)
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  }

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

  const handleEndSession = async () => {
    setEnding(true)
    try {
      const session = endSessionInfo || await api.getSession(activeSessionId)
      if (!session.sets || session.sets.length === 0) {
        await api.deleteSession(activeSessionId)
      } else {
        await api.endSession(activeSessionId)
      }
      setActiveSession(null)
      setShowEndModal(false)
      setEndSessionInfo(null)
      navigate('/dashboard')
    } catch (e) {
      alert(e.message)
    } finally {
      setEnding(false)
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
        style={{ overflow: 'visible', position: 'relative' }}
      >
        {/* C: Sliding pill indicator */}
        <div style={{
          position: 'absolute',
          bottom: '7px',
          left: histActive
            ? 'calc((100% - 80px) * 3 / 4 + 80px)'
            : 'calc((100% - 80px) / 4)',
          transform: 'translateX(-50%)',
          width: '28px',
          height: '3px',
          borderRadius: '9999px',
          background: '#6366f1',
          opacity: location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/history') ? 1 : 0,
          transition: 'left 280ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease',
          pointerEvents: 'none',
        }} />

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

      {/* ── End session modal ── */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => !ending && setShowEndModal(false)} />
          <div className="relative w-full bg-slate-800 rounded-t-3xl p-6 space-y-5">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-600 rounded-full" />
            <div className="pt-2 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <Activity size={22} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg leading-tight">¿Finalizar sesión?</h2>
                <p className="text-slate-400 text-sm mt-0.5">
                  {endSessionInfo
                    ? `${fmtElapsed(endSessionInfo.started_at)} · ${endSessionInfo.sets?.length ?? 0} serie${(endSessionInfo.sets?.length ?? 0) !== 1 ? 's' : ''}`
                    : '…'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setShowEndModal(false); setEndSessionInfo(null); navigate(`/session/${activeSessionId}`) }}
                disabled={ending}
                className="py-3.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors"
              >
                Seguir
              </button>
              <button
                onClick={handleEndSession}
                disabled={ending}
                className="py-3.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white rounded-xl font-semibold transition-colors"
              >
                {ending ? 'Finalizando…' : 'Finalizar'}
              </button>
            </div>
          </div>
        </div>
      )}

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
