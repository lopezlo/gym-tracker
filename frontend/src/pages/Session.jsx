import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Plus, Trash2, Clock, Dumbbell, CheckCircle, ChevronRight, X } from 'lucide-react'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'
import ExerciseSelector from '../components/ExerciseSelector'
import ConfirmModal from '../components/ConfirmModal'
import BottomSheet from '../components/BottomSheet'
import dayjs from 'dayjs'

// ── Helpers ────────────────────────────────────────────────────────────────────
const toUTC = (s) => s ? new Date(/Z$|[+-]\d{2}/.test(s) ? s : s.replace(' ', 'T') + 'Z') : null

function useTimer(startIso) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!startIso) return
    const start = toUTC(startIso)
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startIso])
  return elapsed
}

function fmtDur(secs) {
  secs = Math.max(0, secs)
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function fmtSet(s) {
  if (s.exercise_type === 'time') {
    if (!s.duration) return '—'
    const mins = s.duration / 60
    return `${Number.isInteger(mins) ? mins : mins.toFixed(1)} min`
  }
  const parts = []
  if (s.weight != null) parts.push(`${s.weight}kg`)
  if (s.reps != null) parts.push(`×${s.reps}`)
  return parts.join(' ') || '—'
}

function playAlert() {
  navigator.vibrate?.([300, 100, 300, 100, 400])
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    ;[[0, 660], [0.45, 880], [0.9, 1100]].forEach(([delay, freq]) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'square'
      osc.frequency.value = freq
      const t = ctx.currentTime + delay
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.5, t + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38)
      osc.start(t); osc.stop(t + 0.38)
    })
  } catch {}
}

const stepVal = (val, setVal, delta, decimals = false) => setVal(prev => {
  const v = (decimals ? parseFloat(prev) : parseInt(prev)) || 0
  const result = Math.max(0, v + delta)
  return decimals ? String(Math.round(result * 2) / 2) : String(result)
})

// ── Rest Timer (in header) ─────────────────────────────────────────────────────
function RestTimer({ lastSetAt }) {
  const [rest, setRest] = useState(0)
  const alertedRef = useRef(false)

  const { restAlertEnabled = false, restDuration = 90 } = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('gym_settings')) ?? {} } catch { return {} }
  }, [lastSetAt])

  useEffect(() => {
    if (!lastSetAt) return
    alertedRef.current = false
    const t = toUTC(lastSetAt)
    const tick = () => {
      const elapsed = Math.floor((Date.now() - t.getTime()) / 1000)
      setRest(elapsed)
      if (restAlertEnabled && elapsed >= restDuration && !alertedRef.current) {
        alertedRef.current = true
        playAlert()
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [lastSetAt, restAlertEnabled, restDuration])

  if (!lastSetAt || !restAlertEnabled) return null

  const remaining = restDuration - Math.max(0, rest)
  if (remaining > 0) {
    const cls = remaining <= 5 ? 'text-amber-400' : 'text-emerald-400'
    return (
      <div className="flex items-center gap-1.5 text-slate-400 text-sm mt-1">
        <Clock size={13} />
        <span>Descanso: <span className={`font-mono font-semibold ${cls}`}>{fmtDur(remaining)}</span></span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5 text-sm mt-1">
      <Clock size={13} className="text-red-400" />
      <span className="text-red-400 font-semibold">¡A por ello!</span>
      <span className="text-slate-500 text-xs font-mono ml-1">+{fmtDur(-remaining)}</span>
    </div>
  )
}

// ── Ghost Card (planned, not yet started) ─────────────────────────────────────
function GhostCard({ exercise, onStart }) {
  return (
    <div className="bg-slate-800/50 border border-dashed border-slate-700 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        {exercise.type === 'time'
          ? <Clock size={14} className="text-amber-400/50 flex-shrink-0" />
          : <Dumbbell size={14} className="text-indigo-400/50 flex-shrink-0" />}
        <h4 className="text-slate-500 font-semibold text-sm flex-1 truncate">{exercise.name}</h4>
        <span className="text-[10px] text-slate-600 flex-shrink-0 font-medium uppercase tracking-wide">planificado</span>
      </div>
      <button
        onClick={() => onStart(exercise)}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-slate-700 hover:border-indigo-500 hover:bg-indigo-500/10 text-slate-600 hover:text-indigo-400 active:bg-indigo-500/20 transition-colors text-sm"
      >
        <Plus size={14} />
        Empezar
      </button>
    </div>
  )
}

// ── Exercise Card ──────────────────────────────────────────────────────────────
function ExerciseCard({ exId, group, onAddSet, onDeleteSet, newSetId }) {
  return (
    <div className="bg-slate-800 rounded-2xl p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        {group.type === 'time'
          ? <Clock size={14} className="text-amber-400 flex-shrink-0" />
          : <Dumbbell size={14} className="text-indigo-400 flex-shrink-0" />}
        <h4 className="text-white font-semibold text-sm flex-1 truncate">{group.name}</h4>
        <span className="text-slate-500 text-xs flex-shrink-0">
          {group.sets.length} serie{group.sets.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Set rows */}
      <div className="space-y-1.5 mb-3">
        {group.sets.map((s, i) => (
          <div
            key={s.id}
            className={`flex items-center gap-3 py-0.5 ${s.id === newSetId ? 'set-pop' : ''}`}
          >
            <span className="text-slate-500 text-xs w-4 text-right flex-shrink-0">{i + 1}</span>
            <span className="text-white font-mono text-sm flex-1">{fmtSet(s)}</span>
            <span className="text-slate-600 text-xs">{dayjs(toUTC(s.recorded_at)).format('HH:mm')}</span>
            <button
              onClick={() => onDeleteSet(s.id)}
              className="p-1 text-slate-600 hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* + Serie button */}
      <button
        onClick={onAddSet}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-slate-600 hover:border-indigo-500 hover:bg-indigo-500/10 text-slate-500 hover:text-indigo-400 active:bg-indigo-500/20 transition-colors text-sm"
      >
        <Plus size={14} />
        Serie
      </button>
    </div>
  )
}

// ── Add Set Sheet ──────────────────────────────────────────────────────────────
function AddSetSheet({ exercise, sessionId, sessionSets, onAdded, onClose }) {
  const { user } = useApp()
  const [weight, setWeight]     = useState('')
  const [reps, setReps]         = useState('')
  const [duration, setDuration] = useState('')
  const [adding, setAdding]     = useState(false)

  const setsForEx = sessionSets.filter(s => s.exercise_id === exercise.id)

  // Pre-fill from last set of this exercise
  useEffect(() => {
    const lastInSession = [...setsForEx].reverse()[0]
    if (lastInSession) {
      if (exercise.type === 'reps') {
        setWeight(lastInSession.weight != null ? String(lastInSession.weight) : '')
        setReps(lastInSession.reps != null ? String(lastInSession.reps) : '')
      } else {
        setDuration(lastInSession.duration != null ? String(lastInSession.duration / 60) : '')
      }
    } else {
      api.getLastSet(exercise.id, user.id).then(last => {
        if (!last) return
        if (exercise.type === 'reps') {
          setWeight(last.weight != null ? String(last.weight) : '')
          setReps(last.reps != null ? String(last.reps) : '')
        } else {
          setDuration(last.duration != null ? String(last.duration / 60) : '')
        }
      }).catch(() => {})
    }
  }, [exercise.id])

  const handleAdd = async () => {
    setAdding(true)
    try {
      const payload = { exercise_id: exercise.id }
      if (exercise.type === 'reps') {
        if (weight)   payload.weight   = parseFloat(weight)
        if (reps)     payload.reps     = parseInt(reps)
      } else {
        if (duration) payload.duration = Math.round(parseFloat(duration) * 60)
      }
      const newSet = await api.addSet(sessionId, payload)
      onAdded(newSet)
    } catch (e) { alert(e.message); setAdding(false) }
  }

  return (
    <BottomSheet onClose={onClose} locked={adding}>
      {() => (
        <div className="px-5 pb-8 pt-2 space-y-4">
          {/* Title */}
          <div className="flex items-center gap-2.5">
            {exercise.type === 'time'
              ? <Clock size={16} className="text-amber-400 flex-shrink-0" />
              : <Dumbbell size={16} className="text-indigo-400 flex-shrink-0" />}
            <h2 className="text-white font-bold text-base flex-1 truncate">{exercise.name}</h2>
            <span className="text-slate-500 text-sm flex-shrink-0">
              Serie {setsForEx.length + 1}
            </span>
          </div>

          {/* Previous sets chips (reference) */}
          {setsForEx.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {setsForEx.map((s, i) => (
                <span
                  key={s.id}
                  className="text-xs bg-slate-700 text-slate-400 rounded-lg px-2.5 py-1.5 font-mono"
                >
                  {i + 1}. {fmtSet(s)}
                </span>
              ))}
            </div>
          )}

          {/* Inputs */}
          {exercise.type === 'reps' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Peso (kg)</label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => stepVal(weight, setWeight, -2.5, true)}
                    className="w-9 h-9 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold flex-shrink-0 transition-colors"
                  >−</button>
                  <input
                    type="number" inputMode="decimal" value={weight}
                    onChange={e => setWeight(e.target.value)} placeholder="0"
                    className="flex-1 bg-slate-700 text-white text-center rounded-lg py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold w-0"
                  />
                  <button
                    onClick={() => stepVal(weight, setWeight, 2.5, true)}
                    className="w-9 h-9 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold flex-shrink-0 transition-colors"
                  >+</button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Repeticiones</label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => stepVal(reps, setReps, -1)}
                    className="w-9 h-9 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold flex-shrink-0 transition-colors"
                  >−</button>
                  <input
                    type="number" inputMode="numeric" value={reps}
                    onChange={e => setReps(e.target.value)} placeholder="0"
                    className="flex-1 bg-slate-700 text-white text-center rounded-lg py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold w-0"
                  />
                  <button
                    onClick={() => stepVal(reps, setReps, 1)}
                    className="w-9 h-9 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold flex-shrink-0 transition-colors"
                  >+</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Duración (min)</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => stepVal(duration, setDuration, -0.5, true)}
                  className="w-10 h-10 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-bold flex-shrink-0 transition-colors"
                >−</button>
                <input
                  type="number" inputMode="decimal" value={duration}
                  onChange={e => setDuration(e.target.value)} placeholder="0" step="0.5"
                  className="flex-1 min-w-0 w-0 bg-slate-700 text-white text-center rounded-xl py-2.5 outline-none focus:ring-2 focus:ring-amber-500 text-lg font-bold"
                />
                <button
                  onClick={() => stepVal(duration, setDuration, 0.5, true)}
                  className="w-10 h-10 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-bold flex-shrink-0 transition-colors"
                >+</button>
              </div>
            </div>
          )}

          <button
            onClick={handleAdd}
            disabled={adding}
            className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.97] disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            {adding ? 'Añadiendo…' : 'Añadir serie'}
          </button>
        </div>
      )}
    </BottomSheet>
  )
}

import { sessionCache } from '../utils/sessionCache'

// ── Main page ──────────────────────────────────────────────────────────────────
export default function Session() {
  const { id } = useParams()
  const { user, setActiveSession } = useApp()
  const navigate = useNavigate()
  const location = useLocation()

  // Seed state from cache on mount — no spinner, no animation on re-visit
  const cached             = sessionCache[id]
  const wasInitiallyCached = useRef(!!cached)

  const [session, setSession]               = useState(cached?.session ?? null)
  const [sets, setSets]                     = useState(cached?.sets ?? [])
  const [addingTo, setAddingTo]             = useState(null)
  const [showSelector, setShowSelector]     = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [confirmDeleteSet, setConfirmDeleteSet] = useState(null)
  const [loading, setLoading]               = useState(!cached)   // skip if cached
  const [ending, setEnding]                 = useState(false)
  const [newSetId, setNewSetId]             = useState(null)
  const [timerAnchor, setTimerAnchor]       = useState(cached?.timerAnchor ?? null)
  const [loadedTemplate, setLoadedTemplate] = useState(
    () => location.state?.template ?? null
  )

  const sessionElapsed = useTimer(session?.started_at)

  // Keep cache in sync whenever sets/timerAnchor change
  useEffect(() => {
    if (sessionCache[id]) {
      sessionCache[id] = { ...sessionCache[id], sets, timerAnchor }
    }
  }, [sets, timerAnchor])

  useEffect(() => {
    api.getSession(id)
      .then(data => {
        setSession(data)
        const s = data.sets || []
        setSets(s)
        setActiveSession(Number(id), data.started_at)
        const anchor = s.length > 0 ? s[s.length - 1].recorded_at : null
        setTimerAnchor(anchor)
        // Populate / refresh cache
        sessionCache[id] = { session: data, sets: s, timerAnchor: anchor }
      })
      .catch(() => { setActiveSession(null); navigate('/dashboard') })
      .finally(() => setLoading(false))
  }, [id])

  const handleSelectExercise = (ex) => {
    setShowSelector(false)
    setAddingTo(ex)
  }

  const handleSetAdded = (newSet) => {
    setSets(prev => [...prev, newSet])
    setTimerAnchor(newSet.recorded_at)
    setNewSetId(newSet.id)
    setTimeout(() => setNewSetId(null), 400)
    setAddingTo(null)
  }

  const handleDeleteSet = async () => {
    const setId = confirmDeleteSet
    setConfirmDeleteSet(null)
    await api.deleteSet(id, setId)
    const next = sets.filter(s => s.id !== setId)
    setSets(next)
    if (next.length === 0) setTimerAnchor(null)
  }

  const handleEnd = async () => {
    setEnding(true)
    try {
      if (sets.length === 0) await api.deleteSession(id)
      else await api.endSession(id)
      delete sessionCache[id]   // clear cache when session ends
      setActiveSession(null)
      navigate('/dashboard')
    } catch (e) { alert(e.message); setEnding(false) }
  }

  const groupedSets = sets.reduce((acc, s) => {
    if (!acc.has(s.exercise_id)) acc.set(s.exercise_id, { name: s.exercise_name, type: s.exercise_type, sets: [] })
    acc.get(s.exercise_id).sets.push(s)
    return acc
  }, new Map())

  const ghostExercises = loadedTemplate
    ? loadedTemplate.exercises.filter(ex => !groupedSets.has(ex.id))
    : []

  if (loading) return (
    <div className="h-full flex items-center justify-center bg-slate-900">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className={`h-full flex flex-col bg-slate-900${wasInitiallyCached.current ? '' : ' page-in'}`}>

      {/* ── Session subheader: always visible for spacing ── */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-slate-800">
        {timerAnchor && <RestTimer lastSetAt={timerAnchor} />}
      </div>

      {/* ── Exercise cards ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 space-y-3" style={{ paddingBottom: '112px' }}>

        {/* Empty state (no sets, no template) */}
        {groupedSets.size === 0 && ghostExercises.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
              <Dumbbell size={32} className="text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium">Sin ejercicios aún</p>
            <p className="text-slate-600 text-sm mt-1">Pulsa el botón para añadir el primero</p>
          </div>
        )}

        {/* Real exercise cards */}
        {[...groupedSets.entries()].map(([exId, group]) => (
          <ExerciseCard
            key={exId}
            exId={exId}
            group={group}
            newSetId={newSetId}
            onAddSet={() => setAddingTo({ id: exId, name: group.name, type: group.type })}
            onDeleteSet={setConfirmDeleteSet}
          />
        ))}

        {/* Ghost cards (planned, not yet started) */}
        {ghostExercises.length > 0 && (
          <>
            <div className="flex items-center justify-between px-1 pt-1">
              <span className="text-xs text-slate-600 uppercase tracking-wider font-medium">
                {loadedTemplate?.type === 'routine' ? 'Rutina cargada' : 'Sesión planificada'}
              </span>
              <button
                onClick={() => setLoadedTemplate(null)}
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-red-400 transition-colors"
              >
                <X size={12} />
                Quitar
              </button>
            </div>
            {ghostExercises.map(ex => (
              <GhostCard key={ex.id} exercise={ex} onStart={setAddingTo} />
            ))}
          </>
        )}

      </div>

      {/* ── Bottom CTA ── */}
      <div className="flex-shrink-0 px-4 pt-2" style={{ paddingBottom: '96px' }}>
        <button
          onClick={() => setShowSelector(true)}
          className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all"
        >
          <Plus size={20} />
          Añadir ejercicio
        </button>
      </div>

      {/* ── Overlays ── */}

      {showSelector && (
        <ExerciseSelector
          userId={user?.id}
          onSelect={handleSelectExercise}
          onClose={() => setShowSelector(false)}
        />
      )}


      {addingTo && (
        <AddSetSheet
          exercise={addingTo}
          sessionId={id}
          sessionSets={sets}
          onAdded={handleSetAdded}
          onClose={() => setAddingTo(null)}
        />
      )}

      {confirmDeleteSet && (
        <ConfirmModal
          title="¿Eliminar serie?"
          danger
          confirmLabel="Eliminar"
          onConfirm={handleDeleteSet}
          onCancel={() => setConfirmDeleteSet(null)}
        />
      )}

      {showEndConfirm && (
        <BottomSheet onClose={() => setShowEndConfirm(false)} locked={ending}>
          {() => (
            <div className="px-6 pb-6 pt-2 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={22} className="text-red-400" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg leading-tight">¿Finalizar sesión?</h2>
                  <p className="text-slate-400 text-sm mt-0.5">
                    {sets.length === 0
                      ? 'Sin series — la sesión no se guardará'
                      : `${fmtDur(sessionElapsed)} · ${sets.length} serie${sets.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  disabled={ending}
                  className="py-3.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors"
                >
                  Seguir
                </button>
                <button
                  onClick={handleEnd}
                  disabled={ending}
                  className="py-3.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white rounded-xl font-semibold transition-colors"
                >
                  {ending ? 'Finalizando…' : 'Finalizar'}
                </button>
              </div>
            </div>
          )}
        </BottomSheet>
      )}

    </div>
  )
}
