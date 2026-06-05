import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

const THRESHOLD  = 72    // px to trigger refresh
const MAX_PULL   = 108   // max visual pull distance
const RESISTANCE = 0.45  // dampen the pull (feels natural)

/**
 * Pull-to-refresh wrapper.
 *
 * Props:
 *   onRefresh  – async function called when user releases past THRESHOLD
 *   scrollRef  – ref to the actual scrollable element (to check scrollTop)
 *   children   – content to wrap (must include the scrollable element)
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
      if (scrollEl && scrollEl.scrollTop > 4) return   // not at top → ignore
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
      const pull = Math.min(dy * RESISTANCE, MAX_PULL)
      update(pull, pull >= THRESHOLD ? 'ready' : 'pulling')
    }

    const onEnd = async () => {
      if (!activeRef.current) return
      activeRef.current = false
      if (phaseRef.current === 'ready') {
        update(THRESHOLD, 'refreshing')
        try { await onRefresh() } catch {}
        update(0, 'idle')
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
  const indicY   = pullY - 36    // starts at -36 (hidden above), at full pull = 36
  const rotation = phase === 'ready' ? 180 : Math.min((pullY / THRESHOLD) * 180, 180)
  const opacity  = Math.min(pullY / 18, 1)

  return (
    <div ref={wrapRef} style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>

      {/* ── Pull indicator ── */}
      <div style={{
        position:      'absolute',
        top:           `${indicY}px`,
        left:          '50%',
        transform:     'translateX(-50%)',
        opacity,
        zIndex:        10,
        pointerEvents: 'none',
        transition:    isIdle ? 'top 280ms cubic-bezier(0.34,1.2,0.64,1), opacity 200ms' : 'none',
      }}>
        {phase === 'refreshing' ? (
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 shadow-xl flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 shadow-xl flex items-center justify-center">
            <ChevronDown
              size={18}
              className="text-slate-400"
              style={{
                transform:  `rotate(${rotation}deg)`,
                transition: phase === 'ready' ? 'transform 200ms' : 'none',
              }}
            />
          </div>
        )}
      </div>

      {/* ── Content pushed down while pulling ── */}
      <div style={{
        transform:  `translateY(${pullY}px)`,
        transition: isIdle ? 'transform 280ms cubic-bezier(0.34,1.2,0.64,1)' : 'none',
        height:     '100%',
      }}>
        {children}
      </div>

    </div>
  )
}
