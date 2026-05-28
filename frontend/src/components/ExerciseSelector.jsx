import { useState, useEffect, useRef } from 'react'
import { Search, Plus, X, Clock, Dumbbell, Star } from 'lucide-react'
import { api } from '../api/client'

const MARGIN_CLOSED = 60
const MARGIN_OPEN   = 30

export const CATEGORIES = [
  { id: 'pecho',   label: 'Pecho'   },
  { id: 'espalda', label: 'Espalda' },
  { id: 'piernas', label: 'Piernas' },
  { id: 'hombros', label: 'Hombros' },
  { id: 'brazos',  label: 'Brazos'  },
  { id: 'core',    label: 'Core'    },
  { id: 'cardio',  label: 'Cardio'  },
  { id: 'otro',    label: 'Otro'    },
]

const catLabel = (id) => CATEGORIES.find(c => c.id === id)?.label ?? id

// ── Favorites helpers (per-user localStorage) ─────────────────────────────────
const favsKey   = (userId) => `gym_favs_${userId}`
const loadFavs  = (userId) => { try { return new Set(JSON.parse(localStorage.getItem(favsKey(userId))) ?? []) } catch { return new Set() } }
const storeFavs = (userId, favs) => localStorage.setItem(favsKey(userId), JSON.stringify([...favs]))

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ label }) {
  return (
    <div className="px-2 pt-3 pb-1">
      <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{label}</span>
    </div>
  )
}

// ── Single exercise row ────────────────────────────────────────────────────────
function ExRow({ ex, onSelect, fav, onToggleFav, editingCat, setEditingCat, onSetCategory }) {
  return (
    <div>
      <div className="flex items-center gap-1">
        {/* Main tap area */}
        <button
          onClick={() => onSelect(ex)}
          className="flex items-center gap-3 flex-1 px-3 py-3 rounded-xl hover:bg-slate-700 active:bg-slate-600 transition-colors text-left"
        >
          {ex.type === 'time'
            ? <Clock size={17} className="text-amber-400 flex-shrink-0" />
            : <Dumbbell size={17} className="text-indigo-400 flex-shrink-0" />}
          <span className="text-white font-medium flex-1">{ex.name}</span>
        </button>

        {/* Category chip */}
        <button
          onClick={() => setEditingCat(editingCat === ex.id ? null : ex.id)}
          className="flex-shrink-0 px-1"
        >
          {ex.category
            ? <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-400 rounded-full hover:bg-slate-600 transition-colors">{catLabel(ex.category)}</span>
            : <span className="text-xs px-2 py-0.5 border border-dashed border-slate-700 text-slate-600 rounded-full hover:border-slate-500 transition-colors">cat</span>}
        </button>

        {/* Favorite toggle */}
        <button
          onClick={() => onToggleFav(ex.id)}
          className={`p-2 rounded-xl transition-colors flex-shrink-0 ${fav ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'}`}
        >
          <Star size={15} fill={fav ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Inline category picker */}
      {editingCat === ex.id && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2.5 pt-0.5">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => onSetCategory(ex, c.id)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                ex.category === c.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {c.label}
            </button>
          ))}
          {ex.category && (
            <button
              onClick={() => onSetCategory(ex, null)}
              className="text-xs px-2.5 py-1 rounded-full bg-slate-700 text-slate-500 hover:bg-slate-600 transition-colors"
            >
              Quitar
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ExerciseSelector({ userId, onSelect, onClose }) {
  const [exercises, setExercises]   = useState([])
  const [query, setQuery]           = useState('')
  const [creating, setCreating]     = useState(false)
  const [newName, setNewName]       = useState('')
  const [newType, setNewType]       = useState('reps')
  const [newCategory, setNewCategory] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [favs, setFavs]             = useState(() => loadFavs(userId))
  const [editingCat, setEditingCat] = useState(null)
  const inputRef = useRef(null)

  // ── Height tracking (unchanged) ───────────────────────────────────────────
  const getAvailable = () =>
    Math.min(
      document.documentElement.clientHeight,
      window.visualViewport?.height ?? document.documentElement.clientHeight
    )
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
    const onFocusOut = () => setTimeout(update, 300)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      window.visualViewport?.removeEventListener('resize', update)
      window.removeEventListener('resize', update)
      document.removeEventListener('focusout', onFocusOut)
    }
  }, [])

  const keyboardOpen = available < maxAvailRef.current - 150
  const modalHeight  = keyboardOpen
    ? `${available - MARGIN_OPEN}px`
    : `calc(100% - ${MARGIN_CLOSED}px)`

  // ── Data ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    api.getExercises(userId).then(setExercises).finally(() => setLoading(false))
  }, [])

  const filtered   = exercises.filter(e => e.name.toLowerCase().includes(query.toLowerCase()))
  const exactMatch = exercises.find(e => e.name.toLowerCase() === query.toLowerCase())

  // ── Grouped (no search) ───────────────────────────────────────────────────
  const favList    = filtered.filter(e => favs.has(e.id))
  const nonFavList = filtered.filter(e => !favs.has(e.id))

  // Group non-favs by category (Map preserves insertion/definition order)
  const grouped = new Map()
  nonFavList.forEach(e => {
    const key = e.category || '__none'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push(e)
  })

  // ── Actions ───────────────────────────────────────────────────────────────
  const toggleFav = (exId) => {
    const next = new Set(favs)
    if (next.has(exId)) next.delete(exId)
    else next.add(exId)
    setFavs(next)
    storeFavs(userId, next)
  }

  const handleSetCategory = async (ex, categoryId) => {
    // Optimistic update
    setExercises(prev => prev.map(e => e.id === ex.id ? { ...e, category: categoryId } : e))
    setEditingCat(null)
    try {
      await api.updateExercise(ex.id, { category: categoryId })
    } catch {
      // Revert on failure
      setExercises(prev => prev.map(e => e.id === ex.id ? { ...e, category: ex.category } : e))
    }
  }

  const handleCreate = async () => {
    const name = (newName.trim() || query.trim())
    if (!name) return
    try {
      const ex = await api.createExercise(name, newType, newCategory)
      onSelect(ex)
    } catch (e) { alert(e.message) }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query && !exactMatch) {
      setNewName(query)
      setCreating(true)
    }
  }

  const rowProps = (ex) => ({
    ex,
    onSelect,
    fav: favs.has(ex.id),
    onToggleFav: toggleFav,
    editingCat,
    setEditingCat,
    onSetCategory: handleSetCategory,
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div
        className="relative w-full bg-slate-800 rounded-t-3xl flex flex-col overflow-hidden"
        style={{ height: modalHeight, transition: 'height 180ms ease-out' }}
      >
        {/* Handle + header */}
        <div className="flex-shrink-0">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-slate-600 rounded-full" />
          </div>
          <div className="px-4 pt-1 pb-2 flex items-center justify-between">
            <h2 className="text-white font-semibold text-base leading-tight">
              Selecciona el ejercicio
            </h2>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-1 pb-2">
          {loading ? (
            <div className="space-y-2 pt-2 px-1">
              {[1,2,3,4].map(i => <div key={i} className="h-12 bg-slate-700 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <>
              {/* ── Searching: flat list ── */}
              {query ? (
                <>
                  {filtered.map(ex => <ExRow key={ex.id} {...rowProps(ex)} />)}
                  {!exactMatch && !creating && (
                    <button
                      onClick={() => { setNewName(query); setCreating(true) }}
                      className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl border border-dashed border-indigo-500/50 hover:border-indigo-500 hover:bg-indigo-500/10 transition-colors text-left mt-1"
                    >
                      <Plus size={18} className="text-indigo-400" />
                      <span className="text-indigo-400 font-medium">Crear "{query}"</span>
                    </button>
                  )}
                </>
              ) : (
                <>
                  {/* ── Favoritos ── */}
                  {favList.length > 0 && (
                    <>
                      <SectionHeader label={`⭐ Favoritos`} />
                      {favList.map(ex => <ExRow key={ex.id} {...rowProps(ex)} />)}
                    </>
                  )}

                  {/* ── Por categoría ── */}
                  {CATEGORIES.map(cat => {
                    const exs = grouped.get(cat.id)
                    if (!exs?.length) return null
                    return (
                      <div key={cat.id}>
                        <SectionHeader label={cat.label} />
                        {exs.map(ex => <ExRow key={ex.id} {...rowProps(ex)} />)}
                      </div>
                    )
                  })}

                  {/* ── Sin categoría ── */}
                  {grouped.get('__none')?.length > 0 && (
                    <>
                      {(favList.length > 0 || CATEGORIES.some(c => grouped.has(c.id))) && (
                        <SectionHeader label="Sin categoría" />
                      )}
                      {grouped.get('__none').map(ex => <ExRow key={ex.id} {...rowProps(ex)} />)}
                    </>
                  )}

                  {exercises.length === 0 && (
                    <p className="text-center text-slate-500 text-sm py-8">
                      Aún no hay ejercicios.<br />Escribe uno para crearlo.
                    </p>
                  )}
                </>
              )}

              {/* ── Crear ejercicio form ── */}
              {creating && (
                <div className="bg-slate-700 rounded-xl p-4 space-y-3 mt-2">
                  <p className="text-white font-semibold text-sm">
                    Nuevo: <span className="text-indigo-400">{newName}</span>
                  </p>

                  <div>
                    <p className="text-slate-400 text-xs mb-2">Tipo</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setNewType('reps')}
                        className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${newType === 'reps' ? 'bg-indigo-600 text-white' : 'bg-slate-600 text-slate-300'}`}
                      >
                        <Dumbbell size={14} className="inline mr-1.5" />
                        Peso + Reps
                      </button>
                      <button
                        onClick={() => setNewType('time')}
                        className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${newType === 'time' ? 'bg-amber-600 text-white' : 'bg-slate-600 text-slate-300'}`}
                      >
                        <Clock size={14} className="inline mr-1.5" />
                        Tiempo
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-slate-400 text-xs mb-2">Grupo muscular <span className="text-slate-600">(opcional)</span></p>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIES.map(c => (
                        <button
                          key={c.id}
                          onClick={() => setNewCategory(newCategory === c.id ? null : c.id)}
                          className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                            newCategory === c.id ? 'bg-indigo-600 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setCreating(false); setNewCategory(null) }}
                      className="py-2.5 bg-slate-600 text-slate-300 rounded-xl text-sm"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCreate}
                      className="py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold"
                    >
                      Crear
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Search — pinned at bottom */}
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
