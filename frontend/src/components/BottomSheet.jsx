import { useRef, useEffect, useCallback } from 'react'

/**
 * Reusable animated bottom-sheet.
 *
 * Entry  : slides up from below with a spring overshoot (~elastic).
 * Dismiss: slide-down exit animation, then calls onClose.
 * Handle : drag the pill to dismiss. Small drags rubber-band back.
 *
 * Props
 *   onClose   – called after exit animation completes
 *   locked    – disable drag + backdrop tap (e.g. during async op)
 *   className – extra classes added to the panel (e.g. "max-h-[82vh] flex flex-col")
 *   children  – render prop: ({ dismiss }) => JSX
 *               OR plain JSX (dismiss not available to children in that case)
 */
export default function BottomSheet({ onClose, locked = false, className = '', children }) {
  const sheetRef    = useRef(null)
  const backdropRef = useRef(null)
  const closing     = useRef(false)

  const dragStartY  = useRef(0)
  const dragStartMs = useRef(0)
  const dragging    = useRef(false)

  // ── Entry animation ──────────────────────────────────────────────────────────
  useEffect(() => {
    const sheet    = sheetRef.current
    const backdrop = backdropRef.current
    if (!sheet || !backdrop) return

    // Start off-screen / invisible
    sheet.style.transform     = 'translateY(110%)'
    sheet.style.transition    = 'none'
    backdrop.style.opacity    = '0'
    backdrop.style.transition = 'none'

    // Double rAF ensures the browser commits the initial state before animating
    let raf2
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        sheet.style.transition    = 'transform 440ms cubic-bezier(0.34, 1.56, 0.64, 1)'
        sheet.style.transform     = 'translateY(0)'
        backdrop.style.transition = 'opacity 280ms'
        backdrop.style.opacity    = '1'
      })
    })

    return () => {
      cancelAnimationFrame(raf1)
      if (raf2) cancelAnimationFrame(raf2)
    }
  }, [])

  // ── Animated exit ────────────────────────────────────────────────────────────
  const animateOut = useCallback(() => {
    const sheet    = sheetRef.current
    const backdrop = backdropRef.current
    if (sheet) {
      sheet.style.transition = 'transform 280ms cubic-bezier(0.4, 0, 1, 1)'
      sheet.style.transform  = 'translateY(110%)'
    }
    if (backdrop) {
      backdrop.style.transition = 'opacity 260ms'
      backdrop.style.opacity    = '0'
    }
    setTimeout(onClose, 280)
  }, [onClose])

  const dismiss = useCallback(() => {
    if (closing.current || locked) return
    closing.current = true
    animateOut()
  }, [locked, animateOut])

  // ── Drag handle ──────────────────────────────────────────────────────────────
  const onHandleTouchStart = (e) => {
    if (locked || closing.current) return
    dragStartY.current  = e.touches[0].clientY
    dragStartMs.current = Date.now()
    dragging.current    = true
    const sheet = sheetRef.current
    if (sheet) sheet.style.transition = 'none'
  }

  const onHandleTouchMove = (e) => {
    if (!dragging.current) return
    const dy    = e.touches[0].clientY - dragStartY.current
    const sheet = sheetRef.current
    if (!sheet) return
    // Down  → damped drag (elastic feel)
    // Up    → strong rubber-band resistance
    sheet.style.transform = dy > 0
      ? `translateY(${dy * 0.65}px)`
      : `translateY(${dy * 0.08}px)`
  }

  const onHandleTouchEnd = (e) => {
    if (!dragging.current) return
    dragging.current = false

    const dy       = e.changedTouches[0].clientY - dragStartY.current
    const velocity = dy / Math.max(Date.now() - dragStartMs.current, 1) // px/ms

    if (dy > 100 || velocity > 0.5) {
      if (closing.current) return
      closing.current = true
      animateOut()
    } else {
      // Snap back with spring
      const sheet = sheetRef.current
      if (sheet) {
        sheet.style.transition = 'transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1)'
        sheet.style.transform  = 'translateY(0)'
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Backdrop — full viewport, starts transparent */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/70"
        style={{ opacity: 0 }}
        onClick={!locked ? dismiss : undefined}
      />

      {/* Sheet panel — constrained to app max-width */}
      <div
        ref={sheetRef}
        className={`relative w-full max-w-[767px] mx-auto bg-slate-800 rounded-t-3xl ${className}`}
        style={{ transform: 'translateY(110%)' }}
      >
        {/* Drag handle pill */}
        <div
          className="flex justify-center pt-3 pb-1 select-none"
          style={{ touchAction: 'none', cursor: locked ? 'default' : 'grab' }}
          onTouchStart={onHandleTouchStart}
          onTouchMove={onHandleTouchMove}
          onTouchEnd={onHandleTouchEnd}
        >
          <div className="w-10 h-1 bg-slate-600 rounded-full" />
        </div>

        {typeof children === 'function' ? children({ dismiss }) : children}
      </div>
    </div>
  )
}
