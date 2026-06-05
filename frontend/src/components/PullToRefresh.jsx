import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

const THRESHOLD  = 70    // px to trigger refresh
const RESISTANCE = 0.42  // dampen the pull

/**
 * Pull-to-refresh overlay — content stays fixed, only the indicator appears.
 *
 * Props:
 *   onRefresh  – async fn called when user releases past THRESHOLD
 *   scrollRef  – ref to the scrollable element (to check scrollTop)
 *   children   – content (NOT translated during pull)
 */
export default function PullToRefresh({ onRefresh, scrollRef, children }) {
  const [pullY, setPullY] = useState(0)
  const [phase, setPhase] = useState('idle')  // idle | pulling | ready | refreshing

  const pullRef   = useRef(0)
  const phaseRef  = useRef('idle')
  const startYRef = useRef(0)
  const activeRef = useRef(false)
  const wrapRef   = useRef(null)

  const update = (y, p) => {
    pullRef.current  = y; setPullY(y)
    phaseRef.current = p; setPhase(p)
  }

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    const onStart = (e) => {
      const scrollEl = scrollRef?.current
      if (scrollEl && scrollEl.scrollTop > 4) return
      startYRef.current = e.touches[0].clientY
      activeRef.current = true
    }

    const onMove = (e) => {
      if (!activeRef.current) return
      const scrollEl = scrollRef?.current
      if (scrollEl && scrollEl.scrollTop > 4) { activeRef.current = false; return }
      const dy = e.touches[0].clientY - startYRef.current
      if (dy <= 0) { activeRef.current = false; return }
      e.preventDefault()
      const pull = Math.min(dy * RESISTANCE, THRESHOLD * 1.4)
      update(pull, pull >= THRESHOLD ? 'ready' : 'pulling')
    }

    const onEnd = async () => {
      if (!activeRef.current) return
      activeRef.current = false
      if (phaseRef.current === 'ready') {
        update(THRESHOLD, 'refreshing')
        // onRefresh may call window.location.reload() — page unmounts before Promise resolves
        try { await onRefresh() } catch {}
        update(0, 'idle')  // only reached if onRefresh resolves (non-reload case)
      } else {
        update(0, 'idle')
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true  })
    el.addEventListener('touchmove',  onMove,  { passive: false })
    el.addEventListener('touchend',   onEnd,   { passive: true  })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove',  onMove)
      el.removeEventListener('touchend',   onEnd)
    }
  }, [onRefresh, scrollRef])

  const isIdle   = phase === 'idle'
  // Indicator slides from -36px (hidden above) to +14px (visible) as pull increases
  const indicY   = Math.min((pullY / THRESHOLD) * 50 - 36, 14)
  const opacity  = isIdle ? 0 : Math.min(pullY / 16, 1)
  const rotation = phase === 'ready' ? 180 : Math.min((pullY / THRESHOLD) * 180, 180)

  return (
    <div ref={wrapRef} style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>

      {/* ── Pull indicator — floats above content, content never moves ── */}
      <div style={{
        position:      'absolute',
        top:           `${isIdle ? -36 : indicY}px`,
        left:          '50%',
        transform:     'translateX(-50%)',
        opacity,
        zIndex:        20,
        pointerEvents: 'none',
        transition:    isIdle
          ? 'top 260ms cubic-bezier(0.4,0,0.2,1), opacity 200ms'
          : 'none',
      }}>
        {phase === 'refreshing' ? (
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 shadow-lg flex items-center justify-center">
            <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 shadow-lg flex items-center justify-center">
            <ChevronDown
              size={16}
              className="text-slate-400"
              style={{
                transform:  `rotate(${rotation}deg)`,
                transition: phase === 'ready' ? 'transform 180ms' : 'none',
              }}
            />
          </div>
        )}
      </div>

      {/* ── Content — never translated ── */}
      <div style={{ height: '100%' }}>
        {children}
      </div>

    </div>
  )
}
