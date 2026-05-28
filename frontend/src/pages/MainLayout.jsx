import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, BarChart2, Activity, LogOut } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { api } from '../api/client'
import Dashboard from './Dashboard'
import History from './History'
import BottomSheet from '../components/BottomSheet'

const COLORS = ['bg-indigo-500', 'bg-violet-500', 'bg-pink-500', 'bg-emerald-500', 'bg-amber-500', 'bg-sky-500', 'bg-rose-500', 'bg-teal-500']
const colorFor  = (id)   => COLORS[id % COLORS.length]
const initials  = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

export default function MainLayout() {
  const { user, logout, activeSessionId, setActiveSession } = useApp()
  const navigate = useNavigate()
  const location = useLocation()

  const isTabRoute = location.pathname === '/dashboard' || location.pathname === '/history'
  const tabIndex   = location.pathname === '/history' ? 1 : 0
  const tabIndexRef = useRef(tabIndex)

  const [showStartModal, setShowStartModal] = useState(false)
  const [showEndModal,   setShowEndModal]   = useState(false)
  const [starting, setStarting] = useState(false)
  const [ending,   setEnding]   = useState(false)
  const [endSessionInfo, setEndSessionInfo] = useState(null)

  // ── Swipe refs ─────────────────────────────────────────────────────────────
  const navRef       = useRef(null)  // nav element — used for accurate width in setPillX
  const wrapperRef   = useRef(null)
  const containerRef = useRef(null)
  const pillRef      = useRef(null)

  const touchStartX   = useRef(0)
  const touchStartY   = useRef(0)
  const touchStartMs  = useRef(0)
  const dirLocked     = useRef(null)
  const swipeActive   = useRef(false)

  useEffect(() => { tabIndexRef.current = tabIndex }, [tabIndex])

  // Snap container to tab position
  const snapTo = (idx, animate) => {
    if (!containerRef.current) return
    containerRef.current.style.transition = animate
      ? 'transform 280ms cubic-bezier(0.4,0,0.2,1)'
      : 'none'
    containerRef.current.style.transform = `translateX(${-idx * 50}%)`
  }

  // Move pill to tab position — uses navRef for accurate width
  const setPillX = (progress, animate) => {
    const pill = pillRef.current
    if (!pill) return
    const W = navRef.current?.offsetWidth || window.innerWidth
    const leftDash = (W - 80) / 4
    const leftHist = (W - 80) * (3 / 4) + 80
    const px = leftDash + (leftHist - leftDash) * Math.max(0, Math.min(1, progress))
    pill.style.transition = animate ? 'left 280ms cubic-bezier(0.4,0,0.2,1)' : 'none'
    pill.style.left = `${px}px`
  }

  // useLayoutEffect → fires before first paint → no flash of wrong position
  useLayoutEffect(() => {
    const isInit = !containerRef.current?.dataset.initialized
    snapTo(tabIndex, !isInit)
    setPillX(tabIndex, !isInit)
    if (containerRef.current) containerRef.current.dataset.initialized = 'true'
  }, [tabIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Non-passive touch listeners ────────────────────────────────────────────
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const onStart = (e) => {
      touchStartX.current  = e.touches[0].clientX
      touchStartY.current  = e.touches[0].clientY
      touchStartMs.current = Date.now()
      dirLocked.current    = null
      swipeActive.current  = false
      if (containerRef.current) containerRef.current.style.transition = 'none'
      if (pillRef.current)      pillRef.current.style.transition      = 'none'
    }

    const onMove = (e) => {
      const dx = e.touches[0].clientX - touchStartX.current
      const dy = e.touches[0].clientY - touchStartY.current

      if (dirLocked.current === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        dirLocked.current = Math.abs(dx) > Math.abs(dy) * 1.1 ? 'h' : 'v'
      }
      if (dirLocked.current !== 'h') return

      e.preventDefault()
      swipeActive.current = true

      const idx     = tabIndexRef.current
      const screenW = window.innerWidth
      let dragPct   = (dx / screenW) * 50

      // Rubber band at edges
      if (dragPct > 0 && idx === 0) dragPct *= 0.12
      if (dragPct < 0 && idx === 1) dragPct *= 0.12

      const baseX    = -idx * 50
      const progress = idx + (-dragPct / 50)

      if (containerRef.current) {
        containerRef.current.style.transform = `translateX(${baseX + dragPct}%)`
      }
      setPillX(progress, false)
    }

    const onEnd = (e) => {
      const idx = tabIndexRef.current

      if (!swipeActive.current) {
        snapTo(idx, true)
        setPillX(idx, true)
        return
      }

      const dx       = e.changedTouches[0].clientX - touchStartX.current
      const dt       = Math.max(Date.now() - touchStartMs.current, 1)
      const velocity = Math.abs(dx) / dt
      const screenW  = window.innerWidth

      const DIST_THRESHOLD = screenW * 0.22
      const VEL_THRESHOLD  = 0.35

      let newTab = idx
      if (dx < 0 && idx === 0 && (Math.abs(dx) > DIST_THRESHOLD || velocity > VEL_THRESHOLD)) newTab = 1
      if (dx > 0 && idx === 1 && (Math.abs(dx) > DIST_THRESHOLD || velocity > VEL_THRESHOLD)) newTab = 0

      if (newTab !== idx) {
        navigate(newTab === 0 ? '/dashboard' : '/history')
        // useLayoutEffect will fire and call snapTo + setPillX for the new tab
      } else {
        snapTo(idx, true)
        setPillX(idx, true)
      }

      swipeActive.current = false
    }

    wrapper.addEventListener('touchstart', onStart, { passive: true  })
    wrapper.addEventListener('touchmove',  onMove,  { passive: false })
    wrapper.addEventListener('touchend',   onEnd,   { passive: true  })

    return () => {
      wrapper.removeEventListener('touchstart', onStart)
      wrapper.removeEventListener('touchmove',  onMove)
      wrapper.removeEventListener('touchend',   onEnd)
    }
  }, [navigate])

  // ── Session helpers ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showEndModal || !activeSessionId) return
    setEndSessionInfo(null)
    api.getSession(activeSessionId).then(s => setEndSessionInfo(s)).catch(() => {})
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

      {/* ── Static shared header — only for tab routes ── */}
      {isTabRoute && (
        <div className="flex-shrink-0 px-4 pt-6 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className={`w-10 h-10 rounded-xl ${colorFor(user.id)} flex items-center justify-center font-bold text-white text-xs overflow-hidden flex-shrink-0`}
              title="Cambiar usuario"
            >
              {user.avatar
                ? <img src={user.avatar} alt={user.name} className="w-full h-full rounded-xl object-cover" />
                : initials(user.name)
              }
            </button>
            <div>
              <p className="text-slate-400 text-xs">Bienvenido,</p>
              <h1 className="text-white font-bold leading-tight">{user.name}</h1>
            </div>
          </div>
          <button onClick={logout} className="p-2 text-slate-500 hover:text-white transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      )}

      {/* ── Main content area ── */}
      <div className="flex-1 overflow-hidden relative">

        {/* Two-panel swipe container — always mounted */}
        <div
          ref={wrapperRef}
          className="absolute inset-0"
          style={{ display: isTabRoute ? 'block' : 'none' }}
        >
          <div
            ref={containerRef}
            style={{ display: 'flex', width: '200%', height: '100%', willChange: 'transform' }}
          >
            <div style={{ width: '50%', height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
              <Dashboard />
            </div>
            <div style={{ width: '50%', height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
              <History />
            </div>
          </div>
        </div>

        {/* Normal outlet — Session, Import … */}
        {!isTabRoute && <Outlet />}

      </div>

      {/* ── Bottom nav ── */}
      <nav
        ref={navRef}
        className="flex-shrink-0 bg-slate-900 border-t border-slate-800 safe-bottom"
        style={{ overflow: 'visible', position: 'relative' }}
      >
        {/* Sliding pill — position set entirely by JS (setPillX) */}
        <div
          ref={pillRef}
          style={{
            position:      'absolute',
            bottom:        '7px',
            width:         '28px',
            height:        '3px',
            borderRadius:  '9999px',
            background:    '#6366f1',
            opacity:       isTabRoute ? 1 : 0,
            transform:     'translateX(-50%)',
            pointerEvents: 'none',
          }}
        />

        <div className="flex items-end h-16">

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

          {/* ── Center session button ── */}
          <div className="w-20 flex-shrink-0 flex justify-center" style={{ position: 'relative', height: '64px' }}>
            <div
              style={{
                position:     'absolute',
                bottom:       '12px',
                width:        '64px',
                height:       '64px',
                borderRadius: '9999px',
                animation:    activeSessionId ? 'gym-pulse-active 2s ease-in-out infinite' : 'none',
              }}
            >
              <button
                onClick={handleCenterPress}
                aria-label={activeSessionId ? 'Rutina activa' : 'Iniciar rutina'}
                style={{
                  width:          '100%',
                  height:         '100%',
                  borderRadius:   '9999px',
                  border:         '4px solid #0f172a',
                  overflow:       'hidden',
                  position:       'relative',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  cursor:         'pointer',
                  background:     activeSessionId ? 'transparent' : '#4f46e5',
                  boxShadow:      activeSessionId ? 'none' : '0 4px 20px rgba(99,102,241,0.35)',
                  transition:     'transform 80ms',
                }}
                onPointerDown={e  => (e.currentTarget.style.transform = 'scale(0.93)')}
                onPointerUp={e    => (e.currentTarget.style.transform = '')}
                onPointerLeave={e => (e.currentTarget.style.transform = '')}
              >
                {activeSessionId && (
                  <div style={{
                    position:   'absolute',
                    width:      '220%',
                    height:     '220%',
                    top:        '-60%',
                    left:       '-60%',
                    background: 'conic-gradient(from 0deg, #047857, #059669, #10b981, #34d399, #6ee7b7, #34d399, #10b981, #059669, #047857)',
                    animation:  'gym-spin 2s linear infinite',
                  }} />
                )}
                {activeSessionId && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.18)', zIndex: 5 }} />
                )}
                <Activity size={26} color="white" style={{ position: 'relative', zIndex: 10 }} />
              </button>
            </div>
          </div>

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
        <BottomSheet
          onClose={() => { setShowEndModal(false); setEndSessionInfo(null) }}
          locked={ending}
        >
          {() => (
            <div className="px-6 pb-6 pt-2 space-y-5">
              <div className="flex items-center gap-4">
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
                >Seguir</button>
                <button
                  onClick={handleEndSession}
                  disabled={ending}
                  className="py-3.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white rounded-xl font-semibold transition-colors"
                >{ending ? 'Finalizando…' : 'Finalizar'}</button>
              </div>
            </div>
          )}
        </BottomSheet>
      )}

      {/* ── Start session modal ── */}
      {showStartModal && (
        <BottomSheet
          onClose={() => setShowStartModal(false)}
          locked={starting}
        >
          {() => (
            <div className="px-6 pb-6 pt-2 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                  <Activity size={22} className="text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg leading-tight">¿Iniciar sesión de hoy?</h2>
                  <p className="text-slate-400 text-sm mt-0.5">Se registrará como nueva sesión de entrenamiento</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowStartModal(false)}
                  disabled={starting}
                  className="py-3.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors"
                >Cancelar</button>
                <button
                  onClick={handleStartSession}
                  disabled={starting}
                  className="py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl font-semibold transition-colors"
                >{starting ? 'Iniciando…' : 'Empezar'}</button>
              </div>
            </div>
          )}
        </BottomSheet>
      )}

    </div>
  )
}
