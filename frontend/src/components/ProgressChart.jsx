import { useState, useMemo, useEffect, useRef } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Dot, ReferenceDot
} from 'recharts'
import dayjs from 'dayjs'
import { ChevronDown, X } from 'lucide-react'

const CHART_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#3b82f6', '#a855f7', '#14b8a6', '#f97316']

const RANGES = [
  { key: '1m', label: '1 mes' },
  { key: '1y', label: '1 año' },
  { key: 'all', label: 'Todo' },
]

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
  const storageKey  = `gymlog_chart_${userId ?? 'default'}`
  const rangeKey    = `gymlog_chart_range_${userId ?? 'default'}`

  const [selectedIds, setSelectedIds] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  const [range, setRange] = useState(() => {
    try { return localStorage.getItem(rangeKey) || '1y' } catch { return '1y' }
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

  // Persist selection + range
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(selectedIds)) } catch {}
  }, [selectedIds, storageKey])

  useEffect(() => {
    try { localStorage.setItem(rangeKey, range) } catch {}
  }, [range, rangeKey])

  // Prune stale IDs only — never seed a default
  useEffect(() => {
    if (exercises.length === 0) return
    const validIds = exercises.map(e => e.id)
    setSelectedIds(prev => {
      const pruned = prev.filter(id => validIds.includes(id))
      return pruned.length === prev.length ? prev : pruned
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

  // Range cutoff date
  const rangeStart = useMemo(() => {
    if (range === '1m') return dayjs().subtract(1, 'month').format('YYYY-MM-DD')
    if (range === '1y') return dayjs().subtract(1, 'year').format('YYYY-MM-DD')
    return null
  }, [range])

  // Filtered progress for active range
  const filteredProgress = useMemo(() =>
    rangeStart
      ? exerciseProgress.filter(s => s.date >= rangeStart)
      : exerciseProgress
  , [exerciseProgress, rangeStart])

  // X-axis tick format adapts to range
  const xTickFmt = range === '1m' ? 'D/M' : range === '1y' ? 'MMM' : 'MMM YY'

  const addExercise = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev : [...prev, id])
    setDropdownOpen(false)
  }
  const removeExercise = (id) => setSelectedIds(prev => prev.filter(i => i !== id))

  // Build unified chart data
  const { chartData, maxPoints } = useMemo(() => {
    if (selectedIds.length === 0) return { chartData: [], maxPoints: {} }

    const allDates = new Set()
    const byExerciseDate = {}
    const maxVal = {}   // exerciseId → { date, value }

    selectedIds.forEach(exId => {
      byExerciseDate[exId] = {}
      const exercise = exercises.find(e => e.id === exId)
      if (!exercise) return

      filteredProgress
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

      // Find personal best for this exercise in the filtered range
      let best = null
      Object.entries(byExerciseDate[exId]).forEach(([date, d]) => {
        const val = exercise.type === 'reps' ? d.maxWeight : d.maxDuration
        if (val != null && (best === null || val > best.value)) best = { date, value: val }
      })
      if (best) maxVal[exId] = best
    })

    const data = [...allDates].sort().map(date => {
      const point = { date }
      selectedIds.forEach(exId => {
        const exercise = exercises.find(e => e.id === exId)
        const dayData = byExerciseDate[exId]?.[date]
        point[`v_${exId}`] = exercise?.type === 'reps'
          ? (dayData?.maxWeight ?? null)
          : (dayData?.maxDuration ?? null)
      })
      return point
    })

    return { chartData: data, maxPoints: maxVal }
  }, [selectedIds, filteredProgress, exercises])

  // Records summary per selected exercise
  const summaryData = useMemo(() => {
    return selectedIds.map(exId => {
      const exercise = exercises.find(e => e.id === exId)
      if (!exercise) return null

      const sorted = filteredProgress
        .filter(s => s.exercise_id === exId)
        .sort((a, b) => a.date.localeCompare(b.date))
      if (!sorted.length) return { id: exId, exercise, noData: true }

      // Aggregate by date
      const byDate = {}
      sorted.forEach(s => {
        if (!byDate[s.date]) byDate[s.date] = { maxWeight: null, totalReps: 0, maxDuration: null }
        const d = byDate[s.date]
        if (exercise.type === 'reps') {
          if (s.weight != null && (d.maxWeight === null || s.weight > d.maxWeight)) d.maxWeight = s.weight
          if (s.reps != null) d.totalReps += s.reps
        } else {
          const mins = s.duration != null ? Math.round(s.duration / 60 * 2) / 2 : null
          if (mins != null && (d.maxDuration === null || mins > d.maxDuration)) d.maxDuration = mins
        }
      })

      const getValue = d => exercise.type === 'reps' ? d.maxWeight : d.maxDuration
      const unit     = exercise.type === 'reps' ? 'kg' : 'min'

      const dateEntries = Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0]))
      const firstEntry  = dateEntries[0]
      const lastEntry   = dateEntries[dateEntries.length - 1]

      const firstVal = getValue(firstEntry[1])
      const lastVal  = getValue(lastEntry[1])
      const best     = maxPoints[exId]

      const diff = (firstVal != null && lastVal != null) ? +(lastVal - firstVal).toFixed(1) : null

      return { id: exId, exercise, unit, best, lastVal, lastDate: lastEntry[0], diff }
    }).filter(Boolean)
  }, [selectedIds, filteredProgress, exercises, maxPoints])

  const unselected = exercises.filter(e => !selectedIds.includes(e.id))
  const hasData = chartData.length > 0 && selectedIds.length > 0

  if (exercises.length === 0) return (
    <div className="text-center py-12 text-slate-500 text-sm">
      Aún no hay datos de ejercicios registrados.
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Exercise selector */}
      <div className="space-y-2">
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
      {selectedIds.length === 0 ? (
        <div className="text-center py-10 text-slate-500 text-sm">
          Selecciona un ejercicio para ver su progresión.
        </div>
      ) : !hasData ? (
        <div className="text-center py-10 text-slate-500 text-sm">
          Sin datos en el período seleccionado.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="date"
              tickFormatter={d => dayjs(d).format(xTickFmt)}
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={['auto', 'auto']}
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
            {/* Personal best markers */}
            {selectedIds.map((id, idx) => {
              const pb = maxPoints[id]
              if (!pb) return null
              const color = CHART_COLORS[idx % CHART_COLORS.length]
              return (
                <ReferenceDot
                  key={`pb_${id}`}
                  x={pb.date}
                  y={pb.value}
                  r={5}
                  fill={color}
                  stroke="#0f172a"
                  strokeWidth={2}
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Range selector */}
      <div className="flex justify-center gap-2">
        {RANGES.map(r => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`px-5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              range === r.key
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Records summary */}
      {hasData && summaryData.length > 0 && (
        <div className="space-y-2 pt-1">
          {summaryData.map((row, idx) => {
            if (!row || row.noData) return null
            const color = CHART_COLORS[selectedIds.indexOf(row.id) % CHART_COLORS.length]
            return (
              <div
                key={row.id}
                className="flex items-center gap-3 bg-slate-800/60 rounded-xl px-3 py-2.5"
              >
                {/* Color dot */}
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                {/* Name */}
                <span className="flex-1 text-xs font-medium text-slate-300 truncate">{row.exercise.name}</span>
                {/* Best */}
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-slate-500 leading-none mb-0.5">récord</p>
                  <p className="text-xs font-bold text-white">
                    {row.best ? `${row.best.value}${row.unit}` : '—'}
                  </p>
                </div>
                {/* Divider */}
                <div className="w-px h-7 bg-slate-700 flex-shrink-0" />
                {/* Last + diff */}
                <div className="text-right flex-shrink-0 min-w-[56px]">
                  <p className="text-[10px] text-slate-500 leading-none mb-0.5">
                    {dayjs(row.lastDate).format('D MMM')}
                  </p>
                  <p className="text-xs font-semibold text-slate-200">
                    {row.lastVal != null ? `${row.lastVal}${row.unit}` : '—'}
                    {row.diff !== null && row.diff !== 0 && (
                      <span className={`ml-1 text-[10px] ${row.diff > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {row.diff > 0 ? '+' : ''}{row.diff}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
