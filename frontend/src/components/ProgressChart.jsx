import { useState, useMemo, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Dot
} from 'recharts'
import dayjs from 'dayjs'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{dayjs(label).format('D MMM YYYY')}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="font-semibold" style={{ color: p.color }}>
          {p.name}: {p.value}{p.unit}
        </p>
      ))}
    </div>
  )
}

export default function ProgressChart({ exerciseProgress, defaultExerciseId }) {
  const exercises = useMemo(() => {
    const map = {}
    exerciseProgress.forEach(s => {
      if (!map[s.exercise_id]) map[s.exercise_id] = { id: s.exercise_id, name: s.exercise_name, type: s.exercise_type }
    })
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name))
  }, [exerciseProgress])

  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    if (selectedId) return
    if (defaultExerciseId && exercises.find(e => e.id === defaultExerciseId)) {
      setSelectedId(defaultExerciseId)
    } else if (exercises.length > 0) {
      setSelectedId(exercises[0].id)
    }
  }, [exercises, defaultExerciseId])

  const chartData = useMemo(() => {
    if (!selectedId) return []
    const exercise = exercises.find(e => e.id === selectedId)
    if (!exercise) return []

    const byDate = {}
    exerciseProgress
      .filter(s => s.exercise_id === selectedId)
      .forEach(s => {
        if (!byDate[s.date]) byDate[s.date] = { date: s.date, maxWeight: null, totalReps: 0, maxDuration: null, sets: 0 }
        const d = byDate[s.date]
        d.sets++
        if (exercise.type === 'reps') {
          if (s.weight != null && (d.maxWeight === null || s.weight > d.maxWeight)) d.maxWeight = s.weight
          if (s.reps != null) d.totalReps += s.reps
        } else {
          // Convert seconds → minutes (0.5 precision)
          const mins = s.duration != null ? Math.round(s.duration / 60 * 2) / 2 : null
          if (mins != null && (d.maxDuration === null || mins > d.maxDuration)) d.maxDuration = mins
        }
      })

    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
  }, [selectedId, exerciseProgress])

  const selectedExercise = exercises.find(e => e.id === selectedId)
  const isTime = selectedExercise?.type === 'time'

  if (exercises.length === 0) return (
    <div className="text-center py-12 text-slate-500 text-sm">
      Aún no hay datos de ejercicios registrados.
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Exercise pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {exercises.map(ex => (
          <button
            key={ex.id}
            onClick={() => setSelectedId(ex.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedId === ex.id
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {ex.name}
          </button>
        ))}
      </div>

      {chartData.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">
          Sin datos para este ejercicio.
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
            {isTime ? (
              <Line
                type="monotone" dataKey="maxDuration" name="Duración" unit=" min"
                stroke="#f59e0b" strokeWidth={2}
                dot={<Dot r={4} fill="#f59e0b" />}
                activeDot={{ r: 6 }}
                connectNulls
              />
            ) : (
              <Line
                type="monotone" dataKey="maxWeight" name="Peso máx" unit="kg"
                stroke="#6366f1" strokeWidth={2.5}
                dot={<Dot r={4} fill="#6366f1" />}
                activeDot={{ r: 6 }}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
