import { useState, useMemo, useEffect, useRef } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Dot
} from 'recharts'
import dayjs from 'dayjs'
import { ChevronDown, X } from 'lucide-react'

const CHART_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#3b82f6', '#a855f7', '#14b8a6', '#f97316']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{dayjs(label).format('D MMM YYYY')}</p>
      {payload.filter(p => p.value != null).map(p => (
        <p key={p.dataKey} className="font-semibold" style={{ color: p.color }}>
          {p.name}: {p.value}{p.unit}
        </p>
      ))}
    </div>
  )
}

export default function ProgressChart({ exerciseProgress, defaultExerciseId, userId }) {
  const storageKey = `gymlog_chart_${userId ?? 'default'}`

  const [selectedIds, setSelectedIds] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropRef = useRef(null)

  const exercises = useMemo(() => {
    const map = {}
    exerciseProgress.forEach(s => {
      if (!map[s.exercise_id]) map[s.exercise_id] = { id: s.exercise_id, name: s.exercise_name, type: s.exercise_type }
    })
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name))
  }, [exerciseProgress])

  // Persist selection to localStorage
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(selectedIds)) } catch {}
  }, [selectedIds, storageKey])

  // Once exercises load: prune stale IDs, and seed a default if selection is empty
  useEffect(() => {
    if (exercises.length === 0) return
    const validIds = exercises.map(e => e.id)
    setSelectedIds(prev => {
      const pruned = prev.filter(id => validIds.includes(id))
      if (pruned.length > 0) return pruned.length === prev.length ? prev : pruned
      // Nothing valid — pick a default
      if (defaultExerciseId && validIds.includes(defaultExerciseId)) return [defaultExerciseId]
      return [exercises[0].id]
    })
  }, [exercises])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const addExercise = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev : [...prev, id])
    setDropdownOpen(false)
  }

  const removeExercise = (id) => {
    setSelectedIds(prev => prev.filter(i => i !== id))
  }

  // Build unified chart data across all selected exercises
  const chartData = useMemo(() => {
    if (selectedIds.length === 0) return []

    const allDates = new Set()
    const byExerciseDate = {}

    selectedIds.forEach(exId => {
      byExerciseDate[exId] = {}
      const exercise = exercises.find(e => e.id === exId)
      if (!exercise) return

      exerciseProgress
        .filter(s => s.exercise_id === exId)
        .forEach(s => {
          allDates.add(s.date)
          if (!byExerciseDate[exId][s.date]) {
            byExerciseDate[exId][s.date] = { maxWeight: null, totalReps: 0, maxDuration: null, sets: 0 }
          }
          const d = byExerciseDate[exId][s.date]
          d.sets++
          if (exercise.type === 'reps') {
            if (s.weight != null && (d.maxWeight === null || s.weight > d.maxWeight)) d.maxWeight = s.weight
            if (s.reps != null) d.totalReps += s.reps
          } else {
            const mins = s.duration != null ? Math.round(s.duration / 60 * 2) / 2 : null
            if (mins != null && (d.maxDuration === null || mins > d.maxDuration)) d.maxDuration = mins
          }
        })
    })

    return [...allDates].sort().map(date => {
      const point = { date }
      selectedIds.forEach(exId => {
        const exercise = exercises.find(e => e.id === exId)
        const dayData = byExerciseDate[exId]?.[date]
        if (exercise?.type === 'reps') {
          point[`v_${exId}`] = dayData?.maxWeight ?? null
        } else {
          point[`v_${exId}`] = dayData?.maxDuration ?? null
        }
      })
      return point
    })
  }, [selectedIds, exerciseProgress, exercises])

  const unselected = exercises.filter(e => !selectedIds.includes(e.id))

  if (exercises.length === 0) return (
    <div className="text-center py-12 text-slate-500 text-sm">
      Aún no hay datos de ejercicios registrados.
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Selection controls */}
      <div className="space-y-2">
        {/* Selected exercise tags */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedIds.map((id, idx) => {
              const ex = exercises.find(e => e.id === id)
              if (!ex) return null
              const color = CHART_COLORS[idx % CHART_COLORS.length]
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ backgroundColor: color + '22', border: `1px solid ${color}55` }}
                >
                  <span style={{ color }}>{ex.name}</span>
                  <button
                    onClick={() => removeExercise(id)}
                    className="text-slate-500 hover:text-white transition-colors"
                    aria-label={`Quitar ${ex.name}`}
                  >
                    <X size={11} />
                  </button>
                </span>
              )
            })}
          </div>
        )}

        {/* Add exercise dropdown */}
        {unselected.length > 0 && (
          <div className="relative" ref={dropRef}>
            <button
              onClick={() => setDropdownOpen(o => !o)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-xs font-medium transition-colors"
            >
              <span>Añadir ejercicio</span>
              <ChevronDown size={13} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-1 bg-slate-700 border border-slate-600 rounded-xl shadow-xl z-20 min-w-[200px] max-h-56 overflow-y-auto">
                {unselected.map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => addExercise(ex.id)}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-600 hover:text-white transition-colors first:rounded-t-xl last:rounded-b-xl"
                  >
                    {ex.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart */}
      {selectedIds.length === 0 || chartData.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">
          Sin datos para los ejercicios seleccionados.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="date"
              tickFormatter={d => dayjs(d).format('d/M')}
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            {selectedIds.map((id, idx) => {
              const ex = exercises.find(e => e.id === id)
              if (!ex) return null
              const color = CHART_COLORS[idx % CHART_COLORS.length]
              return (
                <Line
                  key={id}
                  type="monotone"
                  dataKey={`v_${id}`}
                  name={ex.name}
                  unit={ex.type === 'time' ? ' min' : 'kg'}
                  stroke={color}
                  strokeWidth={2}
                  dot={<Dot r={3} fill={color} />}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
