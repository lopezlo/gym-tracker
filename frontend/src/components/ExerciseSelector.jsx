import { useState, useEffect, useRef } from 'react'
import { Search, Plus, X, Clock, Dumbbell } from 'lucide-react'
import { api } from '../api/client'

export default function ExerciseSelector({ userId, onSelect, onClose }) {
  const [exercises, setExercises] = useState([])
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('reps')
  const [loading, setLoading] = useState(true)
  const inputRef = useRef(null)

  // ── Keyboard-aware positioning via visualViewport ─────────────────────────
  // Anchor the backdrop/sheet container to the *visual* viewport so it always
  // sits exactly in the visible area regardless of whether the browser resizes
  // the layout viewport when the keyboard opens (new Chrome) or not (old).
  const [vpHeight, setVpHeight] = useState(
    () => window.visualViewport?.height ?? window.innerHeight
  )

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    // Only track height — ignore offsetTop, which Chrome changes during
    // scroll/keyboard transitions and causes the floating-modal bug.
    const update = () => setVpHeight(vv.height)
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

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
    <div
      className="fixed top-0 left-0 right-0 z-50 flex flex-col justify-end"
      style={{ height: vpHeight }}
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative w-full bg-slate-800 rounded-t-3xl flex flex-col"
        style={{ maxHeight: `${vpHeight * 0.92}px` }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-600 rounded-full" />
        </div>

        <div className="px-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold text-base leading-tight">Selecciona el ejercicio realizado</h2>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {/* Search */}
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

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-1">
          {loading ? (
            <div className="space-y-2 pt-2">
              {[1,2,3,4].map(i => <div key={i} className="h-12 bg-slate-700 rounded-xl animate-pulse" />)}
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
                    : <Dumbbell size={18} className="text-indigo-400 flex-shrink-0" />
                  }
                  <span className="text-white font-medium">{ex.name}</span>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                    ex.type === 'time' ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'
                  }`}>
                    {ex.type === 'time' ? 'tiempo' : 'reps'}
                  </span>
                </button>
              ))}

              {/* Create option */}
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
                  <p className="text-white font-semibold text-sm">Nuevo ejercicio: <span className="text-indigo-400">{newName}</span></p>
                  <div>
                    <p className="text-slate-400 text-xs mb-2">Tipo de seguimiento</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setNewType('reps')}
                        className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          newType === 'reps' ? 'bg-indigo-600 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                        }`}
                      >
                        <Dumbbell size={14} className="inline mr-1.5" />
                        Peso + Reps
                      </button>
                      <button
                        onClick={() => setNewType('time')}
                        className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          newType === 'time' ? 'bg-amber-600 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                        }`}
                      >
                        <Clock size={14} className="inline mr-1.5" />
                        Tiempo
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setCreating(false)} className="py-2.5 bg-slate-600 hover:bg-slate-500 text-slate-300 rounded-xl text-sm transition-colors">
                      Cancelar
                    </button>
                    <button onClick={handleCreate} className="py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors">
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
      </div>
    </div>
  )
}
