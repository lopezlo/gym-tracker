import { useState, useEffect } from 'react'
import { BarChart2, Clock, Flame } from 'lucide-react'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'
import CalendarHeatmap from '../components/CalendarHeatmap'
import ProgressChart from '../components/ProgressChart'
import dayjs from 'dayjs'

export default function History() {
  const { user } = useApp()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    api.getStats(user.id)
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  const totalSessions = stats?.calendarData?.reduce((a, d) => a + d.session_count, 0) ?? 0
  const totalMinutes = stats?.calendarData?.reduce((a, d) => a + d.total_minutes, 0) ?? 0
  const bestStreak = (() => {
    if (!stats?.calendarData?.length) return 0
    const dates = stats.calendarData.map(d => d.date).sort()
    let best = 1, cur = 1
    for (let i = 1; i < dates.length; i++) {
      const diff = dayjs(dates[i]).diff(dayjs(dates[i - 1]), 'day')
      if (diff === 1) { cur++; if (cur > best) best = cur }
      else cur = 1
    }
    return best
  })()

  const fmtTime = (mins) => {
    if (mins < 60) return `${mins}m`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  return (
    <div className="h-full scrollable no-scrollbar px-4 pt-6 pb-4 space-y-6">
      <div className="flex items-center gap-2">
        <BarChart2 size={20} className="text-indigo-400" />
        <h1 className="text-white font-bold text-xl">Progreso</h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Flame, label: 'Sesiones', value: totalSessions },
              { icon: Clock, label: 'Total', value: fmtTime(totalMinutes) },
              { icon: BarChart2, label: 'Racha máx', value: `${bestStreak}d` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-slate-800 rounded-2xl p-3 text-center">
                <Icon size={18} className="text-indigo-400 mx-auto mb-1" />
                <p className="text-white font-bold text-lg leading-tight">{value}</p>
                <p className="text-slate-500 text-xs">{label}</p>
              </div>
            ))}
          </div>

          {/* Calendar */}
          <div className="bg-slate-800 rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Días entrenados</h2>
            <CalendarHeatmap data={stats?.calendarData ?? []} />
          </div>

          {/* Progress chart */}
          <div className="bg-slate-800 rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">Evolución por ejercicio</h2>
            <ProgressChart exerciseProgress={stats?.exerciseProgress ?? []} />
          </div>
        </>
      )}
    </div>
  )
}
