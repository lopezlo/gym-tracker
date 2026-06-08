import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Trash2, Edit2, BookOpen, Dumbbell, Clock, X, Minus } from 'lucide-react'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'
import BottomSheet from '../components/BottomSheet'
import ExerciseSelector from '../components/ExerciseSelector'
import ConfirmModal from '../components/ConfirmModal'
import PullToRefresh from '../components/PullToRefresh'
import { getSettings } from '../components/SettingsSheet'

const DAYS      = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// ── Tiny stepper used inside exercise config rows ─────────────────────────────
function Stepper({ value, onChange, min = 1, max = 99, step = 1, decimals = false, label, wide = false }) {
  const dec = () => {
    const v = decimals ? parseFloat(value) || 0 : parseInt(value) || 0
    const next = Math.max(min, v - step)
    onChange(decimals ? Math.round(next * 2) / 2 : next)
  }
  const inc = () => {
    const v = decimals ? parseFloat(value) || 0 : parseInt(value) || 0
    const next = Math.min(max, v + step)
    onChange(decimals ? Math.round(next * 2) / 2 : next)
  }
  return (
    <div className="flex items-center gap-1">
      <button onClick={dec}
        className="w-6 h-6 bg-slate-600 hover:bg-slate-500 rounded-lg text-white text-xs font-bold flex items-center justify-center flex-shrink-0 transition-colors">
        −
      </button>
      <span className={`text-white text-xs font-semibold text-center flex-shrink-0 ${wide ? 'w-14' : 'w-8'}`}>
        {value}{label}
      </span>
      <button onClick={inc}
        className="w-6 h-6 bg-slate-600 hover:bg-slate-500 rounded-lg text-white text-xs font-bold flex items-center justify-center flex-shrink-0 transition-colors">
        +
      </button>
    </div>
  )
}

// ── Routine exercise row (with sets stepper) ──────────────────────────────────
function RoutineExItem({ ex, onRemove, onUpdate }) {
  const isTime = ex.type === 'time'
  return (
    <div className="bg-slate-700/70 rounded-xl px-3 py-2.5 flex items-center gap-2">
      {isTime
        ? <Clock size={14} className="text-amber-400 flex-shrink-0" />
        : <Dumbbell size={14} className="text-indigo-400 flex-shrink-0" />}
      <span className="text-white text-sm flex-1 truncate">{ex.name}</span>
      <Stepper
        value={ex.sets ?? 1}
        onChange={v => onUpdate(ex.id, 'sets', v)}
        min={1} max={20} label="×"
      />
      <button
        onClick={() => onRemove(ex.id)}
        className="p-1 text-slate-500 hover:text-red-400 transition-colors flex-shrink-0 ml-1"
      >
        <X size={14} />
      </button>
    </div>
  )
}

// ── Plan exercise row (sets + weight + reps/range) ────────────────────────────
function PlanExItem({ ex, rirEnabled, onRemove, onUpdate }) {
  const isTime = ex.type === 'time'
  const sets     = ex.sets ?? 1
  const weight   = ex.weight ?? null
  const repsMin  = ex.reps_min ?? 8
  const repsMax  = ex.reps_max ?? (rirEnabled ? 12 : repsMin)

  return (
    <div className="bg-slate-700/70 rounded-xl overflow-hidden">
      {/* Name row */}
      <div className="flex items-center gap-2.5 px-3 pt-2.5 pb-1.5">
        {isTime
          ? <Clock size={14} className="text-amber-400 flex-shrink-0" />
          : <Dumbbell size={14} className="text-indigo-400 flex-shrink-0" />}
        <span className="text-white text-sm flex-1 truncate">{ex.name}</span>
        <button
          onClick={() => onRemove(ex.id)}
          className="p-1 text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {/* Config row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 pb-2.5">
        {/* Sets */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 text-[11px]">Series</span>
          <Stepper value={sets} onChange={v => onUpdate(ex.id, 'sets', v)} min={1} max={20} />
        </div>

        {/* Weight (reps exercises only) */}
        {!isTime && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">Peso</span>
            {weight === null ? (
              <button
                onClick={() => onUpdate(ex.id, 'weight', 20)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors px-1.5 py-0.5 bg-indigo-500/10 rounded-lg"
              >+ Añadir</button>
            ) : (
              <div className="flex items-center gap-1">
                <Stepper
                  value={weight}
                  onChange={v => onUpdate(ex.id, 'weight', v === 0 ? null : v)}
                  min={0} max={500} step={2.5} decimals wide
                  label="kg"
                />
              </div>
            )}
          </div>
        )}

        {/* Reps — single value (no RiR) */}
        {!isTime && !rirEnabled && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">Reps</span>
            <Stepper
              value={repsMin}
              onChange={v => { onUpdate(ex.id, 'reps_min', v); onUpdate(ex.id, 'reps_max', v) }}
              min={1} max={99}
            />
          </div>
        )}

        {/* Reps range (RiR mode) */}
        {!isTime && rirEnabled && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">Reps</span>
            <Stepper
              value={repsMin}
              onChange={v => onUpdate(ex.id, 'reps_min', Math.min(v, repsMax))}
              min={1} max={99}
            />
            <span className="text-slate-600 text-[11px]">–</span>
            <Stepper
              value={repsMax}
              onChange={v => onUpdate(ex.id, 'reps_max', Math.max(v, repsMin))}
              min={1} max={99}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Routine editor sheet ───────────────────────────────────────────────────────
function RoutineEditor({ routine, userId, onSave, onClose }) {
  const [name, setName]           = useState(routine?.name ?? '')
  const [days, setDays]           = useState(routine?.days ?? [])
  const [exercises, setExercises] = useState(
    () => (routine?.exercises ?? []).map(e => ({ ...e, sets: e.sets ?? 1 }))
  )
  const [showSelector, setShowSelector] = useState(false)
  const [saving, setSaving]       = useState(false)

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

            {/* Name */}
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

            {/* Days */}
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-2">Días</label>
              <div className="flex gap-1.5">
                {DAYS.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => toggleDay(i)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                      days.includes(i)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Exercises */}
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

  const initExercise = (ex) => ({
    id: ex.id, name: ex.name, type: ex.type,
    sets:     ex.sets     ?? 1,
    weight:   ex.weight   ?? null,
    reps_min: ex.reps_min ?? 8,
    reps_max: ex.reps_max ?? (rirEnabled ? 12 : 8),
  })

  const [exercises, setExercises] = useState(() => (plan?.exercises ?? []).map(initExercise))
  const [showSelector, setShowSelector] = useState(false)
  const [saving, setSaving]       = useState(false)

  const handleSelect = (ex) => {
    if (!exercises.find(e => e.id === ex.id))
      setExercises(prev => [...prev, initExercise({ id: ex.id, name: ex.name, type: ex.type })])
    setShowSelector(false)
  }

  const handleUpdate = (id, field, value) =>
    setExercises(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))

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
          <div className="px-5 pb-8 pt-2 space-y-5 overflow-y-auto max-h-[78vh]">
            <div>
              <h2 className="text-white font-bold text-lg">Próximo entrenamiento</h2>
              <p className="text-slate-400 text-sm mt-1">
                Configura ejercicios, series, peso y repeticiones para tu próxima sesión.
              </p>
            </div>

            <div className="space-y-2">
              {exercises.map(ex => (
                <PlanExItem
                  key={ex.id}
                  ex={ex}
                  rirEnabled={rirEnabled}
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

// ── Helper: compact plan exercise summary ─────────────────────────────────────
function planExSummary(ex) {
  const parts = [`${ex.sets ?? 1}×`]
  if (ex.type !== 'time') {
    if (ex.weight) parts.push(`${ex.weight}kg`)
    const min = ex.reps_min, max = ex.reps_max
    if (min != null && max != null)
      parts.push(min === max ? `${min} reps` : `${min}–${max} reps`)
    else if (min != null)
      parts.push(`${min} reps`)
  }
  return parts.join(' ')
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function Planner({ onModalClose }) {
  const { user } = useApp()
  const [routines, setRoutines]         = useState([])
  const [plan, setPlan]                 = useState(null)
  const [loading, setLoading]           = useState(true)
  const [editingRoutine, setEditingRoutine] = useState(null) // null | 'new' | routine
  const [editingPlan, setEditingPlan]   = useState(false)
  const [deletingRoutine, setDeletingRoutine] = useState(null)
  const [deletingPlan, setDeletingPlan] = useState(false)

  // Notify MainLayout to re-snap swipe container whenever any modal closes
  const isModalOpen = !!(editingRoutine || editingPlan || deletingRoutine || deletingPlan)
  const prevModalOpenRef = useRef(false)
  useEffect(() => {
    if (prevModalOpenRef.current && !isModalOpen) onModalClose?.()
    prevModalOpenRef.current = isModalOpen
  }, [isModalOpen, onModalClose])

  const todayIdx = new Date().getDay()

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
                    {/* Name + exercises preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-white font-semibold text-sm truncate">{r.name}</h3>
                        {isToday && (
                          <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">hoy</span>
                        )}
                      </div>
                      <p className="text-slate-600 text-xs truncate mt-0.5">{preview || 'Sin ejercicios'}</p>
                    </div>

                    {/* Day bullets */}
                    <div className="flex gap-0.5 flex-shrink-0">
                      {DAYS.map((d, i) => (
                        <span
                          key={i}
                          className={`w-[18px] h-[18px] rounded flex items-center justify-center text-[9px] font-bold ${
                            r.days.includes(i)
                              ? i === todayIdx ? 'bg-indigo-600 text-white' : 'bg-slate-600 text-slate-300'
                              : 'text-slate-700'
                          }`}
                        >{d}</span>
                      ))}
                    </div>

                    {/* Actions */}
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
