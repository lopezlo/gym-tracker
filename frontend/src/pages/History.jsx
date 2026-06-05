import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Flame, Upload } from 'lucide-react'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'
import CalendarHeatmap from '../components/CalendarHeatmap'
import SessionHistoryList from '../components/SessionHistoryList'
import ProgressChart from '../components/ProgressChart'
import dayjs from 'dayjs'

function fmtTime(mins) {
  if (!mins) return '0m'
  if (mins < 60) return `${mins}m`
  return `${Math.round(mins / 60)}h`
}

export default function History() {
  const { user, statsCache, setStatsCache } = useApp()
  const navigate = useNavigate()

  const cached = statsCache[user?.id] ?? null
  const [stats,   setStats]   = useState(cached)
  const [loading, setLoading] = useState(!cached)
  const [historyKey, setHistoryKey] = useState(0)

  // Controlled calendar year — stats update when year changes
  const [calYear, setCalYear] = useState(dayjs().year())

  const loadStats = useCallback(() => {
    api.getStats(user.id).then(data => {
      setStats(data)
      setStatsCache(user.id, data)
    }).catch(() => {})
  }, [user.id])

  useEffect(() => {
    if (!user) return
    api.getStats(user.id)
      .then(data => { setStats(data); setStatsCache(user.id, data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id])

  const showSkeleton = loading && !stats

  // All-time totals
  const totalSessions = stats?.calendarData?.reduce((sum, d) => sum + d.session_count, 0) ?? 0
  const totalMinutes  = stats?.calendarData?.reduce((sum, d) => sum + d.total_minutes, 0) ?? 0

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="page-in flex-1 scrollable no-scrollbar px-4 pt-3 space-y-5" style={{ paddingBottom: '112px' }}>

        {/* All-time stats row (2 blocks) */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Flame, label: 'Sesiones totales', value: String(totalSessions) },
            { icon: Clock, label: 'Tiempo total',     value: fmtTime(totalMinutes)  },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-slate-800 rounded-2xl p-3 text-center">
              <Icon size={18} className="text-indigo-400 mx-auto mb-1" />
              {showSkeleton
                ? <div className="h-6 w-10 skeleton rounded-md mx-auto mb-0.5" />
                : <p className="text-white font-bold text-lg leading-tight">{value}</p>}
              <p className="text-slate-500 text-xs">{label}</p>
            </div>
          ))}
        </div>

        {/* Calendar (controlled year → stats update in sync) */}
        <div className="bg-slate-800 rounded-2xl p-4">
          {showSkeleton
            ? <div className="h-20 skeleton rounded-xl" />
            : <CalendarHeatmap
                data={stats?.calendarData ?? []}
                year={calYear}
                onYearChange={setCalYear}
              />}
        </div>

        {/* Progress chart */}
        <div className="bg-slate-800 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Evolución por ejercicio</h2>
          {showSkeleton
            ? <div className="space-y-3">
                <div className="h-8 skeleton rounded-xl w-40" />
                <div className="h-48 skeleton rounded-xl" />
              </div>
            : <ProgressChart exerciseProgress={stats?.exerciseProgress ?? []} userId={user.id} />}
        </div>

        {/* Session history */}
        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Histórico de sesiones</h2>
          <SessionHistoryList
            key={historyKey}
            userId={user.id}
            onDataChanged={() => { loadStats(); setHistoryKey(k => k + 1) }}
          />
        </div>

        {/* Import */}
        <button
          onClick={() => navigate('/import')}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-slate-700 hover:border-slate-500 text-slate-500 hover:text-slate-400 transition-colors text-sm"
        >
          <Upload size={15} />
          Importar datos históricos (CSV)
        </button>

      </div>
    </div>
  )
}
