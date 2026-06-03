import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, BookOpen, Dumbbell, Clock, X } from 'lucide-react'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'
import BottomSheet from '../components/BottomSheet'
import ExerciseSelector from '../components/ExerciseSelector'
import ConfirmModal from '../components/ConfirmModal'

const DAYS      = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// ── Inline exercise row inside editors ────────────────────────────────────────
function ExItem({ ex, onRemove }) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 bg-slate-700/70 rounded-xl">
      {ex.type === 'time'
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
  )
}

// ── Routine editor sheet ───────────────────────────────────────────────────────
function RoutineEditor({ routine, userId, onSave, onClose }) {
  const [name, setName]           = useState(routine?.name ?? '')
  const [days, setDays]           = useState(routine?.days ?? [])
  const [exercises, setExercises] = useState(routine?.exercises ?? [])
  const [showSelector, setShowSelector] = useState(false)
  const [saving, setSaving]       = useState(false)

  const toggleDay = (d) =>
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])

  const handleSelect = (ex) => {
    if (!exercises.find(e => e.id === ex.id))
      setExercises(prev => [...prev, { id: ex.id, name: ex.name, type: ex.type }])
    setShowSelector(false)
  }

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
                  <ExItem
                    key={ex.id}
                    ex={ex}
                    onRemove={id => setExercises(prev => prev.filter(e => e.id !== id))}
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
  const [exercises, setExercises] = useState(plan?.exercises ?? [])
  const [showSelector, setShowSelector] = useState(false)
  const [saving, setSaving]       = useState(false)

  const handleSelect = (ex) => {
    if (!exercises.find(e => e.id === ex.id))
      setExercises(prev => [...prev, { id: ex.id, name: ex.name, type: ex.type }])
    setShowSelector(false)
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
          <div className="px-5 pb-8 pt-2 space-y-5 overflow-y-auto max-h-[78vh]">
            <div>
              <h2 className="text-white font-bold text-lg">Próxima sesión</h2>
              <p className="text-slate-400 text-sm mt-1">
                Define qué ejercicios harás. Se cargará al empezar la sesión y se consumirá automáticamente.
              </p>
            </div>

            <div className="space-y-2">
              {exercises.map(ex => (
                <ExItem
                  key={ex.id}
                  ex={ex}
                  onRemove={id => setExercises(prev => prev.filter(e => e.id !== id))}
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
export default function Planner() {
  const { user } = useApp()
  const [routines, setRoutines]         = useState([])
  const [plan, setPlan]                 = useState(null)
  const [loading, setLoading]           = useState(true)
  const [editingRoutine, setEditingRoutine] = useState(null) // null | 'new' | routine
  const [editingPlan, setEditingPlan]   = useState(false)
  const [deletingRoutine, setDeletingRoutine] = useState(null)
  const [deletingPlan, setDeletingPlan] = useState(false)

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

  if (loading) return (
    <div className="h-full flex items-center justify-center bg-slate-900">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="h-full overflow-y-auto no-scrollbar bg-slate-900">
      <div className="px-4 pb-10 pt-3 space-y-8">

        {/* ── Próxima sesión ── */}
        <section>
          <h2 className="text-white font-bold text-base mb-3">Próxima sesión</h2>

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
                    <span className="text-slate-300 text-sm truncate">{ex.name}</span>
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
              <span className="text-sm font-medium">Planificar próxima sesión</span>
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
            <div className="space-y-3">
              {routines.map(r => {
                const isToday = r.days.includes(todayIdx)
                return (
                  <div
                    key={r.id}
                    className={`bg-slate-800 rounded-2xl p-4 ${isToday ? 'ring-1 ring-indigo-500/40' : ''}`}
                  >
                    {/* Name + actions */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-white font-semibold text-sm">{r.name}</h3>
                          {isToday && (
                            <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-medium">
                              hoy
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5">
                          {r.exercises.length} ejercicio{r.exercises.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => setEditingRoutine(r)} className="p-1.5 text-slate-500 hover:text-white transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => setDeletingRoutine(r)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Day chips */}
                    <div className="flex gap-1 mb-3">
                      {DAYS.map((d, i) => (
                        <span
                          key={i}
                          className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                            r.days.includes(i)
                              ? i === todayIdx
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-700 text-slate-300'
                              : 'text-slate-700'
                          }`}
                        >
                          {d}
                        </span>
                      ))}
                    </div>

                    {/* Exercise preview */}
                    <div className="space-y-1">
                      {r.exercises.slice(0, 4).map((ex, i) => (
                        <div key={ex.id} className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="text-slate-600 w-3 text-right flex-shrink-0">{i + 1}</span>
                          {ex.type === 'time'
                            ? <Clock size={11} className="text-amber-400 flex-shrink-0" />
                            : <Dumbbell size={11} className="text-indigo-400 flex-shrink-0" />}
                          <span className="truncate">{ex.name}</span>
                        </div>
                      ))}
                      {r.exercises.length > 4 && (
                        <p className="text-slate-600 text-xs pl-5">
                          +{r.exercises.length - 4} más
                        </p>
                      )}
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
  )
}
