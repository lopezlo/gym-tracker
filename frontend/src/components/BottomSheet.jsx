import { useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

/**
 * Reusable animated bottom-sheet.
 *
 * Entry       : slides up from below with an elastic spring overshoot.
 * Dismiss     : slide-down exit animation → calls onClose.
 * Drag area   : the ENTIRE sheet panel is the drag target (not just the pill).
 *               Smart scroll detection ensures downward swipes on a scrollable
 *               element that hasn't reached the top let the browser scroll instead.
 *               Once the scrollable content is at the top, swiping down dismisses.
 *
 * Props
 *   onClose   – called after exit animation completes
 *   locked    – disable drag + backdrop tap (e.g. during async operation)
 *   className – extra classes for the panel  (e.g. "max-h-[82vh] flex flex-col")
 *   children  – render prop: ({ dismiss }) => JSX  OR  plain JSX
 */
export default function BottomSheet({ onClose, locked = false, className = '', children }) {
  const sheetRef    = useRef(null)
  const backdropRef = useRef(null)
  const closing     = useRef(false)

  // Keep refs up-to-date for the imperative touch handler (avoids re-attaching listeners)
  const lockedRef = useRef(locked)
  useEffect(() => { lockedRef.current = locked }, [locked])

  // ── Entry animation ──────────────────────────────────────────────────────────
  useEffect(() => {
    const sheet    = sheetRef.current
    const backdrop = backdropRef.current
    if (!sheet || !backdrop) return

    sheet.style.transform     = 'translateY(110%)'
    sheet.style.transition    = 'none'
    backdrop.style.opacity    = '0'
    backdrop.style.transition = 'none'

    // Double rAF: ensure the browser commits the initial state before animating
    let raf2
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        sheet.style.transition    = 'transform 440ms cubic-bezier(0.34, 1.2, 0.64, 1)'
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

  // Keep animateOut in a ref so the touch handler always calls the latest version
  const animateOutRef = useRef(animateOut)
  useEffect(() => { animateOutRef.current = animateOut }, [animateOut])

  const dismiss = useCallback(() => {
    if (closing.current || locked) return
    closing.current = true
    animateOut()
  }, [locked, animateOut])

  // ── Whole-sheet drag (non-passive touch listeners) ───────────────────────────
  useEffect(() => {
    const sheet    = sheetRef.current
    const backdrop = backdropRef.current
    if (!sheet) return

    let startY    = 0
    let startMs   = 0
    let dragging  = false
    let activated = false

    // Walk up the DOM looking for a scrollable ancestor within the sheet
    const findScrollableAncestor = (el) => {
      while (el && el !== sheet) {
        const style = window.getComputedStyle(el)
        const oy    = style.overflowY
        if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) return el
        el = el.parentElement
      }
      return null
    }

    const onStart = (e) => {
      if (lockedRef.current || closing.current) return
      startY    = e.touches[0].clientY
      startMs   = Date.now()
      dragging  = true
      activated = false
    }

    const onMove = (e) => {
      if (!dragging) return
      const dy = e.touches[0].clientY - startY

      if (!activated) {
        if (Math.abs(dy) < 8) return          // not enough movement yet
        if (dy <= 0) { dragging = false; return }  // upward = let browser scroll

        // Downward swipe — check if inside a scrollable element still scrolled
        const scrollEl = findScrollableAncestor(e.target)
        if (scrollEl && scrollEl.scrollTop > 0) {
          dragging = false   // scrollable content not at top → let it scroll
          return
        }

        // Activate drag
        activated              = true
        sheet.style.transition = 'none'
        if (backdrop) backdrop.style.transition = 'none'
      }

      // Prevent browser scroll while we own the gesture
      e.preventDefault()

      const dampedDy = dy * 0.65
      sheet.style.transform = `translateY(${dampedDy}px)`

      // Fade backdrop proportionally as sheet slides down
      if (backdrop) {
        backdrop.style.opacity = String(Math.max(0, 1 - dampedDy / 300))
      }
    }

    const onEnd = (e) => {
      if (!dragging) return
      dragging = false
      if (!activated) return
      activated = false

      const dy       = e.changedTouches[0].clientY - startY
      const velocity = dy / Math.max(Date.now() - startMs, 1) // px/ms

      if (dy > 100 || velocity > 0.5) {
        if (closing.current) return
        closing.current = true
        animateOutRef.current()
      } else {
        // Snap back with spring
        sheet.style.transition = 'transform 420ms cubic-bezier(0.34, 1.2, 0.64, 1)'
        sheet.style.transform  = 'translateY(0)'
        if (backdrop) {
          backdrop.style.transition = 'opacity 280ms'
          backdrop.style.opacity    = '1'
        }
      }
    }

    sheet.addEventListener('touchstart', onStart, { passive: true  })
    sheet.addEventListener('touchmove',  onMove,  { passive: false }) // non-passive → e.preventDefault() works
    sheet.addEventListener('touchend',   onEnd,   { passive: true  })

    return () => {
      sheet.removeEventListener('touchstart', onStart)
      sheet.removeEventListener('touchmove',  onMove)
      sheet.removeEventListener('touchend',   onEnd)
    }
  }, []) // runs once; refs keep locked/animateOut current

  return createPortal(
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
        {/* Visual drag indicator (purely decorative — entire sheet is the drag target) */}
        <div className="flex justify-center pt-3 pb-1 select-none pointer-events-none">
          <div className="w-10 h-1 bg-slate-600 rounded-full" />
        </div>

        {typeof children === 'function' ? children({ dismiss }) : children}

        {/* Background extension: hides the gap that appears during the spring overshoot */}
        <div className="absolute inset-x-0 -bottom-16 h-16 bg-slate-800 pointer-events-none" aria-hidden="true" />
      </div>
    </div>,
    document.body
  )
}
