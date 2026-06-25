import { Canvas } from '@react-three/fiber'
import { KeyboardControls } from '@react-three/drei'
import { Component, ReactNode, useState, useEffect } from 'react'
import GameScene, { Controls } from './game/GameScene'
import TouchControls from './game/TouchControls'
import './index.css'

const keyMap = [
  { name: Controls.forward, keys: ['ArrowUp', 'KeyW'] },
  { name: Controls.back,    keys: ['ArrowDown', 'KeyS'] },
  { name: Controls.left,    keys: ['ArrowLeft', 'KeyA'] },
  { name: Controls.right,   keys: ['ArrowRight', 'KeyD'] },
  { name: Controls.shoot,   keys: ['Space'] },
  { name: Controls.enter,   keys: ['KeyE'] },
  { name: Controls.run,     keys: ['ShiftLeft', 'ShiftRight'] },
]

// ── Error boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}

// ── No-WebGL fallback ─────────────────────────────────────────────────────────
function NoWebGLFallback() {
  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontFamily: 'monospace', textAlign: 'center', padding: 24,
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🎮</div>
      <div style={{ fontSize: 28, fontWeight: 'bold', color: '#ffcc00', marginBottom: 12 }}>
        OPEN WORLD CRIME CITY
      </div>
      <div style={{ fontSize: 16, color: '#ff8844', marginBottom: 24, maxWidth: 480 }}>
        WebGL is required to run this 3D game.
        <br />
        Please open this app in Chrome, Firefox, or Edge on a device with GPU support.
      </div>
      <div style={{
        background: 'rgba(255,255,255,0.05)', border: '1px solid #333',
        borderRadius: 12, padding: '20px 32px', maxWidth: 500,
      }}>
        <div style={{ color: '#88aaff', fontSize: 14, lineHeight: 2 }}>
          🏙️ Open-world city with skyscrapers &amp; roads<br />
          🚗 Drive 12 unique vehicles<br />
          👥 25 NPCs with AI behavior<br />
          🚔 Dynamic police &amp; wanted system<br />
          🔫 Third-person shooting mechanics<br />
          🌅 Day/night cycle<br />
          🗺️ Live minimap HUD
        </div>
      </div>
    </div>
  )
}

// ── WebGL detection ───────────────────────────────────────────────────────────
function WebGLCheck({ children }: { children: ReactNode }) {
  const [supported, setSupported] = useState<boolean | null>(null)
  useEffect(() => {
    try {
      const c = document.createElement('canvas')
      setSupported(
        !!(c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl'))
      )
    } catch { setSupported(false) }
  }, [])

  if (supported === null) {
    return (
      <div style={{
        width: '100vw', height: '100vh', background: '#0a0a1a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontFamily: 'monospace',
      }}>
        Loading…
      </div>
    )
  }
  return supported ? <>{children}</> : <NoWebGLFallback />
}

// ── Landscape guard (mobile only) ─────────────────────────────────────────────
function LandscapeGuard({ children }: { children: ReactNode }) {
  const [isPortrait, setIsPortrait] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () =>
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0)

    const checkOrientation = () =>
      setIsPortrait(window.innerHeight > window.innerWidth)

    checkMobile()
    checkOrientation()
    window.addEventListener('resize', checkOrientation)
    window.addEventListener('orientationchange', checkOrientation)
    return () => {
      window.removeEventListener('resize', checkOrientation)
      window.removeEventListener('orientationchange', checkOrientation)
    }
  }, [])

  if (isMobile && isPortrait) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#0a0a1a',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontFamily: 'monospace', textAlign: 'center', gap: 20,
      }}>
        <div style={{ fontSize: 72 }}>↻</div>
        <div style={{ fontSize: 22, fontWeight: 'bold', color: '#ffcc00' }}>
          ROTATE YOUR DEVICE
        </div>
        <div style={{ fontSize: 14, color: '#aaa', maxWidth: 260 }}>
          This game plays in landscape mode. Please rotate your phone sideways.
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// ── Touch device detection (for hiding desktop hint) ──────────────────────────
function useIsTouch() {
  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])
  return isTouch
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const isTouch = useIsTouch()

  return (
    <LandscapeGuard>
      <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', position: 'relative' }}>
        <WebGLCheck>
          <ErrorBoundary fallback={<NoWebGLFallback />}>
            <KeyboardControls map={keyMap}>
              <Canvas
                shadows
                camera={{ position: [5, 15, 25], fov: 65, near: 0.1, far: 500 }}
                gl={{ antialias: true, powerPreference: 'default', failIfMajorPerformanceCaveat: false }}
                style={{ width: '100%', height: '100%' }}
              >
                <GameScene />
              </Canvas>
            </KeyboardControls>
          </ErrorBoundary>
        </WebGLCheck>

        {/* Touch controls — rendered OUTSIDE Canvas so position:fixed is viewport-relative */}
        {isTouch && <TouchControls />}

        {/* Startup hint — desktop only, fades after 4s */}
        {!isTouch && (
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,0,0.82)', color: '#fff',
            padding: '16px 28px', borderRadius: 12,
            fontFamily: 'monospace', fontSize: 16, textAlign: 'center',
            pointerEvents: 'none',
            animation: 'fadeOut 0.5s ease-out 4s forwards',
            zIndex: 200, border: '1px solid #444',
          }}>
            <div style={{ fontSize: 22, fontWeight: 'bold', color: '#ffcc00', marginBottom: 10 }}>
              OPEN WORLD CRIME CITY
            </div>
            <div style={{ color: '#aaa', lineHeight: 1.8 }}>
              Click the game · WASD to move
              <br />
              SPACE: Shoot · E: Enter/Exit Vehicle · Shift: Run
            </div>
          </div>
        )}
      </div>
    </LandscapeGuard>
  )
}
