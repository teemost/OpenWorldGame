import { useRef, useEffect, useState } from 'react'
import { touchState } from './touchState'
import { useGameStore } from '../store/useGameStore'

// ── Rendered OUTSIDE the Three.js Canvas so position:fixed is viewport-relative ──

export default function TouchControls() {
  const inVehicle = useGameStore((s) => s.inVehicle)

  // ── Joystick ──────────────────────────────────────────────────────────────
  const joystickRef = useRef<HTMLDivElement>(null)
  const knobRef     = useRef<HTMLDivElement>(null)
  const joystickId  = useRef<number | null>(null)
  const joystickCenter = useRef({ x: 0, y: 0 })
  const RADIUS = 50

  useEffect(() => {
    const joystick = joystickRef.current
    if (!joystick) return

    const resetKnob = () => {
      if (knobRef.current) knobRef.current.style.transform = 'translate(-50%,-50%)'
      touchState.forward    = false
      touchState.back       = false
      touchState.left       = false
      touchState.right      = false
      touchState.strafeLeft  = false
      touchState.strafeRight = false
      joystickId.current = null
    }

    const onStart = (e: TouchEvent) => {
      e.preventDefault()
      if (joystickId.current !== null) return
      const t = e.changedTouches[0]
      const r = joystick.getBoundingClientRect()
      joystickCenter.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      joystickId.current = t.identifier
    }

    const onMove = (e: TouchEvent) => {
      if (joystickId.current === null) return
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i]
        if (t.identifier !== joystickId.current) continue

        const dx = t.clientX - joystickCenter.current.x
        const dy = t.clientY - joystickCenter.current.y
        const dist = Math.hypot(dx, dy)
        const capped = Math.min(dist, RADIUS)
        const ang = Math.atan2(dy, dx)
        const kx = Math.cos(ang) * capped
        const ky = Math.sin(ang) * capped

        if (knobRef.current) {
          knobRef.current.style.transform =
            `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`
        }

        const thr = RADIUS * 0.25
        touchState.forward    = ky < -thr
        touchState.back       = ky > thr
        // X-axis: vehicle steering AND on-foot strafe (Player picks which to use)
        touchState.left        = kx < -thr
        touchState.right       = kx > thr
        touchState.strafeLeft  = kx < -thr
        touchState.strafeRight = kx > thr
      }
    }

    const onEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joystickId.current) { resetKnob(); break }
      }
    }

    joystick.addEventListener('touchstart', onStart, { passive: false })
    document.addEventListener('touchmove',   onMove,  { passive: false })
    document.addEventListener('touchend',    onEnd,   { passive: false })
    document.addEventListener('touchcancel', onEnd,   { passive: false })
    return () => {
      joystick.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove',   onMove)
      document.removeEventListener('touchend',    onEnd)
      document.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  // ── Right-side camera drag ────────────────────────────────────────────────
  const camOverlayRef = useRef<HTMLDivElement>(null)
  const camTouchId    = useRef<number | null>(null)
  const camLastX      = useRef(0)

  useEffect(() => {
    const overlay = camOverlayRef.current
    if (!overlay) return

    const onStart = (e: TouchEvent) => {
      // Only start camera drag on the RIGHT half of the screen
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i]
        if (t.clientX > window.innerWidth / 2 && camTouchId.current === null) {
          camTouchId.current = t.identifier
          camLastX.current   = t.clientX
          break
        }
      }
    }

    const onMove = (e: TouchEvent) => {
      if (camTouchId.current === null) return
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i]
        if (t.identifier === camTouchId.current) {
          touchState.camDx += t.clientX - camLastX.current
          camLastX.current  = t.clientX
          break
        }
      }
    }

    const onEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === camTouchId.current) {
          camTouchId.current = null
          break
        }
      }
    }

    overlay.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove',   onMove,  { passive: true })
    document.addEventListener('touchend',    onEnd,   { passive: true })
    document.addEventListener('touchcancel', onEnd,   { passive: true })
    return () => {
      overlay.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove',   onMove)
      document.removeEventListener('touchend',    onEnd)
      document.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  // ── Action button helper ──────────────────────────────────────────────────
  const [shootDown, setShootDown] = useState(false)
  const [enterDown, setEnterDown] = useState(false)
  const [runDown,   setRunDown  ] = useState(false)

  const Btn = ({
    label, sub, color, active, size = 68,
    onDown, onUp,
  }: {
    label: string; sub: string; color: string; active: boolean
    size?: number; onDown: () => void; onUp: () => void
  }) => (
    <div
      onTouchStart={(e) => { e.preventDefault(); onDown() }}
      onTouchEnd={(e)   => { e.preventDefault(); onUp()   }}
      onTouchCancel={(e) => { e.preventDefault(); onUp()  }}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: active ? 'rgba(255,255,255,0.3)' : color,
        border: `3px solid ${active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)'}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 1,
        fontSize: 20, color: '#fff', fontFamily: 'monospace', fontWeight: 'bold',
        touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none',
        boxShadow: active
          ? '0 0 18px rgba(255,255,255,0.4), 0 4px 12px rgba(0,0,0,0.6)'
          : '0 4px 14px rgba(0,0,0,0.6)',
        transition: 'background 0.07s, border-color 0.07s, box-shadow 0.07s',
        flexShrink: 0, position: 'relative', zIndex: 910,
      }}
    >
      <span>{label}</span>
      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5 }}>
        {sub}
      </span>
    </div>
  )

  return (
    <>
      {/* ── Full-screen invisible overlay for right-side camera drag (z:400) ── */}
      {/* Lower z-index than joystick/buttons (z:900) so those handle own touches */}
      <div
        ref={camOverlayRef}
        style={{
          position: 'fixed', inset: 0,
          zIndex: 400,
          touchAction: 'none',
          pointerEvents: 'auto',
          // Visual hint: faint label on right half
        }}
      />

      {/* ── Right-side hint label ──────────────────────────────────────────── */}
      <div style={{
        position: 'fixed',
        top: '50%',
        right: 'calc(20px + env(safe-area-inset-right))',
        transform: 'translateY(-50%)',
        color: 'rgba(255,255,255,0.15)',
        fontSize: 11,
        fontFamily: 'monospace',
        zIndex: 401,
        pointerEvents: 'none',
        letterSpacing: 1,
        writingMode: 'vertical-rl',
      }}>
        ← DRAG TO LOOK →
      </div>

      {/* ── LEFT: Joystick (z:900 — above overlay) ────────────────────────── */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(24px + env(safe-area-inset-bottom))',
        left: 'calc(24px + env(safe-area-inset-left))',
        zIndex: 900,
        pointerEvents: 'auto',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      }}>
        <div
          ref={joystickRef}
          style={{
            width: 130, height: 130, borderRadius: '50%',
            background: 'rgba(255,255,255,0.07)',
            border: '2.5px solid rgba(255,255,255,0.22)',
            position: 'relative', touchAction: 'none',
          }}
        >
          <div style={{
            position: 'absolute', top: '50%', left: 10, right: 10,
            height: 1, background: 'rgba(255,255,255,0.12)', transform: 'translateY(-50%)',
          }} />
          <div style={{
            position: 'absolute', left: '50%', top: 10, bottom: 10,
            width: 1, background: 'rgba(255,255,255,0.12)', transform: 'translateX(-50%)',
          }} />
          <div
            ref={knobRef}
            style={{
              position: 'absolute', top: '50%', left: '50%',
              width: 50, height: 50, borderRadius: '50%',
              background: 'rgba(255,255,255,0.42)',
              border: '3px solid rgba(255,255,255,0.7)',
              transform: 'translate(-50%,-50%)',
              boxShadow: '0 3px 12px rgba(0,0,0,0.55)',
              pointerEvents: 'none',
            }}
          />
        </div>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'monospace' }}>
          MOVE
        </div>
      </div>

      {/* ── RIGHT: Action Buttons (z:900 — above overlay) ─────────────────── */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(24px + env(safe-area-inset-bottom))',
        right: 'calc(20px + env(safe-area-inset-right))',
        zIndex: 900,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12,
        pointerEvents: 'auto',
      }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <Btn label="🔫" sub="SHOOT" color="rgba(195,35,35,0.82)" active={shootDown}
            onDown={() => { touchState.shoot = true;  setShootDown(true)  }}
            onUp={()   => { touchState.shoot = false; setShootDown(false) }}
          />
          <Btn
            label={inVehicle ? '🚪' : '🚗'} sub={inVehicle ? 'EXIT' : 'ENTER'}
            color="rgba(30,95,205,0.82)" active={enterDown}
            onDown={() => { touchState.enter = true;  setEnterDown(true)  }}
            onUp={()   => { touchState.enter = false; setEnterDown(false) }}
          />
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Btn label="⚡" sub="RUN" color="rgba(155,95,10,0.82)" active={runDown} size={56}
            onDown={() => { touchState.run = true;  setRunDown(true)  }}
            onUp={()   => { touchState.run = false; setRunDown(false) }}
          />
        </div>
      </div>
    </>
  )
}
