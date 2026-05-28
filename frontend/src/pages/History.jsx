import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'
import ProgressChart from '../components/ProgressChart'

export default function History() {
  const { user, statsCache, setStatsCache } = useApp()

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

  const showSkeleton = loading && !stats

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="page-in flex-1 scrollable no-scrollbar px-4 pt-3 pb-4 space-y-6">

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
