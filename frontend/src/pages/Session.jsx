import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, ChevronDown, Trash2, Clock, Dumbbell, CheckCircle } from 'lucide-react'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'
import ExerciseSelector from '../components/ExerciseSelector'
import ConfirmModal from '../components/ConfirmModal'
import dayjs from 'dayjs'

// PostgreSQL returns ISO 8601 with Z/offset; SQLite used space without tz
const toUTC = (s) => s ? new Date(/Z$|[+-]\d{2}/.test(s) ? s : s.replace(' ', 'T') + 'Z') : null

function useTimer(startIso) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!startIso) return
    const start = toUTC(startIso)
    const tick = () => setElapsed(Math.floor((Date.now() - start.getTime()) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startIso])
  return elapsed
}

function fmtDur(secs) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function RestTimer({ lastSetAt }) {
  const [rest, setRest] = useState(0)
  useEffect(() => {
    if (!lastSetAt) return
    const t = toUTC(lastSetAt)
    const tick = () => setRest(Math.floor((Date.now() - t.getTime()) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [lastSetAt])
  if (!lastSetAt) return null
  return (
    <div className="flex items-center gap-1.5 text-slate-400 text-sm">
      <Clock size={13} />
      <span>Descanso: <span className={`font-mono font-semibold ${rest > 120 ? 'text-amber-400' : 'text-emerald-400'}`}>{fmtDur(rest)}</span></span>
    </div>
  )
}

export default function Session() {
  const { id } = useParams()
  const { user, setActiveSession } = useApp()
  const navigate = useNavigate()

  const [session, setSession] = useState(null)
  const [sets, setSets] = useState([])
  const [currentExercise, setCurrentExercise] = useState(null)
  const [showSelector, setShowSelector] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [confirmDeleteSet, setConfirmDeleteSet] = useState(null)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [duration, setDuration] = useState('')
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [ending, setEnding] = useState(false)

  const sessionElapsed = useTimer(session?.started_at)
  const lastSetAt = sets.length > 0 ? sets[sets.length - 1].recorded_at : null

  useEffect(() => {
    api.getSession(id)
      .then(data => {
        setSession(data)
        setSets(data.sets || [])
        setActiveSession(Number(id))
        if (data.sets?.length > 0) {
          const last = data.sets[data.sets.length - 1]
          setCurrentExercise({ id: last.exercise_id, name: last.exercise_name, type: last.exercise_type })
        }
      })
      .catch(() => {
        setActiveSession(null)
        navigate('/dashboard')
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!currentExercise) return
    const lastInSession = [...sets].reverse().find(s => s.exercise_id === currentExercise.id)
    if (lastInSession) {
      if (currentExercise.type === 'reps') {
        setWeight(lastInSession.weight != null ? String(lastInSession.weight) : '')
        setReps(lastInSession.reps != null ? String(lastInSession.reps) : '')
      } else {
        setDuration(lastInSession.duration != null ? String(lastInSession.duration / 60) : '')
      }
    } else {
      api.getLastSet(currentExercise.id, user.id).then(last => {
        if (!last) { setWeight(''); setReps(''); setDuration(''); return }
        if (currentExercise.type === 'reps') {
          setWeight(last.weight != null ? String(last.weight) : '')
          setReps(last.reps != null ? String(last.reps) : '')
        } else {
          setDuration(last.duration != null ? String(last.duration / 60) : '')
        }
      }).catch(() => { setWeight(''); setReps(''); setDuration('') })
    }
  }, [currentExercise?.id])

  const handleSelectExercise = (ex) => {
    setCurrentExercise(ex)
    setShowSelector(false)
  }

  const handleAddSet = async () => {
    if (!currentExercise) return
    setAdding(true)
    try {
      const payload = { exercise_id: currentExercise.id }
      if (currentExercise.type === 'reps') {
        if (weight) payload.weight = parseFloat(weight)
        if (reps) payload.reps = parseInt(reps)
      } else {
        if (duration) payload.duration = Math.round(parseFloat(duration) * 60)
      }
      const newSet = await api.addSet(id, payload)
      setSets(prev => [...prev, newSet])
    } catch (e) { alert(e.message) }
    setAdding(false)
  }

  const handleDeleteSet = async () => {
    const setId = confirmDeleteSet
    setConfirmDeleteSet(null)
    await api.deleteSet(id, setId)
    setSets(prev => prev.filter(s => s.id !== setId))
  }

  const handleEnd = async () => {
    setEnding(true)
    try {
      if (sets.length === 0) {
        await api.deleteSession(id)
      } else {
        await api.endSession(id)
      }
      setActiveSession(null)
      navigate('/dashboard')
    } catch (e) { alert(e.message); setEnding(false) }
  }

  const groupedSets = sets.reduce((acc, s) => {
    if (!acc[s.exercise_id]) acc[s.exercise_id] = { name: s.exercise_name, type: s.exercise_type, sets: [] }
    acc[s.exercise_id].sets.push(s)
    return acc
  }, {})

  const setsForCurrent = currentExercise ? (groupedSets[currentExercise.id]?.sets ?? []) : []

  const step = (val, setVal, delta, decimals = false) => setVal(prev => {
    const v = (decimals ? parseFloat(prev) : parseInt(prev)) || 0
    const result = Math.max(0, v + delta)
    return decimals ? String(Math.round(result * 2) / 2) : String(result)
  })

  const fmtSet = (s) => {
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

  if (loading) return (
    <div className="h-full flex items-center justify-center bg-slate-900">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-6 pb-3 flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-xs">Sesión activa</p>
          <p className="text-white font-mono font-bold text-xl">{fmtDur(sessionElapsed)}</p>
        </div>
        <button
          onClick={() => setShowEndConfirm(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Finalizar
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full scrollable no-scrollbar px-4 pb-4 space-y-4">
          <div className="bg-slate-800 rounded-2xl p-4 space-y-4">
            {/* Exercise picker */}
            <button
              onClick={() => setShowSelector(true)}
              className="w-full flex items-center justify-between bg-slate-700 hover:bg-slate-600 rounded-xl px-4 py-3 transition-colors"
            >
              <div className="flex items-center gap-3">
                {currentExercise
                  ? currentExercise.type === 'time'
                    ? <Clock size={18} className="text-amber-400" />
                    : <Dumbbell size={18} className="text-indigo-400" />
                  : <Dumbbell size={18} className="text-slate-500" />}
                <span className={`font-semibold ${currentExercise ? 'text-white' : 'text-slate-400'}`}>
                  {currentExercise?.name ?? 'Seleccionar ejercicio'}
                </span>
              </div>
              <ChevronDown size={18} className="text-slate-400" />
            </button>

            <RestTimer lastSetAt={lastSetAt} />

            {/* Previous sets chips */}
            {setsForCurrent.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {setsForCurrent.map((s, i) => (
                  <span key={s.id} className="text-xs bg-slate-700 text-slate-300 rounded-lg px-2.5 py-1.5 font-mono">
                    {i + 1}. {fmtSet(s)}
                  </span>
                ))}
              </div>
            )}

            {/* Inputs */}
            {currentExercise && (
              <>
                {currentExercise.type === 'reps' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-medium">Peso (kg)</label>
                      <div className="flex items-center gap-1">
                        <button onClick={() => step(weight, setWeight, -2.5, true)} className="w-9 h-9 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold flex-shrink-0 transition-colors">−</button>
                        <input
                          type="number" inputMode="decimal" value={weight}
                          onChange={e => setWeight(e.target.value)} placeholder="0"
                          className="flex-1 bg-slate-700 text-white text-center rounded-lg py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold w-0"
                        />
                        <button onClick={() => step(weight, setWeight, 2.5, true)} className="w-9 h-9 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold flex-shrink-0 transition-colors">+</button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-medium">Repeticiones</label>
                      <div className="flex items-center gap-1">
                        <button onClick={() => step(reps, setReps, -1)} className="w-9 h-9 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold flex-shrink-0 transition-colors">−</button>
                        <input
                          type="number" inputMode="numeric" value={reps}
                          onChange={e => setReps(e.target.value)} placeholder="0"
                          className="flex-1 bg-slate-700 text-white text-center rounded-lg py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold w-0"
                        />
                        <button onClick={() => step(reps, setReps, 1)} className="w-9 h-9 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold flex-shrink-0 transition-colors">+</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-medium">Duración (min)</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => step(duration, setDuration, -0.5, true)} className="w-10 h-10 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-bold flex-shrink-0 transition-colors">−</button>
                      <input
                        type="number" inputMode="decimal" value={duration}
                        onChange={e => setDuration(e.target.value)} placeholder="0"
                        step="0.5"
                        className="flex-1 bg-slate-700 text-white text-center rounded-xl py-2.5 outline-none focus:ring-2 focus:ring-amber-500 text-lg font-bold"
                      />
                      <button onClick={() => step(duration, setDuration, 0.5, true)} className="w-10 h-10 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-bold flex-shrink-0 transition-colors">+</button>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleAddSet}
                  disabled={adding}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.97] disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Añadir serie
                </button>
              </>
            )}
          </div>

          {/* Session log */}
          {Object.keys(groupedSets).length > 0 && (
            <div className="space-y-3">
              <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider px-1">Registro de sesión</h3>
              {Object.entries(groupedSets).map(([exId, group]) => (
                <div key={exId} className="bg-slate-800 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    {group.type === 'time'
                      ? <Clock size={14} className="text-amber-400" />
                      : <Dumbbell size={14} className="text-indigo-400" />}
                    <h4 className="text-white font-semibold text-sm">{group.name}</h4>
                    <span className="ml-auto text-slate-500 text-xs">{group.sets.length} serie{group.sets.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-1.5">
                    {group.sets.map((s, i) => (
                      <div key={s.id} className="flex items-center gap-3 py-1">
                        <span className="text-slate-500 text-xs w-4 text-right">{i + 1}</span>
                        <span className="text-white font-mono text-sm flex-1">{fmtSet(s)}</span>
                        <span className="text-slate-600 text-xs">{dayjs(toUTC(s.recorded_at)).format('HH:mm')}</span>
                        <button onClick={() => setConfirmDeleteSet(s.id)} className="p-1 text-slate-600 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Exercise selector */}
      {showSelector && (
        <ExerciseSelector
          userId={user?.id}
          onSelect={handleSelectExercise}
          onClose={() => setShowSelector(false)}
        />
      )}

      {/* Delete set confirm */}
      {confirmDeleteSet && (
        <ConfirmModal
          title="¿Eliminar serie?"
          danger
          confirmLabel="Eliminar"
          onConfirm={handleDeleteSet}
          onCancel={() => setConfirmDeleteSet(null)}
        />
      )}

      {/* End session confirm */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => !ending && setShowEndConfirm(false)} />
          <div className="relative w-full bg-slate-800 rounded-t-3xl p-6 space-y-5">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-600 rounded-full" />
            <div className="pt-2 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <CheckCircle size={22} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg leading-tight">¿Finalizar sesión?</h2>
                <p className="text-slate-400 text-sm mt-0.5">
                  {fmtDur(sessionElapsed)} · {sets.length} serie{sets.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowEndConfirm(false)} disabled={ending} className="py-3.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors">
                Seguir
              </button>
              <button onClick={handleEnd} disabled={ending} className="py-3.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white rounded-xl font-semibold transition-colors">
                {ending ? 'Finalizando…' : 'Finalizar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
