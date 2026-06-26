import { useRef, useEffect, useState } from 'react'
import { touchState } from './touchState'
import { useGameStore } from '../store/useGameStore'

// ── Rendered OUTSIDE the Three.js Canvas so position:fixed is viewport-relative ──

// ─── Crosshair Overlay ────────────────────────────────────────────────────────
function CrosshairOverlay({ dist }: { dist: number }) {
  const GAP  = 18 + (1 - dist) * 12   // gap widens when not fully pulled
  const LINE = 22
  const RING = 28

  const lineStyle = (dir: 'top' | 'bottom' | 'left' | 'right'): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      background: 'rgba(255,60,60,0.92)',
      boxShadow: '0 0 6px rgba(255,60,60,0.55)',
    }
    if (dir === 'top')    return { ...base, width: 2, height: LINE, left: -1, bottom: GAP }
    if (dir === 'bottom') return { ...base, width: 2, height: LINE, left: -1, top: GAP }
    if (dir === 'left')   return { ...base, height: 2, width: LINE, right: GAP, top: -1 }
    return                       { ...base, height: 2, width: LINE, left: GAP, top: -1 }
  }

  return (
    <>
      {/* Aim vignette: dark red edges */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1700, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 55%, rgba(160,0,0,0.28) 100%)',
      }} />

      {/* Crosshair */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        zIndex: 1800, pointerEvents: 'none',
        width: 0, height: 0,
      }}>
        {/* Outer ring */}
        <div style={{
          position: 'absolute',
          width: RING * 2, height: RING * 2,
          borderRadius: '50%',
          border: '1.5px solid rgba(255,60,60,0.55)',
          top: -RING, left: -RING,
          boxShadow: '0 0 10px rgba(255,60,60,0.2)',
        }} />
        {/* 4 lines */}
        <div style={lineStyle('top')} />
        <div style={lineStyle('bottom')} />
        <div style={lineStyle('left')} />
        <div style={lineStyle('right')} />
        {/* Center dot */}
        <div style={{
          position: 'absolute', width: 5, height: 5, borderRadius: '50%',
          background: 'rgba(255,60,60,0.95)',
          top: -2.5, left: -2.5,
          boxShadow: '0 0 8px rgba(255,60,60,0.7)',
        }} />
        {/* AIM label */}
        <div style={{
          position: 'absolute', top: GAP + LINE + 8, left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255,100,100,0.7)', fontSize: 9,
          fontFamily: 'monospace', letterSpacing: 2, whiteSpace: 'nowrap',
          textShadow: '0 0 6px rgba(255,60,60,0.5)',
        }}>
          {dist > 0.5 ? '🔴 FIRING' : '◎ AIM'}
        </div>
      </div>
    </>
  )
}

export default function TouchControls() {
  const inVehicle = useGameStore((s) => s.inVehicle)

  // ── Left Joystick (Move) ──────────────────────────────────────────────────
  const joystickRef    = useRef<HTMLDivElement>(null)
  const knobRef        = useRef<HTMLDivElement>(null)
  const joystickId     = useRef<number | null>(null)
  const joystickCenter = useRef({ x: 0, y: 0 })
  const RADIUS = 52

  useEffect(() => {
    const joystick = joystickRef.current
    if (!joystick) return

    const resetKnob = () => {
      if (knobRef.current) knobRef.current.style.transform = 'translate(-50%,-50%)'
      touchState.forward      = false
      touchState.back         = false
      touchState.left         = false
      touchState.right        = false
      touchState.strafeLeft   = false
      touchState.strafeRight  = false
      touchState.vehicleLeft  = false
      touchState.vehicleRight = false
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
        if (knobRef.current)
          knobRef.current.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`
        const thr = RADIUS * 0.25
        touchState.forward      = ky < -thr
        touchState.back         = ky > thr
        touchState.strafeLeft   = kx < -thr
        touchState.strafeRight  = kx > thr
        touchState.vehicleLeft  = kx < -thr
        touchState.vehicleRight = kx > thr
        touchState.left         = kx < -thr
        touchState.right        = kx > thr
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

  // ── Right Joystick (Shoot + Aim) ──────────────────────────────────────────
  const shootJoyRef    = useRef<HTMLDivElement>(null)
  const shootKnobRef   = useRef<HTMLDivElement>(null)
  const shootJoyId     = useRef<number | null>(null)
  const shootCenter    = useRef({ x: 0, y: 0 })
  const SHOOT_RADIUS   = 55
  const [isAiming, setIsAiming] = useState(false)
  const [aimDist,  setAimDist]  = useState(0)

  useEffect(() => {
    const joyEl = shootJoyRef.current
    if (!joyEl) return

    const reset = () => {
      if (shootKnobRef.current)
        shootKnobRef.current.style.transform = 'translate(-50%,-50%)'
      touchState.shootJoyX  = 0
      touchState.shootJoyY  = 0
      touchState.shootAiming = false
      touchState.shootDist  = 0
      touchState.shoot      = false
      shootJoyId.current    = null
      setIsAiming(false)
      setAimDist(0)
    }

    const onStart = (e: TouchEvent) => {
      e.preventDefault()
      if (shootJoyId.current !== null) return
      const t = e.changedTouches[0]
      const r = joyEl.getBoundingClientRect()
      shootCenter.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      shootJoyId.current  = t.identifier
      touchState.shootAiming = true
      setIsAiming(true)
    }

    const onMove = (e: TouchEvent) => {
      if (shootJoyId.current === null) return
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i]
        if (t.identifier !== shootJoyId.current) continue
        const dx = t.clientX - shootCenter.current.x
        const dy = t.clientY - shootCenter.current.y
        const dist = Math.hypot(dx, dy)
        const capped = Math.min(dist, SHOOT_RADIUS)
        const ang = Math.atan2(dy, dx)
        const kx = Math.cos(ang) * capped
        const ky = Math.sin(ang) * capped
        if (shootKnobRef.current)
          shootKnobRef.current.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`
        const normDist = Math.min(1, dist / SHOOT_RADIUS)
        touchState.shootJoyX  = kx / SHOOT_RADIUS
        touchState.shootJoyY  = ky / SHOOT_RADIUS
        touchState.shootDist  = normDist
        touchState.shoot      = normDist > 0.22
        setAimDist(normDist)
      }
    }

    const onEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === shootJoyId.current) { reset(); break }
      }
    }

    joyEl.addEventListener('touchstart', onStart, { passive: false })
    document.addEventListener('touchmove',   onMove,  { passive: false })
    document.addEventListener('touchend',    onEnd,   { passive: false })
    document.addEventListener('touchcancel', onEnd,   { passive: false })
    return () => {
      joyEl.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove',   onMove)
      document.removeEventListener('touchend',    onEnd)
      document.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  // ── Right-side camera drag (disabled while shoot joystick is active) ───────
  const camOverlayRef = useRef<HTMLDivElement>(null)
  const camTouchId    = useRef<number | null>(null)
  const camLastX      = useRef(0)
  const camLastY      = useRef(0)

  useEffect(() => {
    const overlay = camOverlayRef.current
    if (!overlay) return

    const onStart = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i]
        // Right half only, and not when shoot joystick is active
        if (t.clientX > window.innerWidth / 2
          && camTouchId.current === null
          && !touchState.shootAiming) {
          camTouchId.current = t.identifier
          camLastX.current   = t.clientX
          camLastY.current   = t.clientY
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
          touchState.camDy += t.clientY - camLastY.current
          camLastX.current  = t.clientX
          camLastY.current  = t.clientY
          break
        }
      }
    }

    const onEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === camTouchId.current) {
          camTouchId.current = null; break
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

  // ── Enter / Run buttons ───────────────────────────────────────────────────
  const [enterDown, setEnterDown] = useState(false)
  const [runDown,   setRunDown]   = useState(false)

  const ActionBtn = ({
    label, sub, color, active, size = 60,
    onDown, onUp,
  }: {
    label: string; sub: string; color: string; active: boolean
    size?: number; onDown: () => void; onUp: () => void
  }) => (
    <div
      onTouchStart={e => { e.preventDefault(); onDown() }}
      onTouchEnd={e   => { e.preventDefault(); onUp()   }}
      onTouchCancel={e => { e.preventDefault(); onUp()  }}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: active ? 'rgba(255,255,255,0.28)' : color,
        border: `2.5px solid ${active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)'}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 1,
        fontSize: 18, color: '#fff', fontFamily: 'monospace', fontWeight: 'bold',
        touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none',
        boxShadow: active
          ? '0 0 18px rgba(255,255,255,0.35), 0 4px 12px rgba(0,0,0,0.6)'
          : '0 4px 14px rgba(0,0,0,0.6)',
        transition: 'background 0.07s, border-color 0.07s',
        flexShrink: 0, position: 'relative', zIndex: 910,
      }}
    >
      <span>{label}</span>
      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.65)', letterSpacing: 0.5 }}>{sub}</span>
    </div>
  )

  return (
    <>
      {/* ── Full-screen invisible overlay for right-side camera drag ── */}
      <div
        ref={camOverlayRef}
        style={{ position: 'fixed', inset: 0, zIndex: 400, touchAction: 'none', pointerEvents: 'auto' }}
      />

      {/* ── Right-side look hint ── */}
      <div style={{
        position: 'fixed', top: '45%', right: 'calc(20px + env(safe-area-inset-right))',
        color: 'rgba(255,255,255,0.13)', fontSize: 10, fontFamily: 'monospace',
        zIndex: 401, pointerEvents: 'none', letterSpacing: 1,
        writingMode: 'vertical-rl',
      }}>
        ← DRAG TO LOOK →
      </div>

      {/* ── LEFT: Move Joystick ───────────────────────────────────────────── */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(24px + env(safe-area-inset-bottom))',
        left: 'calc(24px + env(safe-area-inset-left))',
        zIndex: 900, pointerEvents: 'auto',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
      }}>
        <div
          ref={joystickRef}
          style={{
            width: 132, height: 132, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            border: '2.5px solid rgba(255,255,255,0.20)',
            position: 'relative', touchAction: 'none',
          }}
        >
          {/* Crosshair guides */}
          <div style={{ position:'absolute', top:'50%', left:10, right:10, height:1, background:'rgba(255,255,255,0.10)', transform:'translateY(-50%)' }}/>
          <div style={{ position:'absolute', left:'50%', top:10, bottom:10, width:1, background:'rgba(255,255,255,0.10)', transform:'translateX(-50%)' }}/>
          <div
            ref={knobRef}
            style={{
              position: 'absolute', top: '50%', left: '50%',
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(255,255,255,0.38)',
              border: '2.5px solid rgba(255,255,255,0.65)',
              transform: 'translate(-50%,-50%)',
              boxShadow: '0 3px 12px rgba(0,0,0,0.5)',
              pointerEvents: 'none',
            }}
          />
        </div>
        <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 9, fontFamily: 'monospace', letterSpacing: 1 }}>MOVE</div>
      </div>

      {/* ── RIGHT: Shoot Joystick + Action Buttons ───────────────────────────── */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(24px + env(safe-area-inset-bottom))',
        right: 'calc(24px + env(safe-area-inset-right))',
        zIndex: 900, pointerEvents: 'auto',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10,
      }}>
        {/* ENTER + RUN buttons above the shoot joystick */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <ActionBtn
            label="⚡" sub="RUN" color="rgba(140,85,0,0.82)" active={runDown} size={52}
            onDown={() => { touchState.run = true;  setRunDown(true)  }}
            onUp={()   => { touchState.run = false; setRunDown(false) }}
          />
          <ActionBtn
            label={inVehicle ? '🚪' : '🚗'} sub={inVehicle ? 'EXIT' : 'ENTER'}
            color="rgba(25,85,195,0.82)" active={enterDown} size={60}
            onDown={() => { touchState.enter = true;  setEnterDown(true)  }}
            onUp={()   => { touchState.enter = false; setEnterDown(false) }}
          />
        </div>

        {/* Shoot joystick */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <div
            ref={shootJoyRef}
            style={{
              width: 132, height: 132, borderRadius: '50%',
              background: isAiming
                ? 'rgba(200,30,30,0.18)'
                : 'rgba(200,40,40,0.08)',
              border: isAiming
                ? '2.5px solid rgba(255,80,80,0.65)'
                : '2.5px solid rgba(255,100,100,0.28)',
              position: 'relative', touchAction: 'none',
              boxShadow: isAiming
                ? '0 0 24px rgba(255,50,50,0.35), inset 0 0 20px rgba(255,30,30,0.08)'
                : '0 4px 14px rgba(0,0,0,0.5)',
              transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
            }}
          >
            {/* Guide crosshair inside shoot joystick */}
            <div style={{ position:'absolute', top:'50%', left:12, right:12, height:1, background:'rgba(255,80,80,0.18)', transform:'translateY(-50%)' }}/>
            <div style={{ position:'absolute', left:'50%', top:12, bottom:12, width:1, background:'rgba(255,80,80,0.18)', transform:'translateX(-50%)' }}/>
            {/* Aim icon in center */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              width: 22, height: 22, borderRadius: '50%',
              border: `2px solid ${isAiming ? 'rgba(255,80,80,0.9)' : 'rgba(255,100,100,0.4)'}`,
              transition: 'border-color 0.15s',
              pointerEvents: 'none',
            }}/>
            {/* Knob */}
            <div
              ref={shootKnobRef}
              style={{
                position: 'absolute', top: '50%', left: '50%',
                width: 52, height: 52, borderRadius: '50%',
                background: isAiming
                  ? 'rgba(255,60,60,0.55)'
                  : 'rgba(255,80,80,0.28)',
                border: isAiming
                  ? '2.5px solid rgba(255,100,100,0.9)'
                  : '2.5px solid rgba(255,120,120,0.5)',
                transform: 'translate(-50%,-50%)',
                boxShadow: isAiming
                  ? '0 0 16px rgba(255,60,60,0.55), 0 3px 10px rgba(0,0,0,0.5)'
                  : '0 3px 10px rgba(0,0,0,0.45)',
                transition: 'background 0.08s, border-color 0.08s',
                pointerEvents: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>🎯</span>
            </div>
          </div>
          <div style={{
            color: isAiming ? 'rgba(255,100,100,0.7)' : 'rgba(255,255,255,0.25)',
            fontSize: 9, fontFamily: 'monospace', letterSpacing: 1,
            transition: 'color 0.15s',
          }}>
            {isAiming ? (aimDist > 0.22 ? '🔴 FIRING' : '◎ AIM') : 'AIM + SHOOT'}
          </div>
        </div>
      </div>

      {/* ── Crosshair overlay (center screen, only when aiming) ────────────── */}
      {isAiming && <CrosshairOverlay dist={aimDist} />}
    </>
  )
}
