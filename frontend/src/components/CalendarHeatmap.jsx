import dayjs from 'dayjs'
import { useState } from 'react'

const WEEKS = 26

export default function CalendarHeatmap({ data }) {
  const [tooltip, setTooltip] = useState(null)

  const dataMap = Object.fromEntries(data.map(d => [d.date, d]))

  const today = dayjs()
  const startDate = today.subtract(WEEKS * 7 - 1, 'day')

  // Build weeks array (columns)
  const weeks = []
  let current = startDate
  while (current.isBefore(today) || current.isSame(today, 'day')) {
    const week = []
    for (let d = 0; d < 7; d++) {
      if (current.isAfter(today)) { week.push(null); current = current.add(1, 'day'); continue }
      week.push(current.format('YYYY-MM-DD'))
      current = current.add(1, 'day')
    }
    weeks.push(week)
  }

  const maxMinutes = Math.max(...data.map(d => d.total_minutes), 1)

  const colorFor = (date) => {
    if (!date) return 'bg-slate-900'
    const entry = dataMap[date]
    if (!entry) return 'bg-slate-700/60'
    const intensity = entry.total_minutes / maxMinutes
    if (intensity < 0.25) return 'bg-indigo-900'
    if (intensity < 0.5) return 'bg-indigo-700'
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
