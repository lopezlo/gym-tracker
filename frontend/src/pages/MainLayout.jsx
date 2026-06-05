import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
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

  const tabIndexRef        = useRef(tabIndex)
  const activeSessionIdRef = useRef(activeSessionId)
  const prevIsSwipeTabRef  = useRef(isSwipeTab)
  useEffect(() => { activeSessionIdRef.current = activeSessionId }, [activeSessionId])

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
  // pillRef removed — pill indicator eliminated
  const outletRef    = useRef(null)  // for swipe on non-swipe routes

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

  // Pill removed — no-op stub kept to avoid refactoring all call sites
  const setPillX = () => {}

  useLayoutEffect(() => {
    const isInit        = !containerRef.current?.dataset.initialized
    const wasSwipeTab   = prevIsSwipeTabRef.current
    prevIsSwipeTabRef.current = isSwipeTab
    // Animate only when already navigating between swipe tabs, not when coming from session
    const shouldAnimate = !isInit && wasSwipeTab && isSwipeTab
    snapTo(tabIndex, shouldAnimate)
    setPillX(tabIndex, shouldAnimate)
    if (containerRef.current) containerRef.current.dataset.initialized = 'true'
  }, [tabIndex, isSwipeTab]) // eslint-disable-line react-hooks/exhaustive-deps

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
        if (newTab === 0 && activeSessionIdRef.current) {
          // Hide wrapper immediately — don't wait for React's re-render to avoid 1-frame flash
          if (wrapperRef.current) wrapperRef.current.style.display = 'none'
          navigate(`/session/${activeSessionIdRef.current}`)
        } else {
          navigate(newTab === 0 ? '/dashboard' : newTab === 1 ? '/planner' : '/history')
        }
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

  // ── Animated navigation FROM a swipe tab TO session ─────────────────────────
  // Swipe container slides out right, session (Outlet) appears beneath.
  const navigateToSession = useCallback(() => {
    if (!activeSessionId) { navigate('/dashboard'); return }
    const target  = `/session/${activeSessionId}`
    const wrapper = wrapperRef.current
    const cont    = containerRef.current
    const screenW = window.innerWidth
    if (!wrapper || !isSwipeTab) { navigate(target); return }

    // Reset container to the correct tab position BEFORE animating the wrapper.
    // After a mid-swipe-to-session gesture, containerRef may be at an intermediate
    // transform. If not corrected, SessionPreview (panel 0) appears at the wrong
    // screen position during the animation (causing the upper-right artifact).
    if (cont) {
      cont.style.transition = 'none'
      cont.style.transform  = `translateX(${-(tabIndex * 100) / 3}%)`
    }

    // Move by tabIndex panels: Plan (1×screenW) or Progress (2×screenW)
    const moveBy   = tabIndex * screenW
    const duration = tabIndex === 1 ? 280 : 400

    wrapper.style.transition = `transform ${duration}ms cubic-bezier(0.4,0,0.2,1)`
    wrapper.style.transform  = `translateX(${moveBy}px)`
    setTimeout(() => {
      wrapper.style.transition = ''
      wrapper.style.display    = 'none'
      navigate(target)
    }, duration)
  }, [activeSessionId, isSwipeTab, navigate, tabIndex])

  // Sync cleanup of wrapper AND container transforms when leaving swipe tabs
  useLayoutEffect(() => {
    if (!isSwipeTab) {
      if (wrapperRef.current) {
        wrapperRef.current.style.transform  = ''
        wrapperRef.current.style.transition = ''
      }
      if (containerRef.current) {
        containerRef.current.style.transform  = ''
        containerRef.current.style.transition = ''
      }
    }
  }, [isSwipeTab])

  // ── Animated navigation FROM session TO a swipe tab ──────────────────────────
  // Session slides out left, target tab slides in from right simultaneously.
  // Used both for swipe gestures and nav-bar taps.
  const slideSessionOut = useCallback((targetPath, targetPanelIdx) => {
    const el      = outletRef.current
    const wrapper = wrapperRef.current
    const cont    = containerRef.current
    const screenW = window.innerWidth
    if (!el || !wrapper || !cont) { navigate(targetPath); return }

    // Position swipe container at target panel, start it off-screen right
    cont.style.transition    = 'none'
    cont.style.transform     = `translateX(${-(targetPanelIdx * 100) / 3}%)`
    wrapper.style.transition = 'none'
    wrapper.style.transform  = `translateX(${screenW}px)`
    wrapper.style.display    = 'block'

    requestAnimationFrame(() => {
      const dur = '280ms cubic-bezier(0.4,0,0.2,1)'
      el.style.transition      = `transform ${dur}`
      el.style.transform       = `translateX(${-screenW}px)`
      wrapper.style.transition = `transform ${dur}`
      wrapper.style.transform  = 'translateX(0)'

      setTimeout(() => {
        // Don't reset el.transform — Outlet unmounts when isSwipeTab=true, removing element
        wrapper.style.transition = ''
        wrapper.style.transform  = ''
        navigate(targetPath)
      }, 280)
    })
  }, [navigate])

  // ── Swipe on session screen ──────────────────────────────────────────────────
  useEffect(() => {
    const el      = outletRef.current
    const wrapper = wrapperRef.current
    const cont    = containerRef.current
    if (!el || isSwipeTab) return

    let startX = 0, startY = 0, startMs = 0, dirLocked = null, screenW = window.innerWidth

    const snapBack = () => {
      const dur = '320ms cubic-bezier(0.34,1.2,0.64,1)'
      el.style.transition      = `transform ${dur}`
      el.style.transform       = 'translateX(0)'
      wrapper.style.transition = `transform ${dur}`
      wrapper.style.transform  = `translateX(${screenW}px)`
      setTimeout(() => {
        el.style.transition      = ''
        el.style.transform       = ''
        wrapper.style.display    = 'none'
        wrapper.style.transform  = ''
        wrapper.style.transition = ''
      }, 320)
    }

    const onStart = (e) => {
      startX    = e.touches[0].clientX
      startY    = e.touches[0].clientY
      startMs   = Date.now()
      screenW   = window.innerWidth
      dirLocked = null
      el.style.transition      = 'none'
      wrapper.style.transition = 'none'
      // Pre-position: container at Planner (panel 1), wrapper starts off-screen right
      if (cont) { cont.style.transition = 'none'; cont.style.transform = `translateX(${-(1 * 100) / 3}%)` }
      wrapper.style.transform = `translateX(${screenW}px)`
    }

    const onMove = (e) => {
      const dx = e.touches[0].clientX - startX
      const dy = e.touches[0].clientY - startY
      if (dirLocked === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        dirLocked = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'h' : 'v'
      }
      if (dirLocked !== 'h') return
      e.preventDefault()

      if (dx < 0) {
        // Session slides left, Plan slides in from right — simultaneously
        el.style.transform      = `translateX(${dx}px)`
        wrapper.style.display   = 'block'
        wrapper.style.transform = `translateX(${screenW + dx}px)`
      } else {
        // Rubber band: nothing to the right of session
        el.style.transform      = `translateX(${dx * 0.12}px)`
        wrapper.style.transform = `translateX(${screenW}px)` // keep off-screen
      }
    }

    const onEnd = (e) => {
      if (dirLocked !== 'h') return
      const dx       = e.changedTouches[0].clientX - startX
      const velocity = Math.abs(dx) / Math.max(Date.now() - startMs, 1)

      if (dx < 0 && (Math.abs(dx) > screenW * 0.25 || velocity > 0.35)) {
        // Complete slide to Plan
        const dur = '240ms ease-in'
        el.style.transition      = `transform ${dur}`
        el.style.transform       = `translateX(${-screenW}px)`
        wrapper.style.transition = `transform ${dur}`
        wrapper.style.transform  = 'translateX(0)'
        setTimeout(() => {
          // el unmounts when navigate fires (isSwipeTab=true) — no need to reset
          wrapper.style.transition = ''; wrapper.style.transform = ''
          navigate('/planner')
        }, 240)
      } else {
        snapBack()
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true  })
    el.addEventListener('touchmove',  onMove,  { passive: false })
    el.addEventListener('touchend',   onEnd,   { passive: true  })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove',  onMove)
      el.removeEventListener('touchend',   onEnd)
    }
  }, [isSwipeTab, navigate])

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
        {!isSwipeTab && (
          <div ref={outletRef} className="absolute inset-0">
            <Outlet />
          </div>
        )}

      </div>

      {/* ── Bottom nav — floating glass pill, overlays content ── */}
      <nav
        ref={navRef}
        className="safe-bottom"
        style={{
          background: 'transparent',
          overflow:   'visible',
          position:   'absolute',
          bottom:     0,
          left:       '50%',
          transform:  'translateX(-50%)',
          width:      'clamp(280px, 72%, 420px)',
          zIndex:     40,
          padding:    '0 12px 12px',
        }}
      >

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
                onClick={() => activeSessionId ? navigateToSession() : navigate('/dashboard')}
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
            onClick={isSessionRoute ? (e) => { e.preventDefault(); slideSessionOut('/planner', 1) } : undefined}
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
            onClick={isSessionRoute ? (e) => { e.preventDefault(); slideSessionOut('/history', 2) } : undefined}
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
