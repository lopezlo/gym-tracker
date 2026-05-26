import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Clock, Flame, Calendar, Upload } from 'lucide-react'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'
import CalendarHeatmap from '../components/CalendarHeatmap'
import SessionHistoryList from '../components/SessionHistoryList'
import dayjs from 'dayjs'

export default function Dashboard() {
  const { user, logout, activeSessionId, setActiveSession, statsCache, setStatsCache } = useApp()
  const navigate = useNavigate()
  const [historyKey, setHistoryKey] = useState(0)

  // Seed from cache immediately — no loading flash on revisit
  const cached = statsCache[user?.id] ?? null
  const [stats, setStats] = useState(cached)
  const [loading, setLoading] = useState(!cached)

  const loadStats = useCallback(() => {
    api.getStats(user.id).then(data => {
      setStats(data)
      setStatsCache(user.id, data)
    }).catch(() => {})
  }, [user.id])

  useEffect(() => {
    if (!user) return
    Promise.all([
      api.getStats(user.id).catch(() => ({ calendarData: [], exerciseProgress: [] })),
      api.getActiveSession(user.id).catch(() => []),
    ]).then(([s, active]) => {
      setStats(s)
      setStatsCache(user.id, s)
      if (active.length > 0) {
        const session = active[0]
        const start = new Date(/Z$|[+-]\d{2}/.test(session.started_at) ? session.started_at : session.started_at.replace(' ', 'T') + 'Z')
        const hoursOld = (Date.now() - start.getTime()) / 3600000
        if (hoursOld > 12) {
          api.endSession(session.id).then(() => setActiveSession(null))
        } else {
          setActiveSession(session.id)
        }
      } else {
        setActiveSession(null)
      }
    }).finally(() => setLoading(false))
  }, [user?.id])

  const totalSessions = stats?.calendarData?.reduce((a, d) => a + d.session_count, 0) ?? 0
  const totalMinutes  = stats?.calendarData?.reduce((a, d) => a + d.total_minutes, 0) ?? 0
  const thisYear      = stats?.calendarData?.filter(d => dayjs(d.date).year() === dayjs().year()).length ?? 0

  const fmtTime = (mins) => {
    if (mins < 60) return `${mins}m`
    return `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? `${mins % 60}m` : ''}`
  }

  const COLORS = ['bg-indigo-500', 'bg-violet-500', 'bg-pink-500', 'bg-emerald-500', 'bg-amber-500', 'bg-sky-500', 'bg-rose-500', 'bg-teal-500']
  const colorFor = (id) => COLORS[id % COLORS.length]
  const initials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const showSkeleton = loading && !stats

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="page-in flex-1 scrollable no-scrollbar px-4 pt-6 pb-4 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className={`w-10 h-10 rounded-xl ${colorFor(user.id)} flex items-center justify-center font-bold text-white text-xs overflow-hidden flex-shrink-0`}
              title="Cambiar usuario"
            >
              {user.avatar
                ? <img src={user.avatar} alt={user.name} className="w-full h-full rounded-xl object-cover" />
                : initials(user.name)
              }
            </button>
            <div>
              <p className="text-slate-400 text-xs">Bienvenido,</p>
              <h1 className="text-white font-bold leading-tight">{user.name}</h1>
            </div>
          </div>
          <button onClick={logout} className="p-2 text-slate-500 hover:text-white transition-colors">
            <LogOut size={18} />
          </button>
        </div>

        {/* Stats row — always rendered, skeleton numbers while loading */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Flame,    label: 'Sesiones',    value: String(totalSessions) },
            { icon: Clock,    label: 'Tiempo total', value: fmtTime(totalMinutes) },
            { icon: Calendar, label: 'Este año',     value: String(thisYear) },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-slate-800 rounded-2xl p-3 text-center">
              <Icon size={18} className="text-indigo-400 mx-auto mb-1" />
              {showSkeleton
                ? <div className="h-6 w-10 bg-slate-700 rounded-md animate-pulse mx-auto mb-0.5" />
                : <p className="text-white font-bold text-lg leading-tight">{value}</p>
              }
              <p className="text-slate-500 text-xs">{label}</p>
            </div>
          ))}
        </div>

        {/* Calendar */}
        <div className="bg-slate-800 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Calendar size={15} className="text-indigo-400" />
            Días entrenados
          </h2>
          {showSkeleton
            ? <div className="h-20 animate-pulse bg-slate-700 rounded-xl" />
            : <CalendarHeatmap data={stats?.calendarData ?? []} />
          }
        </div>

        {/* History */}
        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Histórico de sesiones</h2>
          <SessionHistoryList
            key={historyKey}
            userId={user.id}
            onDataChanged={() => { loadStats(); setHistoryKey(k => k + 1) }}
          />
        </div>

        {/* Import link */}
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
