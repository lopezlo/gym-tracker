import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Trash2, Edit2, BookOpen, Dumbbell, Clock, X, Minus } from 'lucide-react'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'
import BottomSheet from '../components/BottomSheet'
import ExerciseSelector from '../components/ExerciseSelector'
import ConfirmModal from '../components/ConfirmModal'
import PullToRefresh from '../components/PullToRefresh'
import { getSettings } from '../components/SettingsSheet'

// Semana empieza en lunes: [L=1, M=2, X=3, J=4, V=5, S=6, D=0]
const DAY_ORDER  = [1, 2, 3, 4, 5, 6, 0]
const DAY_LABELS = { 0: 'D', 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S' }

// ── Tiny inline stepper ────────────────────────────────────────────────────────
function Stepper({ value, onChange, min = 1, max = 99, step = 1, decimals = false, label = '', wide = false }) {
  const dec = () => {
    const v = decimals ? parseFloat(value) || 0 : parseInt(value) || 0
    onChange(decimals ? Math.round(Math.max(min, v - step) * 2) / 2 : Math.max(min, v - step))
  }
  const inc = () => {
    const v = decimals ? parseFloat(value) || 0 : parseInt(value) || 0
    onChange(decimals ? Math.round(Math.min(max, v + step) * 2) / 2 : Math.min(max, v + step))
  }
  return (
    <div className="flex items-center gap-1">
      <button onClick={dec}
        className="w-6 h-6 bg-slate-600 hover:bg-slate-500 rounded-lg text-white text-sm font-bold flex items-center justify-center flex-shrink-0 transition-colors">
        −
      </button>
      <span className={`text-white text-xs font-semibold text-center flex-shrink-0 ${wide ? 'w-16' : 'w-8'}`}>
        {value}{label}
      </span>
      <button onClick={inc}
        className="w-6 h-6 bg-slate-600 hover:bg-slate-500 rounded-lg text-white text-sm font-bold flex items-center justify-center flex-shrink-0 transition-colors">
        +
      </button>
    </div>
  )
}

// ── Series row inside plan exercise card ──────────────────────────────────────
function SeriesRow({ idx, series, isTime, rirEnabled, onChange, onRemove, canRemove }) {
  return (
    <div className="bg-slate-600/40 rounded-xl px-2.5 py-2 space-y-2">
      {/* Número + controles */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-slate-500 text-xs w-4 text-center flex-shrink-0">{idx + 1}</span>

        {isTime ? (
          <Stepper
            value={series.duration ?? 1} label=" min" wide
            onChange={v => onChange('duration', v || null)}
            min={0.5} max={120} step={0.5} decimals
          />
        ) : (
          <>
            {/* Peso */}
            {series.weight === null ? (
              <button
                onClick={() => onChange('weight', 20)}
                className="text-xs text-slate-500 hover:text-indigo-400 px-2 py-1 bg-slate-700/70 rounded-lg border border-dashed border-slate-600 hover:border-indigo-500 transition-colors">
                + kg
              </button>
            ) : (
              <Stepper
                value={series.weight} label="kg" wide
                onChange={v => onChange('weight', v === 0 ? null : v)}
                min={0} max={500} step={2.5} decimals
              />
            )}

            {/* Reps o rango */}
            {!rirEnabled ? (
              <Stepper
                value={series.reps_min ?? 8} label=" rep"
                onChange={v => { onChange('reps_min', v); onChange('reps_max', v) }}
                min={1} max={99}
              />
            ) : (
              <div className="flex items-center gap-1">
                <Stepper
                  value={series.reps_min ?? 8}
                  onChange={v => onChange('reps_min', Math.min(v, series.reps_max ?? 12))}
                  min={1} max={99}
                />
                <span className="text-slate-600 text-xs">–</span>
                <Stepper
                  value={series.reps_max ?? 12} label=" rep"
                  onChange={v => onChange('reps_max', Math.max(v, series.reps_min ?? 8))}
                  min={1} max={99}
                />
              </div>
            )}
          </>
        )}

        {canRemove && (
          <button onClick={onRemove}
            className="p-1 text-slate-600 hover:text-red-400 transition-colors ml-auto flex-shrink-0">
            <X size={12} />
          </button>
        )}
      </div>

      {/* Selector RiR */}
      {rirEnabled && !isTime && (
        <div className="flex gap-1 pl-5">
          {[0, 1, 2, 3].map(n => (
            <button
              key={n}
              onClick={() => onChange('rir', series.rir === n ? null : n)}
              className={`flex-1 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                series.rir === n
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-700 text-slate-500 hover:bg-slate-600'
              }`}>
              RiR {n}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Plan exercise card with per-series config ──────────────────────────────────
function PlanExItem({ ex, rirEnabled, onRemove, onUpdateSeries, onAddSeries, onRemoveSeries }) {
  const isTime = ex.type === 'time'
  return (
    <div className="bg-slate-700/70 rounded-xl overflow-hidden">
      {/* Cabecera con nombre */}
      <div className="flex items-center gap-2.5 px-3 pt-2.5 pb-2">
        {isTime
          ? <Clock size={14} className="text-amber-400 flex-shrink-0" />
          : <Dumbbell size={14} className="text-indigo-400 flex-shrink-0" />}
        <span className="text-white text-sm font-medium flex-1 truncate">{ex.name}</span>
        <button onClick={() => onRemove(ex.id)}
          className="p-1 text-slate-500 hover:text-red-400 transition-colors flex-shrink-0">
          <X size={14} />
        </button>
      </div>

      {/* Series */}
      <div className="px-3 pb-3 space-y-1.5">
        {ex.series.map((s, i) => (
          <SeriesRow
            key={i}
            idx={i}
            series={s}
            isTime={isTime}
            rirEnabled={rirEnabled}
            onChange={(field, val) => onUpdateSeries(ex.id, i, field, val)}
            onRemove={() => onRemoveSeries(ex.id, i)}
            canRemove={ex.series.length > 1}
          />
        ))}
        <button
          onClick={() => onAddSeries(ex.id)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-slate-600 hover:border-indigo-500 hover:bg-indigo-500/10 text-slate-500 hover:text-indigo-400 transition-colors text-xs font-medium">
          <Plus size={12} />
          Añadir serie
        </button>
      </div>
    </div>
  )
}

// ── Routine exercise row (series como chips visuales) ──────────────────────────
function RoutineExItem({ ex, onRemove, onUpdate }) {
  const sets = ex.sets ?? 1
  return (
    <div className="bg-slate-700/70 rounded-xl px-3 py-2.5 space-y-2">
      {/* Nombre */}
      <div className="flex items-center gap-2.5">
        {ex.type === 'time'
          ? <Clock size={14} className="text-amber-400 flex-shrink-0" />
          : <Dumbbell size={14} className="text-indigo-400 flex-shrink-0" />}
        <span className="text-white text-sm flex-1 truncate">{ex.name}</span>
        <button onClick={() => onRemove(ex.id)}
          className="p-1 text-slate-500 hover:text-red-400 transition-colors flex-shrink-0">
          <X size={14} />
        </button>
      </div>
      {/* Serie chips */}
      <div className="flex flex-wrap items-center gap-1.5 pl-5">
        {Array.from({ length: sets }, (_, i) => (
          <span key={i}
            className="text-xs bg-slate-600 text-slate-300 rounded-lg px-2.5 py-1 font-medium select-none">
            {i + 1}
          </span>
        ))}
        <button
          onClick={() => onUpdate(ex.id, 'sets', sets + 1)}
          className="text-xs text-indigo-400 hover:text-indigo-300 px-2.5 py-1 bg-indigo-500/10 rounded-lg transition-colors flex items-center gap-1">
          <Plus size={10} /> Serie
        </button>
        {sets > 1 && (
          <button
            onClick={() => onUpdate(ex.id, 'sets', sets - 1)}
            className="text-xs text-slate-600 hover:text-red-400 px-1.5 py-1 rounded-lg transition-colors">
            <Minus size={11} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Helper: resumen compacto de un ejercicio del plan ─────────────────────────
function planExSummary(ex) {
  const series = ex.series
  if (!series?.length) return `${ex.sets ?? 1}×`
  const sets = series.length
  const weights = [...new Set(series.map(s => s.weight).filter(Boolean))]
  const allRepsMin = series.map(s => s.reps_min).filter(Boolean)
  const allRepsMax = series.map(s => s.reps_max).filter(Boolean)
  const parts = [`${sets}×`]
  if (ex.type !== 'time') {
    if (weights.length === 1) parts.push(`${weights[0]}kg`)
    else if (weights.length > 1) parts.push(`${weights[0]}–${weights[weights.length - 1]}kg`)
    if (allRepsMin.length) {
      const rMin = Math.min(...allRepsMin)
      const rMax = Math.max(...allRepsMax.length ? allRepsMax : allRepsMin)
      parts.push(rMin === rMax ? `${rMin} reps` : `${rMin}–${rMax} reps`)
    }
  }
  return parts.join(' ')
}

// ── Routine editor sheet ───────────────────────────────────────────────────────
function RoutineEditor({ routine, userId, onSave, onClose }) {
  const [name, setName]     = useState(routine?.name ?? '')
  const [days, setDays]     = useState(routine?.days ?? [])
  const [exercises, setExercises] = useState(
    () => (routine?.exercises ?? []).map(e => ({ ...e, sets: e.sets ?? 1 }))
  )
  const [showSelector, setShowSelector] = useState(false)
  const [saving, setSaving] = useState(false)

  const toggleDay = (d) =>
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])

  const handleSelect = (ex) => {
    if (!exercises.find(e => e.id === ex.id))
      setExercises(prev => [...prev, { id: ex.id, name: ex.name, type: ex.type, sets: 1 }])
    setShowSelector(false)
  }

  const handleUpdate = (id, field, value) =>
    setExercises(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))

  const handleSave = async () => {
    if (!name.trim() || exercises.length === 0) return
    setSaving(true)
    try { await onSave({ name: name.trim(), days, exercises }) }
    finally { setSaving(false) }
  }

  return (
    <>
      <BottomSheet onClose={onClose} locked={saving}>
        {() => (
          <div className="px-5 pb-8 pt-2 space-y-5 overflow-y-auto max-h-[78vh]">
            <h2 className="text-white font-bold text-lg">
              {routine ? 'Editar rutina' : 'Nueva rutina'}
            </h2>

            {/* Nombre */}
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1.5">Nombre</label>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: Empuje, Piernas, Full body…"
                className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
              />
            </div>

            {/* Días (semana empieza lunes) */}
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-2">Días</label>
              <div className="flex gap-1.5">
                {DAY_ORDER.map(dayIdx => (
                  <button
                    key={dayIdx}
                    onClick={() => toggleDay(dayIdx)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                      days.includes(dayIdx)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    {DAY_LABELS[dayIdx]}
                  </button>
                ))}
              </div>
            </div>

            {/* Ejercicios */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-slate-400 font-medium">Ejercicios</label>
                <span className="text-xs text-slate-600">{exercises.length}</span>
              </div>
              <div className="space-y-2">
                {exercises.map(ex => (
                  <RoutineExItem
                    key={ex.id}
                    ex={ex}
                    onRemove={id => setExercises(prev => prev.filter(e => e.id !== id))}
                    onUpdate={handleUpdate}
                  />
                ))}
                <button
                  onClick={() => setShowSelector(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-slate-600 hover:border-indigo-500 hover:bg-indigo-500/10 text-slate-500 hover:text-indigo-400 transition-colors text-sm"
                >
                  <Plus size={14} />
                  Añadir ejercicio
                </button>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !name.trim() || exercises.length === 0}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors"
            >
              {saving ? 'Guardando…' : 'Guardar rutina'}
            </button>
          </div>
        )}
      </BottomSheet>

      {showSelector && (
        <ExerciseSelector
          userId={userId}
          onSelect={handleSelect}
          onClose={() => setShowSelector(false)}
        />
      )}
    </>
  )
}

// ── Plan editor sheet ──────────────────────────────────────────────────────────
function PlanEditor({ plan, userId, onSave, onClose }) {
  const rirEnabled = getSettings().rirEnabled ?? false

  const defaultSeries = () => ({
    weight: null,
    reps_min: 8,
    reps_max: rirEnabled ? 12 : 8,
    rir: null,
  })

  const initExercise = (ex) => ({
    id: ex.id, name: ex.name, type: ex.type,
    series: ex.series?.length
      ? ex.series
      : Array.from({ length: ex.sets ?? 1 }, () => ({
          weight:   ex.weight   ?? null,
          reps_min: ex.reps_min ?? 8,
          reps_max: ex.reps_max ?? (rirEnabled ? 12 : 8),
          rir:      null,
        })),
  })

  const [exercises, setExercises] = useState(() => (plan?.exercises ?? []).map(initExercise))
  const [showSelector, setShowSelector] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSelect = (ex) => {
    if (!exercises.find(e => e.id === ex.id))
      setExercises(prev => [...prev, { id: ex.id, name: ex.name, type: ex.type, series: [defaultSeries()] }])
    setShowSelector(false)
  }

  const handleAddSeries = (exId) => {
    setExercises(prev => prev.map(e => {
      if (e.id !== exId) return e
      const last = e.series[e.series.length - 1] ?? defaultSeries()
      return { ...e, series: [...e.series, { ...last }] }
    }))
  }

  const handleRemoveSeries = (exId, seriesIdx) => {
    setExercises(prev => prev.map(e => {
      if (e.id !== exId) return e
      return { ...e, series: e.series.filter((_, i) => i !== seriesIdx) }
    }))
  }

  const handleUpdateSeries = (exId, seriesIdx, field, value) => {
    setExercises(prev => prev.map(e => {
      if (e.id !== exId) return e
      const newSeries = e.series.map((s, i) => i === seriesIdx ? { ...s, [field]: value } : s)
      return { ...e, series: newSeries }
    }))
  }

  const handleSave = async () => {
    if (exercises.length === 0) return
    setSaving(true)
    try { await onSave(exercises) }
    finally { setSaving(false) }
  }

  return (
    <>
      <BottomSheet onClose={onClose} locked={saving}>
        {() => (
          <div className="px-5 pb-8 pt-2 space-y-4 overflow-y-auto max-h-[82vh]">
            <div>
              <h2 className="text-white font-bold text-lg">Próximo entrenamiento</h2>
              <p className="text-slate-400 text-sm mt-1">
                Configura series, peso y repeticiones para cada ejercicio.
              </p>
            </div>

            <div className="space-y-3">
              {exercises.map(ex => (
                <PlanExItem
                  key={ex.id}
                  ex={ex}
                  rirEnabled={rirEnabled}
                  onRemove={id => setExercises(prev => prev.filter(e => e.id !== id))}
                  onUpdateSeries={handleUpdateSeries}
                  onAddSeries={handleAddSeries}
                  onRemoveSeries={handleRemoveSeries}
                />
              ))}
              <button
                onClick={() => setShowSelector(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-slate-600 hover:border-indigo-500 hover:bg-indigo-500/10 text-slate-500 hover:text-indigo-400 transition-colors text-sm"
              >
                <Plus size={14} />
                Añadir ejercicio
              </button>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || exercises.length === 0}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors"
            >
              {saving ? 'Guardando…' : 'Guardar plan'}
            </button>
          </div>
        )}
      </BottomSheet>

      {showSelector && (
        <ExerciseSelector
          userId={userId}
          onSelect={handleSelect}
          onClose={() => setShowSelector(false)}
        />
      )}
    </>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function Planner({ onModalClose }) {
  const { user } = useApp()
  const [routines, setRoutines]             = useState([])
  const [plan, setPlan]                     = useState(null)
  const [loading, setLoading]               = useState(true)
  const [editingRoutine, setEditingRoutine] = useState(null)
  const [editingPlan, setEditingPlan]       = useState(false)
  const [deletingRoutine, setDeletingRoutine] = useState(null)
  const [deletingPlan, setDeletingPlan]     = useState(false)

  // Notify MainLayout to re-snap when any modal closes
  const isModalOpen = !!(editingRoutine || editingPlan || deletingRoutine || deletingPlan)
  const prevModalOpenRef = useRef(false)
  useEffect(() => {
    if (prevModalOpenRef.current && !isModalOpen) onModalClose?.()
    prevModalOpenRef.current = isModalOpen
  }, [isModalOpen, onModalClose])

  const todayIdx = new Date().getDay()  // 0=Dom, 1=Lun, …

  useEffect(() => {
    Promise.all([
      api.getRoutines(user.id),
      api.getPlan(user.id).catch(() => null),
    ]).then(([rs, p]) => {
      setRoutines(rs)
      setPlan(p)
    }).finally(() => setLoading(false))
  }, [user.id])

  const handleSaveRoutine = async (data) => {
    if (editingRoutine === 'new') {
      const r = await api.createRoutine(user.id, data)
      setRoutines(prev => [...prev, r])
    } else {
      const r = await api.updateRoutine(editingRoutine.id, data)
      setRoutines(prev => prev.map(x => x.id === r.id ? r : x))
    }
    setEditingRoutine(null)
  }

  const handleDeleteRoutine = async () => {
    await api.deleteRoutine(deletingRoutine.id)
    setRoutines(prev => prev.filter(r => r.id !== deletingRoutine.id))
    setDeletingRoutine(null)
  }

  const handleSavePlan = async (exercises) => {
    const p = await api.savePlan(user.id, exercises)
    setPlan(p)
    setEditingPlan(false)
  }

  const handleDeletePlan = async () => {
    await api.deletePlan(user.id)
    setPlan(null)
    setDeletingPlan(false)
  }

  const scrollRef = useRef(null)

  const handleRefresh = useCallback(
    () => new Promise(() => window.location.reload()),
    []
  )

  if (loading) return (
    <div className="h-full flex items-center justify-center bg-slate-900">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <PullToRefresh onRefresh={handleRefresh} scrollRef={scrollRef}>
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto no-scrollbar bg-slate-900"
      style={{ overscrollBehaviorY: 'none' }}
    >
      <div className="px-4 pt-3 space-y-8" style={{ paddingBottom: '112px' }}>

        {/* ── Próxima sesión ── */}
        <section>
          <h2 className="text-white font-bold text-base mb-3">Próximo entrenamiento</h2>

          {plan ? (
            <div className="bg-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Planificada</span>
                <div className="flex gap-1">
                  <button onClick={() => setEditingPlan(true)} className="p-1.5 text-slate-500 hover:text-white transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => setDeletingPlan(true)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                {plan.exercises.map((ex, i) => (
                  <div key={ex.id} className="flex items-center gap-2.5 py-1">
                    <span className="text-slate-600 text-xs w-4 text-right flex-shrink-0">{i + 1}</span>
                    {ex.type === 'time'
                      ? <Clock size={13} className="text-amber-400 flex-shrink-0" />
                      : <Dumbbell size={13} className="text-indigo-400 flex-shrink-0" />}
                    <span className="text-slate-300 text-sm flex-1 truncate">{ex.name}</span>
                    <span className="text-slate-600 text-xs flex-shrink-0">{planExSummary(ex)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setEditingPlan(true)}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl py-5 text-slate-500 hover:text-indigo-400 transition-colors"
            >
              <Plus size={18} />
              <span className="text-sm font-medium">Planifica el próximo entrenamiento</span>
            </button>
          )}
        </section>

        {/* ── Rutinas ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold text-base">Rutinas</h2>
            <button
              onClick={() => setEditingRoutine('new')}
              className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
            >
              <Plus size={15} />
              Nueva
            </button>
          </div>

          {routines.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <BookOpen size={28} className="text-slate-600" />
              </div>
              <p className="text-slate-500 text-sm">Sin rutinas todavía</p>
              <p className="text-slate-600 text-xs mt-1">Crea tu primera rutina para empezar a planificar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {routines.map(r => {
                const isToday = r.days.includes(todayIdx)
                const preview = r.exercises.slice(0, 3).map(e => e.name).join(', ') +
                  (r.exercises.length > 3 ? '…' : '')
                return (
                  <div
                    key={r.id}
                    className={`bg-slate-800 rounded-2xl px-4 py-3 flex items-center gap-3 ${isToday ? 'ring-1 ring-indigo-500/40' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-white font-semibold text-sm truncate">{r.name}</h3>
                        {isToday && (
                          <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">hoy</span>
                        )}
                      </div>
                      <p className="text-slate-600 text-xs truncate mt-0.5">{preview || 'Sin ejercicios'}</p>
                    </div>

                    {/* Day bullets — semana empieza lunes */}
                    <div className="flex gap-0.5 flex-shrink-0">
                      {DAY_ORDER.map(dayIdx => (
                        <span
                          key={dayIdx}
                          className={`w-[18px] h-[18px] rounded flex items-center justify-center text-[9px] font-bold ${
                            r.days.includes(dayIdx)
                              ? dayIdx === todayIdx ? 'bg-indigo-600 text-white' : 'bg-slate-600 text-slate-300'
                              : 'text-slate-700'
                          }`}
                        >{DAY_LABELS[dayIdx]}</span>
                      ))}
                    </div>

                    <div className="flex gap-0.5 flex-shrink-0">
                      <button onClick={() => setEditingRoutine(r)} className="p-1.5 text-slate-500 hover:text-white transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setDeletingRoutine(r)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

      </div>

      {/* ── Sheets & modals ── */}
      {editingRoutine && (
        <RoutineEditor
          routine={editingRoutine === 'new' ? null : editingRoutine}
          userId={user.id}
          onSave={handleSaveRoutine}
          onClose={() => setEditingRoutine(null)}
        />
      )}

      {editingPlan && (
        <PlanEditor
          plan={plan}
          userId={user.id}
          onSave={handleSavePlan}
          onClose={() => setEditingPlan(false)}
        />
      )}

      {deletingRoutine && (
        <ConfirmModal
          title={`¿Eliminar "${deletingRoutine.name}"?`}
          danger
          confirmLabel="Eliminar"
          onConfirm={handleDeleteRoutine}
          onCancel={() => setDeletingRoutine(null)}
        />
      )}

      {deletingPlan && (
        <ConfirmModal
          title="¿Eliminar el plan de la próxima sesión?"
          danger
          confirmLabel="Eliminar"
          onConfirm={handleDeletePlan}
          onCancel={() => setDeletingPlan(false)}
        />
      )}
    </div>
    </PullToRefresh>
  )
}
