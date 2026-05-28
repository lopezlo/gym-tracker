import { useState, useEffect, useMemo, useRef } from 'react'

// Module-level cache: persists across React re-mounts (navigation) within the same page session
const _sessionsCache = {}
import {
  ChevronDown, ChevronUp, Edit2, Check, X, Clock, Dumbbell,
  Trash2, ChevronRight, MoreHorizontal, GripVertical,
} from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { api } from '../api/client'
import ConfirmModal from './ConfirmModal'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
dayjs.locale('es')

function groupByExercise(sets) {
  const map = {}
  sets.forEach(s => {
    if (!map[s.exercise_id]) map[s.exercise_id] = { exercise_id: s.exercise_id, name: s.exercise_name, type: s.exercise_type, sets: [] }
    map[s.exercise_id].sets.push(s)
  })
  return Object.values(map)
}

function fmtSetLabel(s) {
  if (s.exercise_type === 'time') {
    if (!s.duration) return '—'
    const mins = s.duration / 60
    return `${Number.isInteger(mins) ? mins : mins.toFixed(1)} min`
  }
  const parts = []
  if (s.weight != null) parts.push(`${s.weight}kg`)
  if (s.reps != null) parts.push(`×${s.reps}`)
  return parts.join(' ') || '—'
}

const toUTC = (str) => str ? new Date(/Z$|[+-]\d{2}/.test(str) ? str : str.replace(' ', 'T') + 'Z') : null

function fmtSessionDuration(s) {
  if (!s.started_at || !s.ended_at) return null
  const mins = Math.round((toUTC(s.ended_at) - toUTC(s.started_at)) / 60000)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? `${mins % 60}m` : ''}`
}

const pad = (n) => String(n).padStart(2, '0')

function toLocalDatetime(utcStr) {
  if (!utcStr) return { date: '', time: '' }
  const d = toUTC(utcStr)
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

function toUTCString(dateStr, timeStr) {
  const [y, mo, day] = dateStr.split('-').map(Number)
  const [h, m] = (timeStr || '00:00').split(':').map(Number)
  const d = new Date(y, mo - 1, day, h, m, 0)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00`
}

// ── Sortable wrappers ──────────────────────────────────────────────────────────

function SortableExerciseGroup({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    // Transform on the outer wrapper → entire group (header + sets) moves as a unit
    // setNodeRef passed to children so it lands on the HEADER ONLY →
    // dnd-kit measures just the header for collision detection (avoids tall-block confusion)
    <div
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity:  isDragging ? 0.4 : 1,
        position: 'relative',
        zIndex:   isDragging ? 10 : 1,
      }}
    >
      {children({ dragHandleProps: { ...attributes, ...listeners }, headerRef: setNodeRef })}
    </div>
  )
}

function SortableSetRow({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      {children({ dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function SessionHistoryList({ userId, onDataChanged }) {
  const [sessions, setSessions] = useState(() => _sessionsCache[userId] ?? [])
  const [expanded, setExpanded] = useState(null)
  const [details, setDetails] = useState({})
  const [editingSet, setEditingSet] = useState(null)
  const [editValues, setEditValues] = useState({})
  const [editingSession, setEditingSession] = useState(null)
  const [sessionEditValues, setSessionEditValues] = useState({})
  const [confirmModal, setConfirmModal] = useState(null)
  const [loading, setLoading] = useState(!_sessionsCache[userId])
  const [expandedYears, setExpandedYears] = useState(() => new Set([new Date().getFullYear()]))
  const [openMenu, setOpenMenu] = useState(null) // 'session_123' | 'set_456' | null

  // DnD sensors — PointerSensor covers both mouse and touch
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const load = () => {
    api.getSessions(userId, 5000)
      .then(data => {
        _sessionsCache[userId] = data
        setSessions(data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [userId])

  // Close any open menu on outside tap
  useEffect(() => {
    if (!openMenu) return
    const close = () => setOpenMenu(null)
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [openMenu])

  const toggleExpand = async (id) => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (!details[id]) {
      const d = await api.getSession(id)
      setDetails(prev => ({ ...prev, [id]: d }))
    }
  }

  // ── Set editing ──────────────────────────────────────────────────────────────

  const startEdit = (set) => {
    setEditingSet(set.id)
    setOpenMenu(null)
    const d = toUTC(set.recorded_at)
    setEditValues({
      weight: set.weight != null ? String(set.weight) : '',
      reps: set.reps != null ? String(set.reps) : '',
      duration: set.duration != null ? String(set.duration / 60) : '',
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    })
  }

  const saveEdit = async (set) => {
    try {
      let recorded_at
      if (editValues.time) {
        const base = toUTC(set.recorded_at)
        const [h, m] = editValues.time.split(':').map(Number)
        const local = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0)
        recorded_at = `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())} ${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:00`
      }
      const updated = await api.updateSet(set.id, {
        weight: editValues.weight !== '' ? parseFloat(editValues.weight) : null,
        reps: editValues.reps !== '' ? parseInt(editValues.reps) : null,
        duration: editValues.duration !== '' ? Math.round(parseFloat(editValues.duration) * 60) : null,
        ...(recorded_at ? { recorded_at } : {}),
      })
      setDetails(prev => ({
        ...prev,
        [set.session_id]: {
          ...prev[set.session_id],
          sets: prev[set.session_id].sets.map(s => s.id === set.id ? updated : s),
        },
      }))
      setEditingSet(null)
      onDataChanged?.()
    } catch (e) { alert(e.message) }
  }

  const deleteSet = async (set) => {
    await api.deleteSet(set.session_id, set.id)
    setDetails(prev => ({
      ...prev,
      [set.session_id]: {
        ...prev[set.session_id],
        sets: prev[set.session_id].sets.filter(s => s.id !== set.id),
      },
    }))
    setSessions(prev => prev.map(s => s.id === set.session_id
      ? { ...s, set_count: s.set_count - 1 }
      : s
    ))
    onDataChanged?.()
  }

  // ── Session editing ──────────────────────────────────────────────────────────

  const startSessionEdit = (session) => {
    const { date, time: startTime } = toLocalDatetime(session.started_at)
    const { time: endTime } = session.ended_at ? toLocalDatetime(session.ended_at) : { time: '' }
    setSessionEditValues({ date, startTime, endTime })
    setEditingSession(session.id)
    setOpenMenu(null)
  }

  const saveSessionEdit = async (session) => {
    const { date, startTime, endTime } = sessionEditValues
    const started_at = toUTCString(date, startTime)
    const ended_at = session.ended_at && endTime ? toUTCString(date, endTime) : undefined
    try {
      const updated = await api.updateSession(session.id, { started_at, ...(ended_at ? { ended_at } : {}) })
      setSessions(prev => prev.map(s => s.id === session.id
        ? { ...s, started_at: updated.started_at, ended_at: updated.ended_at, edited_at: updated.edited_at }
        : s
      ))
      setEditingSession(null)
      onDataChanged?.()
    } catch (e) { alert(e.message) }
  }

  const deleteSession = async (sessionId) => {
    await api.deleteSession(sessionId)
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    if (expanded === sessionId) setExpanded(null)
    setDetails(prev => { const d = { ...prev }; delete d[sessionId]; return d })
    onDataChanged?.()
  }

  // ── Drag-to-reorder ──────────────────────────────────────────────────────────

  const handleGroupDragEnd = (sessionId) => (event) => {
    const { active, over } = event
    if (!active || !over || active.id === over.id) return
    const session = details[sessionId]
    if (!session) return
    const groups = groupByExercise(session.sets)
    const oldIndex = groups.findIndex(g => `group-${g.exercise_id}` === active.id)
    const newIndex = groups.findIndex(g => `group-${g.exercise_id}` === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const newGroups = arrayMove(groups, oldIndex, newIndex)
    const newFlatSets = newGroups.flatMap(g => g.sets)
    const newSetIds = newFlatSets.map(s => s.id)
    // Optimistic update
    const prevSets = session.sets
    setDetails(prev => ({ ...prev, [sessionId]: { ...prev[sessionId], sets: newFlatSets } }))
    api.reorderSets(sessionId, newSetIds).catch(() => {
      setDetails(prev => ({ ...prev, [sessionId]: { ...prev[sessionId], sets: prevSets } }))
    })
  }

  const handleSetDragEnd = (sessionId, exerciseId) => (event) => {
    const { active, over } = event
    if (!active || !over || active.id === over.id) return
    const session = details[sessionId]
    if (!session) return
    const flatSets = session.sets
    const groupPositions = flatSets.map((s, i) => s.exercise_id === exerciseId ? i : -1).filter(i => i >= 0)
    const groupSets = groupPositions.map(i => flatSets[i])
    const oldIdx = groupSets.findIndex(s => s.id === active.id)
    const newIdx = groupSets.findIndex(s => s.id === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    const newGroupSets = arrayMove(groupSets, oldIdx, newIdx)
    const newFlatSets = [...flatSets]
    groupPositions.forEach((pos, i) => { newFlatSets[pos] = newGroupSets[i] })
    const newSetIds = newFlatSets.map(s => s.id)
    const prevSets = flatSets
    setDetails(prev => ({ ...prev, [sessionId]: { ...prev[sessionId], sets: newFlatSets } }))
    api.reorderSets(sessionId, newSetIds).catch(() => {
      setDetails(prev => ({ ...prev, [sessionId]: { ...prev[sessionId], sets: prevSets } }))
    })
  }

  // ── Year grouping ────────────────────────────────────────────────────────────

  const sessionsByYear = useMemo(() => {
    const map = {}
    sessions.forEach(s => {
      const yr = toUTC(s.started_at).getFullYear()
      if (!map[yr]) map[yr] = []
      map[yr].push(s)
    })
    return Object.entries(map)
      .map(([yr, list]) => ({ year: parseInt(yr), sessions: list }))
      .sort((a, b) => b.year - a.year)
  }, [sessions])

  const toggleYear = (yr) => {
    setExpandedYears(prev => {
      const next = new Set(prev)
      if (next.has(yr)) next.delete(yr)
      else next.add(yr)
      return next
    })
  }

  if (loading) return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => <div key={i} className="h-16 skeleton rounded-2xl" />)}
    </div>
  )

  if (sessions.length === 0) return (
    <p className="text-center text-slate-500 text-sm py-6">Aún no hay sesiones registradas.</p>
  )

  return (
    <>
      <div className="space-y-4">
        {sessionsByYear.map(({ year: yr, sessions: yearSessions }) => {
          const isExpanded = expandedYears.has(yr)
          return (
            <div key={yr}>
              {/* Year header */}
              <button
                onClick={() => toggleYear(yr)}
                className="w-full flex items-center gap-2 px-1 py-1.5 mb-2 group"
              >
                <ChevronRight
                  size={14}
                  className={`text-slate-500 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                />
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{yr}</span>
                <span className="text-slate-600 text-xs ml-1">
                  {yearSessions.length} sesión{yearSessions.length !== 1 ? 'es' : ''}
                </span>
                <div className="flex-1 h-px bg-slate-800 ml-2" />
              </button>

              {/* Sessions for this year */}
              {isExpanded && (
                <div className="space-y-2">
                  {yearSessions.map((session, idx) => {
                    const isOpen = expanded === session.id
                    const isEditingThis = editingSession === session.id
                    const detail = details[session.id]
                    const groups = detail ? groupByExercise(detail.sets) : []
                    const dur = fmtSessionDuration(session)
                    const sessionMenuKey = `session_${session.id}`

                    return (
                      <div
                        key={session.id}
                        className="bg-slate-800 rounded-2xl row-in"
                        style={{ animationDelay: `${Math.min(idx, 5) * 45}ms` }}
                      >
                        {/* Session header — edit mode */}
                        {isEditingThis ? (
                          <div className="p-4 space-y-3">
                            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Editar sesión</p>
                            <div className="space-y-2">
                              <div>
                                <label className="text-xs text-slate-400 block mb-1">Fecha</label>
                                <input
                                  type="date"
                                  value={sessionEditValues.date}
                                  onChange={e => setSessionEditValues(v => ({ ...v, date: e.target.value }))}
                                  className="w-full bg-slate-700 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-xs text-slate-400 block mb-1">Inicio</label>
                                  <input
                                    type="time"
                                    value={sessionEditValues.startTime}
                                    onChange={e => setSessionEditValues(v => ({ ...v, startTime: e.target.value }))}
                                    className="w-full bg-slate-700 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                  />
                                </div>
                                {session.ended_at && (
                                  <div>
                                    <label className="text-xs text-slate-400 block mb-1">Fin</label>
                                    <input
                                      type="time"
                                      value={sessionEditValues.endTime}
                                      onChange={e => setSessionEditValues(v => ({ ...v, endTime: e.target.value }))}
                                      className="w-full bg-slate-700 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingSession(null)}
                                className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm font-medium transition-colors"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => saveSessionEdit(session)}
                                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors"
                              >
                                Guardar
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Session header — normal mode */
                          <div className="flex items-center">
                            <button
                              onClick={() => toggleExpand(session.id)}
                              className="flex-1 flex items-center justify-between px-4 py-3.5 text-left min-w-0"
                            >
                              <div className="min-w-0">
                                <p className="text-white font-semibold text-sm capitalize">
                                  {dayjs(toUTC(session.started_at)).format('ddd D MMM YYYY')}
                                  {session.edited_at && <span className="text-slate-600 text-xs font-normal ml-2">editado</span>}
                                </p>
                                <p className="text-slate-500 text-xs mt-0.5">
                                  {session.exercise_count} ejercicio{session.exercise_count !== 1 ? 's' : ''}
                                  {' · '}{session.set_count} serie{session.set_count !== 1 ? 's' : ''}
                                  {dur && ` · ${dur}`}
                                  {!session.ended_at && <span className="text-amber-400 ml-1">• en curso</span>}
                                </p>
                              </div>
                              {isOpen
                                ? <ChevronUp size={16} className="text-slate-500 flex-shrink-0 ml-2" />
                                : <ChevronDown size={16} className="text-slate-500 flex-shrink-0 ml-2" />}
                            </button>

                            {/* ⋯ Session menu */}
                            <div
                              className="relative flex-shrink-0 pr-2"
                              onPointerDown={e => e.stopPropagation()}
                            >
                              <button
                                onClick={e => { e.stopPropagation(); setOpenMenu(prev => prev === sessionMenuKey ? null : sessionMenuKey) }}
                                className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
                              >
                                <MoreHorizontal size={16} />
                              </button>
                              {openMenu === sessionMenuKey && (
                                <div className="absolute right-0 top-full mt-1 bg-slate-700 border border-slate-600 rounded-xl shadow-xl z-30 overflow-hidden min-w-[130px]">
                                  <button
                                    onPointerDown={e => e.stopPropagation()}
                                    onClick={() => startSessionEdit(session)}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-600 hover:text-white transition-colors"
                                  >
                                    <Edit2 size={13} />
                                    Editar
                                  </button>
                                  <button
                                    onPointerDown={e => e.stopPropagation()}
                                    onClick={() => {
                                      setOpenMenu(null)
                                      setConfirmModal({
                                        title: `¿Eliminar sesión del ${dayjs(toUTC(session.started_at)).format('D MMM')}?`,
                                        message: 'Se eliminarán todas las series de esta sesión.',
                                        confirmLabel: 'Eliminar',
                                        danger: true,
                                        onConfirm: () => { setConfirmModal(null); deleteSession(session.id) },
                                      })
                                    }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                  >
                                    <Trash2 size={13} />
                                    Eliminar
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Expanded sets */}
                        {isOpen && !isEditingThis && (
                          <div className="px-4 pb-4 border-t border-slate-700/50 pt-3 space-y-4">
                            {!detail ? (
                              <div className="h-10 bg-slate-700 rounded-xl animate-pulse" />
                            ) : groups.length === 0 ? (
                              <p className="text-slate-500 text-xs">Sin series registradas.</p>
                            ) : (
                              /* Exercise group drag context */
                              <DndContext
                                id={`exercises-${session.id}`}
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleGroupDragEnd(session.id)}
                              >
                                <SortableContext
                                  items={groups.map(g => `group-${g.exercise_id}`)}
                                  strategy={verticalListSortingStrategy}
                                >
                                  <div className="space-y-4">
                                    {groups.map(group => (
                                      <SortableExerciseGroup key={group.exercise_id} id={`group-${group.exercise_id}`}>
                                        {({ dragHandleProps, headerRef }) => (
                                          <div>
                                            {/* Group header — ref here so dnd-kit only measures the header */}
                                            <div ref={headerRef} className="flex items-center gap-2 mb-2">
                                              <button
                                                {...dragHandleProps}
                                                className="text-slate-700 hover:text-slate-500 transition-colors cursor-grab active:cursor-grabbing touch-none"
                                                aria-label="Reordenar ejercicio"
                                              >
                                                <GripVertical size={13} />
                                              </button>
                                              {group.type === 'time'
                                                ? <Clock size={13} className="text-amber-400" />
                                                : <Dumbbell size={13} className="text-indigo-400" />}
                                              <span className="text-slate-300 text-xs font-semibold uppercase tracking-wide flex-1">{group.name}</span>
                                            </div>

                                            {/* Set rows drag context */}
                                            <DndContext
                                              id={`sets-${session.id}-${group.exercise_id}`}
                                              sensors={sensors}
                                              collisionDetection={closestCenter}
                                              onDragEnd={handleSetDragEnd(session.id, group.exercise_id)}
                                            >
                                              <SortableContext
                                                items={group.sets.map(s => s.id)}
                                                strategy={verticalListSortingStrategy}
                                              >
                                                <div className="space-y-1.5">
                                                  {group.sets.map((set, i) => (
                                                    <SortableSetRow key={set.id} id={set.id}>
                                                      {({ dragHandleProps: setDragProps }) => (
                                                        <div>
                                                          {editingSet === set.id ? (
                                                            <div className="flex items-center gap-2 bg-slate-700 rounded-xl px-3 py-2">
                                                              {set.exercise_type !== 'time' ? (
                                                                <>
                                                                  <input
                                                                    type="number" inputMode="decimal"
                                                                    value={editValues.weight}
                                                                    onChange={e => setEditValues(p => ({ ...p, weight: e.target.value }))}
                                                                    placeholder="kg"
                                                                    className="w-14 bg-slate-600 text-white text-xs rounded-lg px-2 py-1.5 outline-none text-center"
                                                                  />
                                                                  <span className="text-slate-500 text-xs">×</span>
                                                                  <input
                                                                    type="number" inputMode="numeric"
                                                                    value={editValues.reps}
                                                                    onChange={e => setEditValues(p => ({ ...p, reps: e.target.value }))}
                                                                    placeholder="reps"
                                                                    className="w-12 bg-slate-600 text-white text-xs rounded-lg px-2 py-1.5 outline-none text-center"
                                                                  />
                                                                </>
                                                              ) : (
                                                                <input
                                                                  type="number" inputMode="decimal"
                                                                  value={editValues.duration}
                                                                  onChange={e => setEditValues(p => ({ ...p, duration: e.target.value }))}
                                                                  placeholder="min" step="0.5"
                                                                  className="w-16 bg-slate-600 text-white text-xs rounded-lg px-2 py-1.5 outline-none text-center"
                                                                />
                                                              )}
                                                              <span className="text-slate-500 text-xs ml-1">@</span>
                                                              <input
                                                                type="time"
                                                                value={editValues.time}
                                                                onChange={e => setEditValues(p => ({ ...p, time: e.target.value }))}
                                                                className="w-20 bg-slate-600 text-white text-xs rounded-lg px-2 py-1.5 outline-none text-center"
                                                              />
                                                              <button onClick={() => saveEdit(set)} className="ml-auto p-1.5 bg-emerald-600 rounded-lg text-white">
                                                                <Check size={12} />
                                                              </button>
                                                              <button onClick={() => setEditingSet(null)} className="p-1.5 bg-slate-600 rounded-lg text-slate-300">
                                                                <X size={12} />
                                                              </button>
                                                            </div>
                                                          ) : (
                                                            <div className="flex items-center gap-1.5 px-1 py-0.5 rounded-lg">
                                                              {/* Set drag handle */}
                                                              <button
                                                                {...setDragProps}
                                                                className="text-slate-700 hover:text-slate-500 transition-colors cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
                                                                aria-label="Reordenar serie"
                                                              >
                                                                <GripVertical size={12} />
                                                              </button>
                                                              <span className="text-slate-600 text-xs w-4 text-right flex-shrink-0">{i + 1}</span>
                                                              <span className="text-slate-300 font-mono text-sm flex-1">{fmtSetLabel(set)}</span>
                                                              <span className="text-slate-600 text-xs">{dayjs(toUTC(set.recorded_at)).format('HH:mm')}</span>
                                                              {set.edited_at && <span className="text-slate-600 text-xs">editado</span>}

                                                              {/* ⋯ Set menu */}
                                                              <div
                                                                className="relative flex-shrink-0"
                                                                onPointerDown={e => e.stopPropagation()}
                                                              >
                                                                <button
                                                                  onClick={e => { e.stopPropagation(); setOpenMenu(prev => prev === `set_${set.id}` ? null : `set_${set.id}`) }}
                                                                  className="p-1 rounded-lg text-slate-600 hover:text-white hover:bg-slate-700 transition-colors"
                                                                >
                                                                  <MoreHorizontal size={14} />
                                                                </button>
                                                                {openMenu === `set_${set.id}` && (
                                                                  <div className="absolute right-0 bottom-full mb-1 bg-slate-700 border border-slate-600 rounded-xl shadow-xl z-30 overflow-hidden min-w-[110px]">
                                                                    <button
                                                                      onPointerDown={e => e.stopPropagation()}
                                                                      onClick={() => startEdit(set)}
                                                                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-600 hover:text-white transition-colors"
                                                                    >
                                                                      <Edit2 size={12} />
                                                                      Editar
                                                                    </button>
                                                                    <button
                                                                      onPointerDown={e => e.stopPropagation()}
                                                                      onClick={() => {
                                                                        setOpenMenu(null)
                                                                        setConfirmModal({
                                                                          title: '¿Eliminar serie?',
                                                                          danger: true,
                                                                          confirmLabel: 'Eliminar',
                                                                          onConfirm: () => { setConfirmModal(null); deleteSet(set) },
                                                                        })
                                                                      }}
                                                                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                                                                    >
                                                                      <Trash2 size={12} />
                                                                      Eliminar
                                                                    </button>
                                                                  </div>
                                                                )}
                                                              </div>
                                                            </div>
                                                          )}
                                                        </div>
                                                      )}
                                                    </SortableSetRow>
                                                  ))}
                                                </div>
                                              </SortableContext>
                                            </DndContext>
                                          </div>
                                        )}
                                      </SortableExerciseGroup>
                                    ))}
                                  </div>
                                </SortableContext>
                              </DndContext>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          danger={confirmModal.danger}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </>
  )
}
