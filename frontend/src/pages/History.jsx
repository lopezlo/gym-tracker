import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'
import ProgressChart from '../components/ProgressChart'

export default function History() {
  const { user, logout, statsCache, setStatsCache } = useApp()
  const navigate = useNavigate()

  // Seed from cache immediately
  const cached = statsCache[user?.id] ?? null
  const [stats, setStats] = useState(cached)
  const [loading, setLoading] = useState(!cached)

  useEffect(() => {
    if (!user) return
    api.getStats(user.id)
      .then(data => {
        setStats(data)
        setStatsCache(user.id, data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  const COLORS = ['bg-indigo-500', 'bg-violet-500', 'bg-pink-500', 'bg-emerald-500', 'bg-amber-500', 'bg-sky-500', 'bg-rose-500', 'bg-teal-500']
  const colorFor = (id) => COLORS[id % COLORS.length]
  const initials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const showSkeleton = loading && !stats

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="page-in flex-1 scrollable no-scrollbar px-4 pt-6 pb-4 space-y-6">

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
              <p className="text-slate-400 text-xs">Progreso de</p>
              <h1 className="text-white font-bold leading-tight">{user.name}</h1>
            </div>
          </div>
          <button onClick={logout} className="p-2 text-slate-500 hover:text-white transition-colors">
            <LogOut size={18} />
          </button>
        </div>

        <div className="bg-slate-800 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Evolución por ejercicio</h2>
          {showSkeleton
            ? <div className="space-y-3">
                <div className="h-8 skeleton rounded-xl w-40" />
                <div className="h-48 skeleton rounded-xl" />
              </div>
            : <ProgressChart exerciseProgress={stats?.exerciseProgress ?? []} userId={user.id} />
          }
        </div>

      </div>
    </div>
  )
}
