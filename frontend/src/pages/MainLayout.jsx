import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { BarChart2, Activity, LogOut, CalendarDays } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { api } from '../api/client'
import Dashboard from './Dashboard'
import History from './History'
import Planner from './Planner'
import BottomSheet from '../components/BottomSheet'
import SettingsSheet from '../components/SettingsSheet'

const COLORS = ['bg-indigo-500','bg-violet-500','bg-pink-500','bg-emerald-500','bg-amber-500','bg-sky-500','bg-rose-500','bg-teal-500']
const colorFor = (id)   => COLORS[id % COLORS.length]
const initials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

function fmtDur(secs) {
  secs = Math.max(0, secs)
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

const toUTC = (s) => s ? new Date(/Z$|[+-]\d{2}/.test(s) ? s : s.replace(' ', 'T') + 'Z') : null

export default function MainLayout() {
  const { user, logout, activeSessionId, activeSessionStartedAt, setActiveSession } = useApp()
  const navigate = useNavigate()
  const location = useLocation()

  // Nav logic
  // Swipe panels order: Dashboard=0  Planner=1  History=2
  // Nav visual order:   [⬤ Inicio]  [Plan]      [Progreso]
  const isSwipeTab    = ['/planner', '/dashboard', '/history'].includes(location.pathname)
  const isSessionRoute = location.pathname.startsWith('/session/')
  const onDashboard   = location.pathname === '/dashboard'
  const tabIndex = location.pathname === '/history'  ? 2
                 : location.pathname === '/planner'   ? 1
                 : 0  // dashboard

  const tabIndexRef = useRef(tabIndex)

  const [showSettings,    setShowSettings]    = useState(false)
  const [showLogoutWarn,  setShowLogoutWarn]  = useState(false)
  const [showEndConfirm,  setShowEndConfirm]  = useState(false)
  const [endingSession,   setEndingSession]   = useState(false)

  // Session elapsed timer (shown in header when on session route)
  const [sessionElapsed, setSessionElapsed] = useState(0)
  useEffect(() => {
    if (!activeSessionStartedAt) return
    const start = toUTC(activeSessionStartedAt)
    if (!start) return
    const tick = () => setSessionElapsed(Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [activeSessionStartedAt])

  // ── Swipe refs ─────────────────────────────────────────────────────────────
  const navRef       = useRef(null)
  const wrapperRef   = useRef(null)
  const containerRef = useRef(null)
  const pillRef      = useRef(null)

  const touchStartX  = useRef(0)
  const touchStartY  = useRef(0)
  const touchStartMs = useRef(0)
  const dirLocked    = useRef(null)
  const swipeActive  = useRef(false)

  useEffect(() => { tabIndexRef.current = tabIndex }, [tabIndex])

  // Snap container — 3 panels of 33.333% each
  const snapTo = (idx, animate) => {
    if (!containerRef.current) return
    containerRef.current.style.transition = animate
      ? 'transform 280ms cubic-bezier(0.4,0,0.2,1)'
      : 'none'
    containerRef.current.style.transform = `translateX(${-(idx * 100) / 3}%)`
  }

  // Pill position: 3 equal thirds inside the pill bar (accounts for 16px side padding)
  const NAV_PAD = 16
  const setPillX = (progress, animate) => {
    const pill = pillRef.current
    if (!pill) return
    const W     = navRef.current?.offsetWidth || window.innerWidth
    const inner = W - NAV_PAD * 2
    const each  = inner / 3
    const positions = [
      NAV_PAD + each / 2,         // 0: Dashboard
      NAV_PAD + each * 1.5,       // 1: Plan
      NAV_PAD + each * 2.5,       // 2: Progreso
    ]
    const lo = Math.max(0, Math.min(2, Math.floor(progress)))
    const hi = Math.min(2, lo + 1)
    const t  = progress - lo
    const px = positions[lo] + (positions[hi] - positions[lo]) * t
    pill.style.transition = animate ? 'left 280ms cubic-bezier(0.4,0,0.2,1)' : 'none'
    pill.style.left = `${px}px`
  }

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
      let dragPct   = (dx / screenW) * (100 / 3)

      if (dragPct > 0 && idx === 0) dragPct *= 0.12
      if (dragPct < 0 && idx === 2) dragPct *= 0.12

      const baseX    = -(idx * 100) / 3
      const progress = idx + (-dragPct / (100 / 3))

      if (containerRef.current)
        containerRef.current.style.transform = `translateX(${baseX + dragPct}%)`
      setPillX(progress, false)
    }

    const onEnd = (e) => {
      const idx = tabIndexRef.current

      if (!swipeActive.current) { snapTo(idx, true); setPillX(idx, true); return }

      const dx       = e.changedTouches[0].clientX - touchStartX.current
      const dt       = Math.max(Date.now() - touchStartMs.current, 1)
      const velocity = Math.abs(dx) / dt
      const screenW  = window.innerWidth

      const DIST_THRESHOLD = screenW * 0.22
      const VEL_THRESHOLD  = 0.35

      let newTab = idx
      if (dx < 0 && idx < 2 && (Math.abs(dx) > DIST_THRESHOLD || velocity > VEL_THRESHOLD)) newTab = idx + 1
      if (dx > 0 && idx > 0 && (Math.abs(dx) > DIST_THRESHOLD || velocity > VEL_THRESHOLD)) newTab = idx - 1

      if (newTab !== idx) {
        navigate(newTab === 0 ? '/dashboard' : newTab === 1 ? '/planner' : '/history')
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

  const handleEndSession = async () => {
    setEndingSession(true)
    try {
      const s = await api.getSession(activeSessionId)
      if (!s.sets?.length) await api.deleteSession(activeSessionId)
      else                  await api.endSession(activeSessionId)
      setActiveSession(null)
      setShowEndConfirm(false)
      navigate('/dashboard')
    } catch (e) { alert(e.message) }
    finally { setEndingSession(false) }
  }

  useEffect(() => {
    if (!user) navigate('/', { replace: true })
  }, [user])

  if (!user) return null

  return (
    <div className="flex flex-col h-full bg-slate-900 relative">

      {/* ── Shared header (always visible) ── */}
      <div className="flex-shrink-0 px-4 pt-6 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettings(true)}
            className={`w-10 h-10 rounded-xl ${colorFor(user.id)} flex items-center justify-center font-bold text-white text-xs overflow-hidden flex-shrink-0 active:scale-95 transition-transform`}
          >
            {user.avatar
              ? <img src={user.avatar} alt={user.name} className="w-full h-full rounded-xl object-cover" />
              : initials(user.name)}
          </button>
          {activeSessionId ? (
            <div>
              <p className="text-slate-400 text-xs">Sesión activa</p>
              <p className="text-white font-mono font-bold leading-tight">{fmtDur(sessionElapsed)}</p>
            </div>
          ) : (
            <div>
              <p className="text-slate-400 text-xs">Bienvenido,</p>
              <h1 className="text-white font-bold leading-tight">{user.name}</h1>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeSessionId && (
            <button
              onClick={() => setShowEndConfirm(true)}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Finalizar entrenamiento
            </button>
          )}
          <button
            onClick={() => activeSessionId ? setShowLogoutWarn(true) : logout()}
            className="flex items-center gap-1 px-2 py-2 text-slate-500 hover:text-white transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-hidden relative">

        {/* Swipe container: [Planner | Dashboard | History] */}
        <div
          ref={wrapperRef}
          className="absolute inset-0"
          style={{ display: isSwipeTab ? 'block' : 'none' }}
        >
          <div
            ref={containerRef}
            style={{ display: 'flex', width: '300%', height: '100%', willChange: 'transform' }}
          >
            <div style={{ width: '33.333%', height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
              <Dashboard />
            </div>
            <div style={{ width: '33.333%', height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
              <Planner />
            </div>
            <div style={{ width: '33.333%', height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
              <History />
            </div>
          </div>
        </div>

        {/* Outlet: Session, Import, … */}
        {!isSwipeTab && <Outlet />}

      </div>

      {/* ── Bottom nav — floating glass pill, overlays content ── */}
      <nav
        ref={navRef}
        className="safe-bottom"
        style={{ background: 'transparent', overflow: 'visible', position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40, padding: '0 16px 12px' }}
      >
        {/* Sliding pill indicator (inside pill bar, offset by padding) */}
        <div
          ref={pillRef}
          style={{
            position:      'absolute',
            bottom:        '19px',
            width:         '28px',
            height:        '3px',
            borderRadius:  '9999px',
            background:    '#6366f1',
            opacity:       isSwipeTab ? 1 : 0,
            transform:     'translateX(-50%)',
            pointerEvents: 'none',
          }}
        />

        {/* Glass pill — items-center keeps circle inside */}
        <div
          className="flex items-center h-16"
          style={{
            background:           'rgba(15, 23, 42, 0.88)',
            backdropFilter:       'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius:         '9999px',
            border:               '1px solid rgba(255, 255, 255, 0.09)',
            boxShadow:            '0 -2px 24px rgba(0,0,0,0.35), 0 8px 32px rgba(0,0,0,0.4)',
            overflow:             'visible',
          }}
        >

          {/* ── Inicio / circle — LEFT, vertically centered inside pill ── */}
          <div className="flex-1 flex items-center justify-center">
            <div style={{ animation: activeSessionId ? 'gym-pulse-active 1.5s ease-out infinite' : 'none', borderRadius: '9999px' }}>
              <button
                onClick={() => navigate('/dashboard')}
                aria-label="Inicio"
                style={{
                  width:          '52px',
                  height:         '52px',
                  borderRadius:   '9999px',
                  border:         '2px solid rgba(0,0,0,0.35)',
                  overflow:       'hidden',
                  position:       'relative',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  cursor:         'pointer',
                  background:     activeSessionId ? 'transparent' : onDashboard ? '#4f46e5' : 'rgba(99,102,241,0.2)',
                  boxShadow:      !activeSessionId && onDashboard ? '0 2px 12px rgba(99,102,241,0.4)' : 'none',
                  transition:     'transform 80ms',
                }}
                onPointerDown={e  => (e.currentTarget.style.transform = 'scale(0.92)')}
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
                <Activity size={20} color="white" style={{ position: 'relative', zIndex: 10 }} />
              </button>
            </div>
          </div>

          {/* Plan — CENTER */}
          <NavLink
            to="/planner"
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                isActive ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
              }`
            }
          >
            <CalendarDays size={20} />
            Plan
          </NavLink>

          {/* Progreso — RIGHT */}
          <NavLink
            to="/history"
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                isActive ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
              }`
            }
          >
            <BarChart2 size={20} />
            Progreso
          </NavLink>

        </div>
        {/* ─── end glass pill ─── */}
      </nav>

      {/* ── End session confirm ── */}
      {showEndConfirm && (
        <BottomSheet onClose={() => setShowEndConfirm(false)} locked={endingSession}>
          {() => (
            <div className="px-6 pb-6 pt-2 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
                  <Activity size={22} className="text-red-400" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg leading-tight">¿Finalizar entrenamiento?</h2>
                  <p className="text-slate-400 text-sm mt-0.5">La sesión quedará guardada en el historial.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  disabled={endingSession}
                  className="py-3.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors"
                >Seguir</button>
                <button
                  onClick={handleEndSession}
                  disabled={endingSession}
                  className="py-3.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white rounded-xl font-semibold transition-colors"
                >{endingSession ? 'Finalizando…' : 'Finalizar'}</button>
              </div>
            </div>
          )}
        </BottomSheet>
      )}

      {/* ── Settings sheet ── */}
      {showSettings && <SettingsSheet onClose={() => setShowSettings(false)} />}

      {/* ── Logout warning ── */}
      {showLogoutWarn && (
        <BottomSheet onClose={() => setShowLogoutWarn(false)}>
          {({ dismiss }) => (
            <div className="px-6 pb-6 pt-2 space-y-5">
              <div>
                <h2 className="text-white font-bold text-lg">Tienes una sesión activa</h2>
                <p className="text-slate-400 text-sm mt-1">¿Qué quieres hacer con la sesión en curso?</p>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => { dismiss(); navigate(`/session/${activeSessionId}`) }}
                  className="w-full py-3.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-colors"
                >Seguir entrenando</button>
                <button
                  onClick={async () => {
                    try {
                      const s = await api.getSession(activeSessionId)
                      if (!s.sets?.length) await api.deleteSession(activeSessionId)
                      else await api.endSession(activeSessionId)
                    } catch {}
                    setActiveSession(null)
                    logout()
                  }}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors"
                >Finalizar sesión y salir</button>
                <button
                  onClick={() => { logout(); dismiss() }}
                  className="w-full py-3 text-slate-500 hover:text-slate-300 text-sm transition-colors"
                >Salir sin finalizar</button>
              </div>
            </div>
          )}
        </BottomSheet>
      )}

    </div>
  )
}
