import { useState } from 'react'
import { X, LogOut } from 'lucide-react'
import BottomSheet from './BottomSheet'
import { useApp } from '../context/AppContext'
import { useNavigate } from 'react-router-dom'

const COLORS = ['bg-indigo-500','bg-violet-500','bg-pink-500','bg-emerald-500','bg-amber-500','bg-sky-500','bg-rose-500','bg-teal-500']
const colorFor = (id) => COLORS[id % COLORS.length]
const initials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

const REST_PRESETS = [30, 60, 90, 120, 150, 180, 240, 300]

export const getSettings = () => {
  try { return JSON.parse(localStorage.getItem('gym_settings')) ?? {} } catch { return {} }
}
export const saveSettings = (s) => localStorage.setItem('gym_settings', JSON.stringify(s))

export default function SettingsSheet({ onClose }) {
  const { user, logout, activeSessionId } = useApp()
  const navigate = useNavigate()
  const [settings, setSettings] = useState(getSettings)
  const [logoutWarning, setLogoutWarning] = useState(false)

  const { restAlertEnabled = false, restDuration = 90 } = settings

  const update = (key, value) => {
    const next = { ...settings, [key]: value }
    setSettings(next)
    saveSettings(next)
  }

  return (
    <BottomSheet onClose={onClose} className="max-h-[85vh] flex flex-col">
      {({ dismiss }) => (
        <>
          <div className="px-4 pb-2 flex items-center justify-between flex-shrink-0">
            <h2 className="text-white font-bold text-lg">Ajustes</h2>
            <button onClick={dismiss} className="p-2 text-slate-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-10 space-y-6">
            {/* User info */}
            <div className="flex items-center gap-3 bg-slate-700/50 rounded-2xl px-4 py-3.5">
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
            </div>

            {/* Rest timer */}
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Temporizador de descanso</p>
              <div className="bg-slate-700/50 rounded-2xl overflow-hidden">
                {/* Toggle */}
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

                {/* Duration presets */}
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

            {/* Logout */}
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
                  <button
                    onClick={() => setLogoutWarning(false)}
                    className="py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    Seguir
                  </button>
                  <button
                    onClick={() => { logout(); dismiss() }}
                    className="py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition-colors"
                  >
                    Salir igual
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </BottomSheet>
  )
}
