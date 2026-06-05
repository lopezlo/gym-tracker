import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Dumbbell } from 'lucide-react'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'
import ChangelogModal from '../components/ChangelogModal'
import PullToRefresh from '../components/PullToRefresh'

const COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-pink-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-sky-500', 'bg-rose-500', 'bg-teal-500',
]
const colorFor = (id)   => COLORS[id % COLORS.length]
const initials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

function Avatar({ user }) {
  return user.avatar
    ? <img src={user.avatar} alt={user.name} className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
    : <div className={`w-11 h-11 rounded-xl ${colorFor(user.id)} flex items-center justify-center font-bold text-white text-sm flex-shrink-0`}>{initials(user.name)}</div>
}

export default function Home() {
  const { selectUser } = useApp()
  const navigate = useNavigate()

  const [users, setUsers]           = useState([])
  const [newName, setNewName]       = useState('')
  const [adding, setAdding]         = useState(false)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [showChangelog, setShowChangelog] = useState(false)
  const [pressedUser, setPressedUser]    = useState(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    api.getUsers().then(setUsers).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleRefresh = useCallback(async () => {
    const list = await api.getUsers().catch(() => null)
    if (list) setUsers(list)
  }, [])

  const handleSelect = (u) => { selectUser(u); navigate('/dashboard') }

  const handleSelectAnimated = (u) => {
    navigator.vibrate?.(15)
    setPressedUser(u.id)
    setTimeout(() => { setPressedUser(null); handleSelect(u) }, 140)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setError('')
    try {
      const u = await api.createUser(newName.trim())
      setUsers(prev => [...prev, u].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName('')
      setAdding(false)
      handleSelect(u)
    } catch (e) { setError(e.message) }
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} scrollRef={scrollRef}>
    <div
      ref={scrollRef}
      className="h-full bg-slate-900 flex flex-col items-center justify-center px-4 py-12 overflow-y-auto"
      style={{ overscrollBehaviorY: 'none' }}
    >
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 mb-4">
            <Dumbbell size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">GymLog</h1>
          <p className="text-slate-400 mt-1 text-sm">Selecciona tu perfil</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-800 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {users.map(u => (
              <button
                key={u.id}
                onClick={() => handleSelectAnimated(u)}
                className="w-full flex items-center gap-4 px-4 py-3.5 bg-slate-800 rounded-2xl text-left transition-colors hover:bg-slate-700 active:bg-slate-700"
                style={{
                  transform:  pressedUser === u.id ? 'scale(0.96)' : 'scale(1)',
                  transition: 'transform 140ms cubic-bezier(0.34,1.2,0.64,1)',
                }}
              >
                <Avatar user={u} />
                <span className="font-semibold text-white truncate">{u.name}</span>
              </button>
            ))}

            {adding ? (
              <form onSubmit={handleCreate} className="bg-slate-800 rounded-2xl p-4">
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Tu nombre..."
                  className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                />
                {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => { setAdding(false); setError('') }}
                    className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 transition-colors"
                  >Cancelar</button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
                  >Crear</button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl py-4 text-slate-500 hover:text-indigo-400 transition-colors"
              >
                <Plus size={18} />
                <span className="text-sm font-medium">Nuevo usuario</span>
              </button>
            )}
          </div>
        )}
      </div>

      <p className="text-center text-slate-700 text-xs mt-8">
        No se almacenan datos personales. Solo se registran los ejercicios realizados.
        <br />
        <button
          onClick={() => setShowChangelog(true)}
          className="underline hover:text-slate-500 transition-colors"
        >
          v{__APP_VERSION__}
        </button>
        {' · '}{__BUILD_DATE__}
      </p>

      {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
    </div>
    </PullToRefresh>
  )
}
