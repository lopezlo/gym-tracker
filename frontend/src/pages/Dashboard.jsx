import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Clock, Flame, Calendar, Upload } from 'lucide-react'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'
import CalendarHeatmap from '../components/CalendarHeatmap'
import SessionHistoryList from '../components/SessionHistoryList'
import dayjs from 'dayjs'

export default function Dashboard() {
  const { user, logout, activeSessionId, setActiveSession } = useApp()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [historyKey, setHistoryKey] = useState(0)

  const loadStats = useCallback(() => {
    api.getStats(user.id).then(setStats).catch(() => {})
  }, [user.id])

  useEffect(() => {
    if (!user) return
    Promise.all([
      api.getStats(user.id).catch(() => ({ calendarData: [], exerciseProgress: [] })),
      api.getActiveSession(user.id).catch(() => []),
    ]).then(([s, active]) => {
      setStats(s)
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
  const totalMinutes = stats?.calendarData?.reduce((a, d) => a + d.total_minutes, 0) ?? 0
  const thisWeek = stats?.calendarData?.filter(d =>
    dayjs(d.date).isAfter(dayjs().subtract(7, 'day'))
  ).length ?? 0

  const fmtTime = (mins) => {
    if (mins < 60) return `${mins}m`
    return `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? `${mins % 60}m` : ''}`
  }

  const COLORS = ['bg-indigo-500', 'bg-violet-500', 'bg-pink-500', 'bg-emerald-500', 'bg-amber-500', 'bg-sky-500', 'bg-rose-500', 'bg-teal-500']
  const colorFor = (id) => COLORS[id % COLORS.length]
  const initials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 scrollable no-scrollbar px-4 pt-6 pb-4 space-y-5">

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

        {/* Stats row */}
        {!loading && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Flame, label: 'Sesiones', value: totalSessions },
              { icon: Clock, label: 'Tiempo total', value: fmtTime(totalMinutes) },
              { icon: Calendar, label: 'Esta semana', value: thisWeek },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-slate-800 rounded-2xl p-3 text-center">
                <Icon size={18} className="text-indigo-400 mx-auto mb-1" />
                <p className="text-white font-bold text-lg leading-tight">{value}</p>
                <p className="text-slate-500 text-xs">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Calendar */}
        <div className="bg-slate-800 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Calendar size={15} className="text-indigo-400" />
            Días entrenados
          </h2>
          {loading ? (
            <div className="h-20 animate-pulse bg-slate-700 rounded-xl" />
          ) : (
            <CalendarHeatmap data={stats?.calendarData ?? []} />
          )}
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

        {/* Legal footer */}
        <div className="text-center text-slate-700 text-xs pt-2 pb-1 space-y-0.5 border-t border-slate-800">
          <p>No se almacenan datos personales. Solo se registran los ejercicios realizados.</p>
          <p>v{__APP_VERSION__} · {__BUILD_DATE__}</p>
        </div>

      </div>
    </div>
  )
}
