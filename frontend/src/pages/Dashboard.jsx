import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Calendar, CheckCircle, Clock, ChevronRight, X, Dumbbell } from 'lucide-react'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'
import BottomSheet from '../components/BottomSheet'
import SessionPreview from '../components/SessionPreview'
import PullToRefresh from '../components/PullToRefresh'
import dayjs from 'dayjs'
import 'dayjs/locale/es'

dayjs.locale('es')

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function fmtDur(secs) {
  secs = Math.max(0, secs)
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

export default function Dashboard() {
  const { user, activeSessionId, setActiveSession } = useApp()
  const navigate  = useNavigate()
  const location  = useLocation()
  const isActive  = location.pathname === '/dashboard'

  const [todayRoutines, setTodayRoutines] = useState([])
  const [sessionPlan,   setSessionPlan]   = useState(null)
  const [loadedTemplate, setLoadedTemplate] = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [starting,  setStarting]  = useState(false)
  const [showRoutinePicker, setShowRoutinePicker] = useState(false)

  const todayIdx = new Date().getDay()
  const today    = dayjs()

  useEffect(() => {
    if (!isActive) return   // only fetch when this tab is visible
    const todayDay = new Date().getDay()
    setLoading(true)
    Promise.all([
      api.getRoutines(user.id),
      api.getPlan(user.id).catch(() => null),
    ]).then(([rs, p]) => {
      setTodayRoutines(rs.filter(r => r.days.includes(todayDay)))
      setSessionPlan(p)
    }).finally(() => setLoading(false))
  }, [user.id, isActive])

  // Redirect to session only when actually on /dashboard (isActive).
  // Without isActive guard, handleStart's navigate + this useEffect both fire
  // simultaneously causing a double-navigate that loses location.state (template).
  useEffect(() => {
    if (activeSessionId && isActive) {
      navigate(`/session/${activeSessionId}`, { replace: true })
    }
  }, [activeSessionId, isActive])

  // Panel 0: show session preview (static, uses cache) so swipe reveals real content
  if (activeSessionId) return <SessionPreview sessionId={String(activeSessionId)} />

  // ── Template handlers ──────────────────────────────────────────────────────
  const handleLoadPlan = () =>
    setLoadedTemplate({ type: 'plan', exercises: sessionPlan.exercises })

  const handleLoadRoutine = (r) => {
    setLoadedTemplate({ type: 'routine', exercises: r.exercises })
    setShowRoutinePicker(false)
  }

  const onClickRoutineButton = () =>
    todayRoutines.length === 1 ? handleLoadRoutine(todayRoutines[0]) : setShowRoutinePicker(true)

  // ── Start session ──────────────────────────────────────────────────────────
  const handleStart = async () => {
    setStarting(true)
    try {
      const session = await api.startSession(user.id)
      setActiveSession(session.id, session.started_at)
      if (loadedTemplate?.type === 'plan') {
        api.deletePlan(user.id).catch(() => {})
        setSessionPlan(null)
      }
      navigate(`/session/${session.id}`, { state: { template: loadedTemplate } })
    } catch (e) { alert(e.message) }
    finally { setStarting(false) }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW: session launcher (active session handled by redirect above)
  // ─────────────────────────────────────────────────────────────────────────
  const hasTemplateOptions = !loading && (todayRoutines.length > 0 || sessionPlan)
  const scrollRef = useRef(null)

  const handleRefresh = useCallback(
    () => new Promise(() => window.location.reload()),
    []
  )

  return (
    <PullToRefresh onRefresh={handleRefresh} scrollRef={scrollRef}>
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto no-scrollbar bg-slate-900 page-in"
      style={{ overscrollBehaviorY: 'none' }}
    >
      <div className="px-4 pt-4 flex flex-col min-h-full" style={{ paddingBottom: '112px' }}>

        {/* Date */}
        <div className="mb-6">
          <p className="text-slate-400 text-sm">
            {DAY_NAMES[todayIdx]}, {today.format('D [de] MMMM')}
          </p>
        </div>

        <div className="flex-1 flex flex-col justify-center space-y-4 max-w-sm w-full mx-auto">

          {/* Template options */}
          {hasTemplateOptions && !loadedTemplate && (
            <div className="space-y-2">
              {sessionPlan && (
                <button
                  onClick={handleLoadPlan}
                  className="w-full flex items-center gap-3 px-4 py-3.5 bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 rounded-2xl transition-colors text-left"
                >
                  <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-emerald-300 font-semibold text-sm">Próxima sesión</p>
                    <p className="text-emerald-700 text-xs">
                      {sessionPlan.exercises.length} ejercicios planificados
                    </p>
                  </div>
                </button>
              )}
              {todayRoutines.length > 0 && (
                <button
                  onClick={onClickRoutineButton}
                  className="w-full flex items-center gap-3 px-4 py-3.5 bg-indigo-500/10 border border-indigo-500/25 hover:bg-indigo-500/20 rounded-2xl transition-colors text-left"
                >
                  <Calendar size={18} className="text-indigo-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-400 text-xs">Hoy toca rutina de:</p>
                    <p className="text-indigo-300 font-semibold text-sm truncate">
                      {todayRoutines.length === 1
                        ? todayRoutines[0].name
                        : `${todayRoutines.length} rutinas disponibles`}
                    </p>
                  </div>
                  <span className="text-indigo-500 text-xs font-semibold flex-shrink-0">
                    {todayRoutines.length > 1 ? 'Elegir' : 'Cargar'}
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Loaded template */}
          {loadedTemplate && (
            <div className="bg-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                  {loadedTemplate.type === 'routine' ? 'Rutina cargada' : 'Sesión planificada'}
                </span>
                <button
                  onClick={() => setLoadedTemplate(null)}
                  className="flex items-center gap-1 text-xs text-slate-600 hover:text-red-400 transition-colors"
                >
                  <X size={12} />
                  Quitar
                </button>
              </div>
              <div className="space-y-1.5">
                {loadedTemplate.exercises.map((ex, i) => (
                  <div key={ex.id} className="flex items-center gap-2 text-sm">
                    <span className="text-slate-600 text-xs w-4 text-right flex-shrink-0">{i+1}</span>
                    {ex.type === 'time'
                      ? <Clock size={12} className="text-amber-400 flex-shrink-0" />
                      : <Dumbbell size={12} className="text-indigo-400 flex-shrink-0" />}
                    <span className="text-slate-300 truncate">{ex.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Start button */}
          <button
            onClick={handleStart}
            disabled={starting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-60 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-2 transition-all text-lg"
          >
            <Plus size={22} />
            {starting ? 'Iniciando…' : 'Empezar entrenamiento'}
          </button>

        </div>
      </div>

      {/* Routine picker */}
      {showRoutinePicker && (
        <BottomSheet onClose={() => setShowRoutinePicker(false)}>
          {({ dismiss }) => (
            <div className="px-5 pb-8 pt-2 space-y-3">
              <h2 className="text-white font-bold text-base mb-1">Rutinas de hoy</h2>
              {todayRoutines.map(r => (
                <button
                  key={r.id}
                  onClick={() => { handleLoadRoutine(r); dismiss() }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 bg-slate-800 hover:bg-slate-700 rounded-2xl text-left transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{r.name}</p>
                    <p className="text-slate-500 text-xs">
                      {r.exercises.length} ejercicio{r.exercises.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </BottomSheet>
      )}
    </div>
    </PullToRefresh>
  )
}
