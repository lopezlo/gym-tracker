import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Dumbbell, Download, AlertTriangle, X, Camera, MoreHorizontal, Edit2 } from 'lucide-react'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'
import ChangelogModal from '../components/ChangelogModal'
import BottomSheet from '../components/BottomSheet'

const COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-pink-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-sky-500', 'bg-rose-500', 'bg-teal-500',
]
const colorFor = (id) => COLORS[id % COLORS.length]
const initials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

const compressAvatar = (file) => new Promise((resolve) => {
  const img = new Image()
  const url = URL.createObjectURL(file)
  img.onload = () => {
    URL.revokeObjectURL(url)
    const canvas = document.createElement('canvas')
    canvas.width = 120; canvas.height = 120
    const ctx = canvas.getContext('2d')
    const s = Math.min(img.width, img.height)
    ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 120, 120)
    resolve(canvas.toDataURL('image/jpeg', 0.8))
  }
  img.src = url
})

function Avatar({ user, size = 'md' }) {
  const dim = size === 'lg' ? 'w-20 h-20 text-xl rounded-2xl' : 'w-11 h-11 text-sm rounded-xl'
  return user.avatar
    ? <img src={user.avatar} alt={user.name} className={`${dim} object-cover`} />
    : <div className={`${dim} ${colorFor(user.id)} flex items-center justify-center font-bold text-white`}>{initials(user.name)}</div>
}

// ── Edit user modal ────────────────────────────────────────────────────────────

function EditUserModal({ user, onSave, onCancel }) {
  const [name, setName] = useState(user.name)
  const [avatar, setAvatar] = useState(user.avatar)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const compressed = await compressAvatar(file)
    setAvatar(compressed)
    e.target.value = ''
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try { await onSave({ name: name.trim(), avatar }) }
    finally { setSaving(false) }
  }

  return (
    <BottomSheet onClose={onCancel} locked={saving}>
      {({ dismiss }) => (
        <div className="px-6 pb-8 pt-2 space-y-5">
          <h2 className="text-white font-bold text-lg">Editar perfil</h2>

          {/* Avatar with camera overlay */}
          <div className="flex justify-center">
            <div className="relative cursor-pointer" onClick={() => fileRef.current?.click()}>
              {avatar
                ? <img src={avatar} alt={name} className="w-20 h-20 rounded-2xl object-cover" />
                : <div className={`w-20 h-20 rounded-2xl ${colorFor(user.id)} flex items-center justify-center font-bold text-white text-xl`}>{initials(name || user.name)}</div>}
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50">
                <Camera size={22} className="text-white" />
              </div>
            </div>
          </div>

          {/* Name input */}
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Nombre</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="Nombre de usuario"
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => dismiss()}
              disabled={saving}
              className="py-3.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
      )}
    </BottomSheet>
  )
}

// ── Delete modal ───────────────────────────────────────────────────────────────

function DeleteModal({ user, onConfirm, onCancel }) {
  const [downloaded, setDownloaded] = useState(false)

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = `/api/users/${user.id}/export`
    a.click()
    setDownloaded(true)
  }

  return (
    <BottomSheet onClose={onCancel}>
      {() => (
        <div className="px-6 pb-6 pt-2 space-y-5">
          <div className="flex items-start gap-3">
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
              <p className="font-semibold text-sm">{downloaded ? 'CSV descargado ✓' : 'Descargar datos en CSV'}</p>
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
      )}
    </BottomSheet>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function Home() {
  const { selectUser } = useApp()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)
  const [editingUser, setEditingUser] = useState(null)
  const [openMenu, setOpenMenu] = useState(null)
  const [showChangelog, setShowChangelog] = useState(false)

  useEffect(() => {
    api.getUsers().then(setUsers).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // Close menu on outside tap
  useEffect(() => {
    if (!openMenu) return
    const close = () => setOpenMenu(null)
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [openMenu])

  const handleSelect = (u) => { selectUser(u); navigate('/dashboard') }

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

  const confirmDelete = async () => {
    if (!pendingDelete) return
    await api.deleteUser(pendingDelete.id)
    setUsers(prev => prev.filter(u => u.id !== pendingDelete.id))
    setPendingDelete(null)
  }

  const handleExport = (user) => {
    const a = document.createElement('a')
    a.href = `/api/users/${user.id}/export`
    a.click()
  }

  const handleEditSave = async ({ name, avatar }) => {
    const updated = await api.updateUser(editingUser.id, { name, avatar })
    setUsers(prev => prev.map(u => u.id === editingUser.id ? updated : u))
    setEditingUser(null)
  }

  return (
    <div className="h-full bg-slate-900 flex flex-col items-center justify-center px-4 py-12 overflow-y-auto">
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
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-800 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {users.map(u => (
              <div
                key={u.id}
                className="flex items-center bg-slate-800 hover:bg-slate-750 rounded-2xl transition-colors"
              >
                {/* Avatar + name — main tap target */}
                <button
                  onClick={() => handleSelect(u)}
                  className="flex items-center gap-4 flex-1 px-4 py-3.5 text-left active:scale-[0.98] transition-transform min-w-0"
                >
                  <div className="flex-shrink-0">
                    <Avatar user={u} size="md" />
                  </div>
                  <span className="font-semibold text-white truncate">{u.name}</span>
                </button>

                {/* ⋯ menu */}
                <div
                  className="relative flex-shrink-0 pr-2"
                  onPointerDown={e => e.stopPropagation()}
                >
                  <button
                    onClick={e => { e.stopPropagation(); setOpenMenu(prev => prev === u.id ? null : u.id) }}
                    className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
                  >
                    <MoreHorizontal size={16} />
                  </button>

                  {openMenu === u.id && (
                    <div className="absolute right-0 top-full mt-1 bg-slate-700 border border-slate-600 rounded-xl shadow-xl z-30 overflow-hidden min-w-[160px]">
                      <button
                        onPointerDown={e => e.stopPropagation()}
                        onClick={() => { setOpenMenu(null); setEditingUser(u) }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-600 hover:text-white transition-colors"
                      >
                        <Edit2 size={13} />
                        Editar
                      </button>
                      <button
                        onPointerDown={e => e.stopPropagation()}
                        onClick={() => { setOpenMenu(null); handleExport(u) }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-600 hover:text-white transition-colors"
                      >
                        <Download size={13} />
                        Exportar datos
                      </button>
                      <button
                        onPointerDown={e => e.stopPropagation()}
                        onClick={() => { setOpenMenu(null); setPendingDelete(u) }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={13} />
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>
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

      {pendingDelete && (
        <DeleteModal
          user={pendingDelete}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onSave={handleEditSave}
          onCancel={() => setEditingUser(null)}
        />
      )}
    </div>
  )
}
