import { useRef, useEffect, useState } from 'react'
import { touchState } from './touchState'

function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => {
    setIsTouch(
      'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // Also show for narrow screens (mobile-like)
        window.innerWidth < 768
    )
  }, [])
  return isTouch
}

interface TouchControlsProps {
  inVehicle: boolean
}

export default function TouchControls({ inVehicle }: TouchControlsProps) {
  const isTouch = useIsTouchDevice()
  const joystickRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const activeJoystickId = useRef<number | null>(null)
  const joystickCenter = useRef({ x: 0, y: 0 })

  // Shoot button state for visual feedback
  const [shootActive, setShootActive] = useState(false)
  const [enterActive, setEnterActive] = useState(false)
  const [runActive, setRunActive] = useState(false)

  useEffect(() => {
    const joystick = joystickRef.current
    if (!joystick) return

    const RADIUS = 48

    const resetJoystick = () => {
      activeJoystickId.current = null
      touchState.forward = false
      touchState.back = false
      touchState.left = false
      touchState.right = false
      if (knobRef.current) {
        knobRef.current.style.transform = 'translate(-50%, -50%)'
      }
    }

    const onStart = (e: TouchEvent) => {
      e.preventDefault()
      if (activeJoystickId.current !== null) return
      const touch = e.changedTouches[0]
      const rect = joystick.getBoundingClientRect()
      joystickCenter.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      }
      activeJoystickId.current = touch.identifier
    }

    const onMove = (e: TouchEvent) => {
      e.preventDefault()
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]
        if (touch.identifier !== activeJoystickId.current) continue

        const dx = touch.clientX - joystickCenter.current.x
        const dy = touch.clientY - joystickCenter.current.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const clamped = Math.min(dist, RADIUS)
        const angle = Math.atan2(dy, dx)
        const kx = Math.cos(angle) * clamped
        const ky = Math.sin(angle) * clamped

        if (knobRef.current) {
          knobRef.current.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`
        }

        const threshold = RADIUS * 0.22
        touchState.forward = ky < -threshold
        touchState.back = ky > threshold
        touchState.left = kx < -threshold
        touchState.right = kx > threshold
      }
    }

    const onEnd = (e: TouchEvent) => {
      e.preventDefault()
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeJoystickId.current) {
          resetJoystick()
          break
        }
      }
    }

    joystick.addEventListener('touchstart', onStart, { passive: false })
    joystick.addEventListener('touchmove', onMove, { passive: false })
    joystick.addEventListener('touchend', onEnd, { passive: false })
    joystick.addEventListener('touchcancel', onEnd, { passive: false })

    return () => {
      joystick.removeEventListener('touchstart', onStart)
      joystick.removeEventListener('touchmove', onMove)
      joystick.removeEventListener('touchend', onEnd)
      joystick.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  if (!isTouch) return null

  const makeBtn = (
    label: string,
    sublabel: string,
    bg: string,
    active: boolean,
    onDown: () => void,
    onUp: () => void,
    size = 70
  ) => (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: active ? 'rgba(255,255,255,0.35)' : bg,
        border: `3px solid ${active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)'}`,
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        color: '#fff',
        fontFamily: 'monospace',
        fontWeight: 'bold',
        touchAction: 'none',
        userSelect: 'none' as const,
        WebkitUserSelect: 'none' as const,
        cursor: 'pointer',
        boxShadow: active
          ? '0 0 16px rgba(255,255,255,0.4), 0 4px 12px rgba(0,0,0,0.5)'
          : '0 4px 12px rgba(0,0,0,0.5)',
        transition: 'box-shadow 0.08s, background 0.08s',
        flexShrink: 0,
        gap: 1,
      }}
      onTouchStart={(e) => {
        e.preventDefault()
        onDown()
      }}
      onTouchEnd={(e) => {
        e.preventDefault()
        onUp()
      }}
      onTouchCancel={(e) => {
        e.preventDefault()
        onUp()
      }}
    >
      <span>{label}</span>
      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5 }}>
        {sublabel}
      </span>
    </div>
  )

  return (
    <>
      {/* ── Left: Virtual Joystick ─────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          bottom: 'calc(24px + env(safe-area-inset-bottom))',
          left: 'calc(24px + env(safe-area-inset-left))',
          zIndex: 500,
          pointerEvents: 'auto',
        }}
      >
        <div
          ref={joystickRef}
          style={{
            width: 130,
            height: 130,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            border: '2px solid rgba(255,255,255,0.2)',
            position: 'relative',
            touchAction: 'none',
          }}
        >
          {/* Crosshair guides */}
          <div style={{
            position: 'absolute', top: '50%', left: 8, right: 8,
            height: 1, background: 'rgba(255,255,255,0.12)', transform: 'translateY(-50%)',
          }} />
          <div style={{
            position: 'absolute', left: '50%', top: 8, bottom: 8,
            width: 1, background: 'rgba(255,255,255,0.12)', transform: 'translateX(-50%)',
          }} />
          {/* Knob */}
          <div
            ref={knobRef}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.4)',
              border: '3px solid rgba(255,255,255,0.65)',
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
            }}
          />
        </div>
        <div style={{
          textAlign: 'center',
          color: 'rgba(255,255,255,0.35)',
          fontSize: 10,
          fontFamily: 'monospace',
          marginTop: 6,
        }}>
          MOVE
        </div>
      </div>

      {/* ── Right: Action Buttons ──────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          bottom: 'calc(24px + env(safe-area-inset-bottom))',
          right: 'calc(16px + env(safe-area-inset-right))',
          zIndex: 500,
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'flex-end',
          gap: 12,
          pointerEvents: 'auto',
        }}
      >
        {/* Top row: Shoot + Enter/Exit */}
        <div style={{ display: 'flex', gap: 12 }}>
          {makeBtn(
            '🔫',
            'SHOOT',
            'rgba(200, 40, 40, 0.75)',
            shootActive,
            () => { touchState.shoot = true; setShootActive(true) },
            () => { touchState.shoot = false; setShootActive(false) },
            72
          )}
          {makeBtn(
            inVehicle ? '🚪' : '🚗',
            inVehicle ? 'EXIT' : 'ENTER',
            'rgba(30, 100, 210, 0.75)',
            enterActive,
            () => { touchState.enter = true; setEnterActive(true) },
            () => { touchState.enter = false; setEnterActive(false) },
            72
          )}
        </div>

        {/* Bottom row: Run */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          {makeBtn(
            '⚡',
            'RUN',
            'rgba(160, 100, 10, 0.75)',
            runActive,
            () => { touchState.run = true; setRunActive(true) },
            () => { touchState.run = false; setRunActive(false) },
            58
          )}
        </div>
      </div>
    </>
  )
}
