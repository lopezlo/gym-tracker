import { Dumbbell, Clock, Plus } from 'lucide-react'
import { sessionCache } from '../utils/sessionCache'

// ── Helpers (minimal duplicates from Session.jsx to keep this component standalone) ──
function fmtSet(s) {
  if (s.exercise_type === 'time') {
    if (!s.duration) return '—'
    const mins = s.duration / 60
    return `${Number.isInteger(mins) ? mins : mins.toFixed(1)} min`
  }
  const parts = []
  if (s.weight != null) parts.push(`${s.weight}kg`)
  if (s.reps   != null) parts.push(`×${s.reps}`)
  return parts.join(' ') || '—'
}

// ── Static exercise card (no delete / interaction) ────────────────────────────
function ExerciseCardPreview({ group }) {
  return (
    <div className="bg-slate-800 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        {group.type === 'time'
          ? <Clock size={14} className="text-amber-400 flex-shrink-0" />
          : <Dumbbell size={14} className="text-indigo-400 flex-shrink-0" />}
        <h4 className="text-white font-semibold text-sm flex-1 truncate">{group.name}</h4>
        <span className="text-slate-500 text-xs flex-shrink-0">
          {group.sets.length} serie{group.sets.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-1.5 mb-3">
        {group.sets.map((s, i) => (
          <div key={s.id} className="flex items-center gap-3 py-0.5">
            <span className="text-slate-500 text-xs w-4 text-right flex-shrink-0">{i + 1}</span>
            <span className="text-white font-mono text-sm flex-1">{fmtSet(s)}</span>
          </div>
        ))}
      </div>
      <div className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-slate-600 text-slate-600 text-sm pointer-events-none">
        <Plus size={14} />
        Serie
      </div>
    </div>
  )
}

// ── Shimmer skeleton card ─────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-3.5 h-3.5 bg-slate-700 rounded skeleton flex-shrink-0" />
        <div className="h-4 bg-slate-700 rounded skeleton w-28" />
        <div className="ml-auto h-3 bg-slate-700 rounded skeleton w-12" />
      </div>
      <div className="space-y-2">
        <div className="h-5 bg-slate-700/70 rounded skeleton" />
        <div className="h-5 bg-slate-700/50 rounded skeleton w-3/4" />
      </div>
      <div className="h-8 bg-slate-700/30 rounded-xl skeleton" />
    </div>
  )
}

// ── Shared bottom CTA ─────────────────────────────────────────────────────────
function AddExerciseBtn() {
  return (
    <div className="flex-shrink-0 px-4 pt-2" style={{ paddingBottom: '96px' }}>
      <div className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 pointer-events-none">
        <Plus size={20} />
        Añadir ejercicio
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SessionPreview({ sessionId }) {
  const cache = sessionCache[sessionId]

  // ── No cache yet — show skeleton (no subheader: timerAnchor unknown) ────────
  if (!cache) {
    return (
      <div className="h-full flex flex-col bg-slate-900">
        <div className="flex-1 overflow-hidden px-4 pt-3 space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <AddExerciseBtn />
      </div>
    )
  }

  // ── Cache available — static render of real exercise data ─────────────────
  const { sets } = cache
  const groupedSets = sets.reduce((acc, s) => {
    if (!acc.has(s.exercise_id))
      acc.set(s.exercise_id, { name: s.exercise_name, type: s.exercise_type, sets: [] })
    acc.get(s.exercise_id).sets.push(s)
    return acc
  }, new Map())

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Subheader only when timerAnchor exists — mirrors Session.jsx behavior */}
      {cache.timerAnchor && (
        <div className="flex-shrink-0 h-10 border-b border-slate-800" />
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-3 pb-3 space-y-3">
        {groupedSets.size === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
              <Dumbbell size={32} className="text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium">Sin ejercicios aún</p>
            <p className="text-slate-600 text-sm mt-1">Pulsa el botón para añadir el primero</p>
          </div>
        ) : (
          [...groupedSets.entries()].map(([exId, group]) => (
            <ExerciseCardPreview key={exId} group={group} />
          ))
        )}
      </div>

      <AddExerciseBtn />
    </div>
  )
}
