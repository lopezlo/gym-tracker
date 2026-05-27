import { useState, useEffect, useRef } from 'react'
import { Search, Plus, X, Clock, Dumbbell } from 'lucide-react'
import { api } from '../api/client'

const MARGIN_CLOSED = 60  // px gap when keyboard is NOT open
const MARGIN_OPEN   = 30  // px gap when keyboard IS open

export default function ExerciseSelector({ userId, onSelect, onClose }) {
  const [exercises, setExercises] = useState([])
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('reps')
  const [loading, setLoading] = useState(true)
  const inputRef = useRef(null)

  // ── Height tracking ───────────────────────────────────────────────────────
  // document.documentElement.clientHeight matches what `fixed inset-0` uses
  // (the CSS viewport), unlike window.innerHeight which can return the "large
  // viewport" on Android Chrome and cause the panel to overflow its container.
  // We also take Math.min with vv.height to handle old Chrome (where only the
  // visual viewport shrinks when the keyboard opens).
  const getAvailable = () =>
    Math.min(
      document.documentElement.clientHeight,
      window.visualViewport?.height ?? document.documentElement.clientHeight
    )

  // Track the maximum seen height → that's our keyboard-closed baseline.
  const maxAvailRef = useRef(getAvailable())
  const [available, setAvailable] = useState(getAvailable)

  useEffect(() => {
    const update = () => {
      const v = getAvailable()
      if (v > maxAvailRef.current) maxAvailRef.current = v
      setAvailable(v)
    }
    window.visualViewport?.addEventListener('resize', update)
    window.addEventListener('resize', update)
    // Fallback: keyboard closing means an input lost focus
    const onFocusOut = () => setTimeout(update, 300)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      window.visualViewport?.removeEventListener('resize', update)
      window.removeEventListener('resize', update)
      document.removeEventListener('focusout', onFocusOut)
    }
  }, [])

  // Keyboard is considered open when available drops >150 px from baseline
  const keyboardOpen = available < maxAvailRef.current - 150
  const topMargin    = keyboardOpen ? MARGIN_OPEN : MARGIN_CLOSED
  const modalHeight  = available - topMargin

  // ── Data ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    api.getExercises(userId).then(setExercises).finally(() => setLoading(false))
  }, [])

  const filtered = exercises.filter(e =>
    e.name.toLowerCase().includes(query.toLowerCase())
  )
  const exactMatch = exercises.find(e => e.name.toLowerCase() === query.toLowerCase())

  const handleCreate = async () => {
    const name = newName.trim() || query.trim()
    if (!name) return
    try {
      const ex = await api.createExercise(name, newType)
      onSelect(ex)
    } catch (e) { alert(e.message) }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query && !exactMatch) {
      setNewName(query)
      setCreating(true)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div
        className="relative w-full bg-slate-800 rounded-t-3xl flex flex-col overflow-hidden"
        style={{
          height: modalHeight,
          transition: 'height 180ms ease-out',
        }}
      >
        {/* Handle + header */}
        <div className="flex-shrink-0">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-slate-600 rounded-full" />
          </div>
          <div className="px-4 pt-1 pb-2 flex items-center justify-between">
            <h2 className="text-white font-semibold text-base leading-tight">
              Selecciona el ejercicio realizado
            </h2>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* List — takes all remaining space, scrolls */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-1 pb-2 space-y-1">
          {loading ? (
            <div className="space-y-2 pt-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-12 bg-slate-700 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {filtered.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => onSelect(ex)}
                  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-slate-700 active:bg-slate-600 transition-colors text-left"
                >
                  {ex.type === 'time'
                    ? <Clock size={18} className="text-amber-400 flex-shrink-0" />
                    : <Dumbbell size={18} className="text-indigo-400 flex-shrink-0" />}
                  <span className="text-white font-medium">{ex.name}</span>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                    ex.type === 'time'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-indigo-500/20 text-indigo-400'
                  }`}>
                    {ex.type === 'time' ? 'tiempo' : 'reps'}
                  </span>
                </button>
              ))}

              {query && !exactMatch && !creating && (
                <button
                  onClick={() => { setNewName(query); setCreating(true) }}
                  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl border border-dashed border-indigo-500/50 hover:border-indigo-500 hover:bg-indigo-500/10 transition-colors text-left"
                >
                  <Plus size={18} className="text-indigo-400" />
                  <span className="text-indigo-400 font-medium">Crear "{query}"</span>
                </button>
              )}

              {creating && (
                <div className="bg-slate-700 rounded-xl p-4 space-y-3">
                  <p className="text-white font-semibold text-sm">
                    Nuevo ejercicio: <span className="text-indigo-400">{newName}</span>
                  </p>
                  <div>
                    <p className="text-slate-400 text-xs mb-2">Tipo de seguimiento</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setNewType('reps')}
                        className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          newType === 'reps' ? 'bg-indigo-600 text-white' : 'bg-slate-600 text-slate-300'
                        }`}
                      >
                        <Dumbbell size={14} className="inline mr-1.5" />
                        Peso + Reps
                      </button>
                      <button
                        onClick={() => setNewType('time')}
                        className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          newType === 'time' ? 'bg-amber-600 text-white' : 'bg-slate-600 text-slate-300'
                        }`}
                      >
                        <Clock size={14} className="inline mr-1.5" />
                        Tiempo
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setCreating(false)} className="py-2.5 bg-slate-600 text-slate-300 rounded-xl text-sm">
                      Cancelar
                    </button>
                    <button onClick={handleCreate} className="py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold">
                      Crear
                    </button>
                  </div>
                </div>
              )}

              {!loading && filtered.length === 0 && !query && (
                <p className="text-center text-slate-500 text-sm py-8">
                  Aún no hay ejercicios.<br />Escribe uno para crearlo.
                </p>
              )}
            </>
          )}
        </div>

        {/* Search — pinned at bottom, always above keyboard */}
        <div className="flex-shrink-0 px-4 pt-2 pb-5 border-t border-slate-700/50">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setCreating(false) }}
              onKeyDown={handleKeyDown}
              placeholder="Buscar o crear ejercicio..."
              className="w-full bg-slate-700 text-white rounded-xl pl-9 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
