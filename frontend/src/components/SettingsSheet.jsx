import { useState, useRef } from 'react'
import { X, LogOut, Edit2, Camera, Download, Trash2, AlertTriangle } from 'lucide-react'
import BottomSheet from './BottomSheet'
import { useApp } from '../context/AppContext'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

const COLORS = ['bg-indigo-500','bg-violet-500','bg-pink-500','bg-emerald-500','bg-amber-500','bg-sky-500','bg-rose-500','bg-teal-500']
const colorFor = (id)   => COLORS[id % COLORS.length]
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

const REST_PRESETS = [30, 60, 90, 120, 150, 180, 240, 300]

export const getSettings  = () => { try { return JSON.parse(localStorage.getItem('gym_settings')) ?? {} } catch { return {} } }
export const saveSettings = (s) => localStorage.setItem('gym_settings', JSON.stringify(s))

export default function SettingsSheet({ onClose }) {
  const { user, logout, selectUser, activeSessionId } = useApp()
  const navigate = useNavigate()
  const fileRef  = useRef(null)

  const [settings, setSettings] = useState(getSettings)
  const [logoutWarning, setLogoutWarning] = useState(false)

  // Profile edit
  const [editing,    setEditing]    = useState(false)
  const [editName,   setEditName]   = useState(user.name)
  const [editAvatar, setEditAvatar] = useState(user.avatar)
  const [saving,     setSaving]     = useState(false)

  // Danger zone
  const [showDelete,    setShowDelete]    = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [downloaded,    setDownloaded]    = useState(false)

  const { restAlertEnabled = false, restDuration = 90, rirEnabled = false } = settings

  const update = (key, value) => {
    const next = { ...settings, [key]: value }
    setSettings(next)
    saveSettings(next)
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const compressed = await compressAvatar(file)
    setEditAvatar(compressed)
    e.target.value = ''
  }

  const handleSaveProfile = async () => {
    if (!editName.trim()) return
    setSaving(true)
    try {
      const updated = await api.updateUser(user.id, { name: editName.trim(), avatar: editAvatar })
      selectUser(updated)
      setEditing(false)
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleCancelEdit = () => {
    setEditName(user.name)
    setEditAvatar(user.avatar)
    setEditing(false)
  }

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = `/api/users/${user.id}/export`
    a.click()
    setDownloaded(true)
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      await api.deleteUser(user.id)
      logout()
    } catch (e) { alert(e.message); setDeleting(false) }
  }

  return (
    <BottomSheet onClose={onClose} className="max-h-[90vh] flex flex-col" locked={saving}>
      {({ dismiss }) => (
        <>
          {/* Header */}
          <div className="px-4 pb-2 flex items-center justify-between flex-shrink-0">
            <h2 className="text-white font-bold text-lg">Ajustes</h2>
            <button onClick={dismiss} className="p-2 text-slate-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-10 space-y-6">

            {/* ── User info / edit profile ── */}
            <div className="bg-slate-700/50 rounded-2xl overflow-hidden">
              {editing ? (
                /* Edit mode */
                <div className="px-4 py-4 space-y-4">
                  {/* Avatar picker */}
                  <div className="flex justify-center">
                    <div className="relative cursor-pointer" onClick={() => fileRef.current?.click()}>
                      {editAvatar
                        ? <img src={editAvatar} alt={editName} className="w-16 h-16 rounded-xl object-cover" />
                        : <div className={`w-16 h-16 rounded-xl ${colorFor(user.id)} flex items-center justify-center font-bold text-white text-lg`}>{initials(editName || user.name)}</div>}
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
                        <Camera size={18} className="text-white" />
                      </div>
                    </div>
                  </div>
                  {/* Name input */}
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveProfile()}
                    placeholder="Nombre de usuario"
                    className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                  />
                  {/* Save / Cancel */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="py-2.5 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
                    >Cancelar</button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving || !editName.trim()}
                      className="py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
                    >{saving ? 'Guardando…' : 'Guardar'}</button>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                </div>
              ) : (
                /* View mode */
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className={`w-12 h-12 rounded-xl ${colorFor(user.id)} flex items-center justify-center font-bold text-white text-sm flex-shrink-0 overflow-hidden`}>
                    {user.avatar
                      ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      : initials(user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{user.name}</p>
                    <button
                      onClick={() => { dismiss(); setTimeout(() => navigate('/'), 310) }}
                      className="text-indigo-400 text-xs hover:underline"
                    >
                      Cambiar usuario
                    </button>
                  </div>
                  <button
                    onClick={() => setEditing(true)}
                    className="p-2 text-slate-500 hover:text-white transition-colors flex-shrink-0"
                    title="Editar perfil"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* ── Rest timer ── */}
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Temporizador de descanso</p>
              <div className="bg-slate-700/50 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div>
                    <p className="text-white text-sm font-medium">Aviso al terminar</p>
                    <p className="text-slate-500 text-xs mt-0.5">Vibración larga al llegar a 0</p>
                  </div>
                  <button
                    onClick={() => update('restAlertEnabled', !restAlertEnabled)}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${restAlertEnabled ? 'bg-indigo-600' : 'bg-slate-600'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${restAlertEnabled ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>
                {restAlertEnabled && (
                  <div className="px-4 pb-4 border-t border-slate-600/50 pt-3">
                    <p className="text-slate-400 text-xs mb-2.5">Tiempo objetivo</p>
                    <div className="flex flex-wrap gap-2">
                      {REST_PRESETS.map(s => (
                        <button
                          key={s}
                          onClick={() => update('restDuration', s)}
                          className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                            restDuration === s
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                          }`}
                        >
                          {s < 60 ? `${s}s` : `${s / 60}min`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── RiR ── */}
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Entrenamiento</p>
              <div className="bg-slate-700/50 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-white text-sm font-medium">Repeticiones en Reserva (RiR)</p>
                    <p className="text-slate-500 text-xs mt-0.5">Indica el esfuerzo por serie al entrenar</p>
                  </div>
                  <button
                    onClick={() => update('rirEnabled', !rirEnabled)}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${rirEnabled ? 'bg-indigo-600' : 'bg-slate-600'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${rirEnabled ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>
                {rirEnabled && (
                  <div className="px-4 pb-4 border-t border-slate-600/50 pt-3 space-y-3">
                    <p className="text-slate-400 text-xs">Por serie, indica cuántas repeticiones te quedaban antes del fallo.</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { n: 0, label: 'Al fallo' },
                        { n: 1, label: '1 antes' },
                        { n: 2, label: '2 antes' },
                        { n: 3, label: '3 antes' },
                      ].map(({ n, label }) => (
                        <div key={n} className="bg-slate-600/60 rounded-xl py-2 text-center">
                          <p className="text-indigo-400 font-bold text-sm">RiR{n}</p>
                          <p className="text-slate-500 text-[10px] mt-0.5">{label}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-slate-500 text-xs">También activa el <span className="text-white">rango de repeticiones</span> en la pre-planificación.</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Logout ── */}
            {!logoutWarning ? (
              <button
                onClick={() => activeSessionId ? setLogoutWarning(true) : logout()}
                className="w-full flex items-center gap-3 px-4 py-3.5 bg-slate-700/50 hover:bg-slate-700 rounded-2xl transition-colors text-left"
              >
                <LogOut size={18} className="text-slate-400" />
                <span className="text-slate-300 font-medium">Salir</span>
              </button>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-3">
                <p className="text-amber-400 text-sm font-semibold">Sesión de entrenamiento activa</p>
                <p className="text-slate-400 text-xs">Si sales ahora la sesión quedará sin finalizar en el historial.</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setLogoutWarning(false)} className="py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition-colors">Seguir</button>
                  <button onClick={() => { logout(); dismiss() }} className="py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition-colors">Salir igual</button>
                </div>
              </div>
            )}

            {/* ── Danger zone (subtle) ── */}
            <div className="space-y-1 pt-1">
              <button
                onClick={handleDownload}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors text-left ${
                  downloaded ? 'text-emerald-500' : 'text-slate-600 hover:text-slate-400'
                }`}
              >
                <Download size={14} />
                {downloaded ? 'CSV descargado ✓' : 'Descargar mis datos en CSV'}
              </button>

              {!showDelete ? (
                <button
                  onClick={() => setShowDelete(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-700 hover:text-red-500 transition-colors text-left"
                >
                  <Trash2 size={14} />
                  Eliminar cuenta
                </button>
              ) : (
                <div className="bg-red-500/8 border border-red-500/20 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-400 text-sm font-semibold">Eliminar cuenta</p>
                      <p className="text-slate-500 text-xs mt-0.5">Se borrarán todas las sesiones y datos. No se puede deshacer.</p>
                    </div>
                  </div>
                  {!downloaded && (
                    <button onClick={handleDownload} className="w-full py-2 text-xs text-slate-400 hover:text-white border border-slate-600 rounded-lg transition-colors">
                      Descargar datos primero (recomendado)
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setShowDelete(false)} className="py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition-colors">Cancelar</button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                      className="py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors"
                    >{deleting ? 'Eliminando…' : 'Eliminar'}</button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </>
      )}
    </BottomSheet>
  )
}
