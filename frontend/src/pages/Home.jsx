import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Dumbbell, Download, AlertTriangle, X, Camera } from 'lucide-react'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'
import ChangelogModal from '../components/ChangelogModal'

function DeleteModal({ user, onConfirm, onCancel }) {
  const [downloaded, setDownloaded] = useState(false)

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = `/api/users/${user.id}/export`
    a.click()
    setDownloaded(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />
      <div className="relative w-full bg-slate-800 rounded-t-3xl p-6 space-y-5">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-600 rounded-full" />

        <div className="flex items-start gap-3 pt-2">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-red-400" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">Eliminar {user.name}</h2>
            <p className="text-slate-400 text-sm mt-1">
              Se eliminarán todas las sesiones y datos de entrenamiento. Esta acción no se puede deshacer.
            </p>
          </div>
        </div>

        <button
          onClick={handleDownload}
          className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all ${
            downloaded
              ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-400'
              : 'bg-slate-700 hover:bg-slate-600 text-white'
          }`}
        >
          <Download size={18} className={downloaded ? 'text-emerald-400' : 'text-indigo-400'} />
          <div className="text-left">
            <p className="font-semibold text-sm">
              {downloaded ? 'CSV descargado ✓' : 'Descargar datos en CSV'}
            </p>
            <p className={`text-xs mt-0.5 ${downloaded ? 'text-emerald-500/70' : 'text-slate-400'}`}>
              {downloaded ? 'Ya puedes eliminar la cuenta' : 'Guarda un respaldo antes de eliminar'}
            </p>
          </div>
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            className="flex items-center justify-center gap-2 py-3.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-colors"
          >
            <X size={16} />
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center justify-center gap-2 py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold transition-colors"
          >
            <Trash2 size={16} />
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

const compressAvatar = (file) => new Promise((resolve) => {
  const img = new Image()
  const url = URL.createObjectURL(file)
  img.onload = () => {
    URL.revokeObjectURL(url)
    const canvas = document.createElement('canvas')
    canvas.width = 120
    canvas.height = 120
    const ctx = canvas.getContext('2d')
    const s = Math.min(img.width, img.height)
    const sx = (img.width - s) / 2
    const sy = (img.height - s) / 2
    ctx.drawImage(img, sx, sy, s, s, 0, 0, 120, 120)
    resolve(canvas.toDataURL('image/jpeg', 0.8))
  }
  img.src = url
})

export default function Home() {
  const { selectUser } = useApp()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)
  const [showChangelog, setShowChangelog] = useState(false)
  const fileInputRef = useRef(null)
  const [avatarUserId, setAvatarUserId] = useState(null)

  useEffect(() => {
    api.getUsers().then(setUsers).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleSelect = (u) => {
    selectUser(u)
    navigate('/dashboard')
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
    } catch (e) {
      setError(e.message)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    await api.deleteUser(pendingDelete.id)
    setUsers(prev => prev.filter(u => u.id !== pendingDelete.id))
    setPendingDelete(null)
  }

  const handleExport = (e, user) => {
    e.stopPropagation()
    const a = document.createElement('a')
    a.href = `/api/users/${user.id}/export`
    a.click()
  }

  const handleAvatarClick = (e, userId) => {
    e.stopPropagation()
    setAvatarUserId(userId)
    fileInputRef.current?.click()
  }

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !avatarUserId) return
    try {
      const avatar = await compressAvatar(file)
      const updated = await api.updateUser(avatarUserId, { avatar })
      setUsers(prev => prev.map(u => u.id === avatarUserId ? updated : u))
    } catch {
      alert('Error al actualizar la foto')
    }
    e.target.value = ''
    setAvatarUserId(null)
  }

  const initials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const COLORS = [
    'bg-indigo-500', 'bg-violet-500', 'bg-pink-500', 'bg-emerald-500',
    'bg-amber-500', 'bg-sky-500', 'bg-rose-500', 'bg-teal-500',
  ]
  const colorFor = (id) => COLORS[id % COLORS.length]

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 mb-4">
            <Dumbbell size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">GymLog</h1>
          <p className="text-slate-400 mt-1 text-sm">Selecciona tu perfil</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-slate-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {users.map(u => (
              <button
                key={u.id}
                onClick={() => handleSelect(u)}
                className="w-full flex items-center gap-4 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] rounded-2xl px-4 py-3.5 transition-all group"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
                  {u.avatar ? (
                    <img src={u.avatar} alt={u.name} className="w-11 h-11 rounded-xl object-cover" />
                  ) : (
                    <div className={`w-11 h-11 rounded-xl ${colorFor(u.id)} flex items-center justify-center font-bold text-white text-sm`}>
                      {initials(u.name)}
                    </div>
                  )}
                  <button
                    onClick={e => handleAvatarClick(e, u.id)}
                    title="Cambiar foto"
                    className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Camera size={14} className="text-white" />
                  </button>
                </div>

                <span className="font-semibold text-white flex-1 text-left">{u.name}</span>

                {/* Export button */}
                <button
                  onClick={(e) => handleExport(e, u)}
                  title="Exportar datos CSV"
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-indigo-500/20 text-slate-500 hover:text-indigo-400 transition-all"
                >
                  <Download size={16} />
                </button>

                {/* Delete button */}
                <button
                  onClick={(e) => { e.stopPropagation(); setPendingDelete(u) }}
                  title="Eliminar usuario"
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
                >
                  <Trash2 size={16} />
                </button>
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
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
                  >
                    Crear
                  </button>
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

      {/* Hidden file input for avatar upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarFile}
      />

      {/* Legal footer */}
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

      {/* Delete confirmation modal */}
      {pendingDelete && (
        <DeleteModal
          user={pendingDelete}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
