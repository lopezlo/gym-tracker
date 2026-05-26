import dayjs from 'dayjs'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function CalendarHeatmap({ data }) {
  const [tooltip, setTooltip] = useState(null)
  const currentYear = dayjs().year()
  const [year, setYear] = useState(currentYear)

  // Normalize date keys
  const dataMap = Object.fromEntries(data.map(d => [String(d.date).substring(0, 10), d]))

  const today = dayjs()
  const yearStart = dayjs(`${year}-01-01`)
  const yearEnd = year === currentYear ? today : dayjs(`${year}-12-31`)

  // Start grid from the Sunday on or before Jan 1
  const gridStart = yearStart.subtract(yearStart.day(), 'day')

  const weeks = []
  let current = gridStart
  while (current.isBefore(yearEnd) || current.format('YYYY-MM-DD') === yearEnd.format('YYYY-MM-DD')) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const isBeforeStart = current.isBefore(yearStart)
      const isAfterEnd = current.isAfter(yearEnd)
      week.push(isBeforeStart || isAfterEnd ? null : current.format('YYYY-MM-DD'))
      current = current.add(1, 'day')
    }
    weeks.push(week)
  }

  // Max minutes for the displayed year only (relative intensity)
  const yearDataVals = data
    .filter(d => String(d.date).substring(0, 4) === String(year))
    .map(d => d.total_minutes)
  const maxMinutes = Math.max(...yearDataVals, 1)

  const colorFor = (date) => {
    if (!date) return 'bg-transparent'
    const entry = dataMap[date]
    if (!entry) return 'bg-slate-700/60'
    if (!entry.total_minutes || entry.total_minutes === 0) return 'bg-indigo-700'
    const intensity = entry.total_minutes / maxMinutes
    if (intensity < 0.25) return 'bg-indigo-800'
    if (intensity < 0.5)  return 'bg-indigo-600'
    if (intensity < 0.75) return 'bg-indigo-500'
    return 'bg-indigo-400'
  }

  const monthLabels = () => {
    const labels = []
    let lastMonth = null
    weeks.forEach((week, i) => {
      const firstDay = week.find(d => d !== null)
      if (!firstDay) return
      const m = dayjs(firstDay).format('MMM')
      if (m !== lastMonth) { labels.push({ i, label: m }); lastMonth = m }
    })
    return labels
  }

  const fmtTime = (mins) => {
    if (!mins) return ''
    if (mins < 60) return `${mins} min`
    return `${Math.floor(mins / 60)}h ${mins % 60}m`
  }

  return (
    <div className="relative select-none">
      {/* Year navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setYear(y => y - 1)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
          aria-label="Año anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-slate-300 font-semibold text-sm">{year}</span>
        <button
          onClick={() => setYear(y => y + 1)}
          disabled={year >= currentYear}
          className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Año siguiente"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Month labels */}
      <div className="flex mb-1 relative h-4">
        {monthLabels().map(({ i, label }) => (
          <span
            key={`${i}-${label}`}
            className="absolute text-[10px] text-slate-500 capitalize"
            style={{ left: `${(i / weeks.length) * 100}%` }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="flex gap-[3px]">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px] flex-1">
            {week.map((date, di) => {
              const entry = date ? dataMap[date] : null
              return (
                <div
                  key={di}
                  className={`aspect-square rounded-[3px] ${colorFor(date)} transition-colors cursor-default`}
                  onMouseEnter={() => date && setTooltip({ date, entry })}
                  onMouseLeave={() => setTooltip(null)}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-700 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-10 pointer-events-none shadow-xl">
          <p className="font-semibold">{dayjs(tooltip.date).format('D MMM YYYY')}</p>
          {tooltip.entry ? (
            <p className="text-slate-300">
              {tooltip.entry.session_count} sesión{tooltip.entry.session_count > 1 ? 'es' : ''}
              {tooltip.entry.total_minutes > 0 && ` · ${fmtTime(tooltip.entry.total_minutes)}`}
            </p>
          ) : (
            <p className="text-slate-400">Sin entreno</p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-2 justify-end">
        <span className="text-[10px] text-slate-500">Menos</span>
        {['bg-slate-700/60', 'bg-indigo-900', 'bg-indigo-700', 'bg-indigo-500', 'bg-indigo-400'].map(c => (
          <div key={c} className={`w-2.5 h-2.5 rounded-[2px] ${c}`} />
        ))}
        <span className="text-[10px] text-slate-500">Más</span>
      </div>
    </div>
  )
}
