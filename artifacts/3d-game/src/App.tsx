import { Canvas, useThree } from '@react-three/fiber'
import { KeyboardControls } from '@react-three/drei'
import { Component, ReactNode, useState, useEffect, useRef } from 'react'
import GameScene, { Controls } from './game/GameScene'
import TouchControls from './game/TouchControls'
import HUD from './game/HUD'
import AuthScreen from './auth/AuthScreen'
import CharacterSelect from './auth/CharacterSelect'
import AdminDashboard from './admin/AdminDashboard'
import { useAuthStore } from './auth/useAuthStore'
import { useModelStore } from './store/useModelStore'
import { useGameStore, GraphicsQuality } from './store/useGameStore'
import { touchState } from './game/touchState'
import './index.css'

const keyMap = [
  { name: Controls.forward, keys: ['ArrowUp',    'KeyW'] },
  { name: Controls.back,    keys: ['ArrowDown',  'KeyS'] },
  { name: Controls.left,    keys: ['ArrowLeft',  'KeyA'] },
  { name: Controls.right,   keys: ['ArrowRight', 'KeyD'] },
  { name: Controls.shoot,   keys: ['Space'] },
  { name: Controls.enter,   keys: ['KeyE'] },
  { name: Controls.run,     keys: ['ShiftLeft',  'ShiftRight'] },
]

// ─── Dynamic quality applier (runs inside Canvas) ─────────────────────────────
const PIXEL_RATIO: Record<GraphicsQuality, number> = {
  low:    0.6,
  medium: 1.0,
  high:   Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2),
}

function QualityApplier() {
  const quality = useGameStore(s => s.quality)
  const { gl } = useThree()

  useEffect(() => {
    gl.setPixelRatio(PIXEL_RATIO[quality])
    gl.shadowMap.enabled = quality !== 'low'
    // Force shadow map refresh
    gl.shadowMap.needsUpdate = true
  }, [quality, gl])

  return null
}

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

function NoWebGLFallback() {
  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'linear-gradient(135deg,#0a0a1a 0%,#1a1a3a 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontFamily: 'monospace', textAlign: 'center', padding: 24,
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🎮</div>
      <div style={{ fontSize: 26, fontWeight: 'bold', color: '#ffcc00', marginBottom: 12 }}>
        OPEN WORLD CRIME CITY
      </div>
      <div style={{ fontSize: 15, color: '#ff8844', maxWidth: 480 }}>
        WebGL is required. Please use Chrome, Firefox, or Edge on a GPU-enabled device.
      </div>
    </div>
  )
}

function WebGLCheck({ children }: { children: ReactNode }) {
  const [supported, setSupported] = useState<boolean | null>(null)
  useEffect(() => {
    try {
      const c = document.createElement('canvas')
      setSupported(!!(c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl')))
    } catch { setSupported(false) }
  }, [])
  if (supported === null) return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a1a', display: 'flex',
      alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'monospace' }}>
      Loading…
    </div>
  )
  return supported ? <>{children}</> : <NoWebGLFallback />
}

function LandscapeGuard({ children }: { children: ReactNode }) {
  const [isPortrait, setIsPortrait] = useState(false)
  const [isMobile,   setIsMobile  ] = useState(false)
  useEffect(() => {
    const checkMobile = () => setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0)
    const checkOri    = () => setIsPortrait(window.innerHeight > window.innerWidth)
    checkMobile(); checkOri()
    window.addEventListener('resize',            checkOri)
    window.addEventListener('orientationchange', checkOri)
    return () => {
      window.removeEventListener('resize',            checkOri)
      window.removeEventListener('orientationchange', checkOri)
    }
  }, [])
  if (isMobile && isPortrait) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#0a0a1a',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontFamily: 'monospace', textAlign: 'center', gap: 20 }}>
      <div style={{ fontSize: 72 }}>↻</div>
      <div style={{ fontSize: 22, fontWeight: 'bold', color: '#ffcc00' }}>ROTATE YOUR DEVICE</div>
      <div style={{ fontSize: 14, color: '#aaa', maxWidth: 260 }}>This game plays in landscape mode.</div>
    </div>
  )
  return <>{children}</>
}

function useIsTouch() {
  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => { setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0) }, [])
  return isTouch
}

// Desktop mouse drag → camera orbit — only active when the game canvas is showing
function useMouseCameraOrbit(enabled: boolean) {
  const isDragging = useRef(false)
  const lastX      = useRef(0)
  const lastY      = useRef(0)
  useEffect(() => {
    if (!enabled) return
    const onDown = (e: MouseEvent) => {
      // Ignore clicks that originate from UI overlays (buttons, links, inputs, etc.)
      const target = e.target as HTMLElement
      if (target && target.tagName !== 'CANVAS') return
      isDragging.current = true
      lastX.current = e.clientX
      lastY.current = e.clientY
    }
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      touchState.camDx += e.clientX - lastX.current
      touchState.camDy += e.clientY - lastY.current
      lastX.current = e.clientX
      lastY.current = e.clientY
    }
    const onUp = () => { isDragging.current = false }
    const onCtxMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target && target.tagName === 'CANVAS') e.preventDefault()
    }
    window.addEventListener('mousedown',   onDown)
    window.addEventListener('mousemove',   onMove)
    window.addEventListener('mouseup',     onUp)
    window.addEventListener('contextmenu', onCtxMenu)
    return () => {
      isDragging.current = false
      window.removeEventListener('mousedown',   onDown)
      window.removeEventListener('mousemove',   onMove)
      window.removeEventListener('mouseup',     onUp)
      window.removeEventListener('contextmenu', onCtxMenu)
    }
  }, [enabled])
}

function Game() {
  const isTouch = useIsTouch()
  useMouseCameraOrbit(!isTouch)
  const loadAllModelURLs = useModelStore(s => s.loadAllModelURLs)
  const settings = useModelStore(s => s.settings)
  const initFromSettings = useGameStore(s => s.initFromSettings)

  // Restore blob URLs from IndexedDB every time the game mounts
  // (covers fresh page load AND returning from the admin panel)
  useEffect(() => { loadAllModelURLs() }, [loadAllModelURLs])

  // Apply admin settings (health, money, ammo) when the game first loads
  useEffect(() => {
    initFromSettings(settings.playerHealthMax, settings.startingMoney, settings.startingAmmo)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <LandscapeGuard>
      <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', position: 'relative' }}>
        <WebGLCheck>
          <ErrorBoundary fallback={<NoWebGLFallback />}>
            <KeyboardControls map={keyMap}>
              <Canvas
                shadows
                camera={{ position: [0, 3, 5], fov: 68, near: 0.3, far: 500 }}
                gl={{ antialias: false, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: false, stencil: false }}
                style={{ width: '100%', height: '100%' }}
                performance={{ min: 0.5 }}
              >
                <QualityApplier />
                <GameScene />
              </Canvas>
            </KeyboardControls>
          </ErrorBoundary>
        </WebGLCheck>
        <HUD />
        {isTouch && <TouchControls />}
        {!isTouch && (
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            background: 'rgba(0,0,0,0.82)', color: '#fff',
            padding: '16px 28px', borderRadius: 12,
            fontFamily: 'monospace', fontSize: 15, textAlign: 'center',
            pointerEvents: 'none',
            animation: 'fadeOut 0.5s ease-out 5s forwards',
            zIndex: 200, border: '1px solid #444',
          }}>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#ffcc00', marginBottom: 10 }}>
              OPEN WORLD CRIME CITY
            </div>
            <div style={{ color: '#aaa', lineHeight: 1.9 }}>
              WASD — Move &nbsp;|&nbsp; Mouse drag on canvas — Camera<br />
              Space — Shoot &nbsp;|&nbsp; E — Enter/Exit Vehicle<br />
              Shift — Run &nbsp;|&nbsp; A/D — Steer vehicle
            </div>
          </div>
        )}
      </div>
    </LandscapeGuard>
  )
}

// ─── Server restart countdown overlay ─────────────────────────────────────────
function ServerRestartOverlay() {
  const restartCountdown = useGameStore(s => s.restartCountdown)
  const tickRestart      = useGameStore(s => s.tickRestart)

  useEffect(() => {
    if (restartCountdown === null) return
    const id = setTimeout(tickRestart, 1000)
    return () => clearTimeout(id)
  }, [restartCountdown, tickRestart])

  if (restartCountdown === null) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.88)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'monospace',
    }}>
      <div style={{ color: '#ff6600', fontSize: 13, letterSpacing: 4, marginBottom: 24 }}>
        SERVER RESTARTING
      </div>
      <div style={{
        fontSize: 96, fontWeight: 'bold', color: '#fff',
        lineHeight: 1, textShadow: '0 0 40px rgba(255,100,0,0.8)',
        transition: 'all 0.3s',
      }}>
        {restartCountdown}
      </div>
      <div style={{ color: '#555', fontSize: 13, marginTop: 28, letterSpacing: 2 }}>
        RESETTING GAME WORLD…
      </div>
    </div>
  )
}

// ─── Hash-based router ─────────────────────────────────────────────────────────
function useHash() {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const h = () => setHash(window.location.hash)
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])
  return hash
}

export default function App() {
  const currentUser      = useAuthStore(s => s.currentUser)
  const hash             = useHash()
  const serverRestartKey = useGameStore(s => s.serverRestartKey)
  const [characterReady, setCharacterReady] = useState(false)

  if (!currentUser) return <AuthScreen />

  if ((hash === '#/admin' || hash === '#/admin/dashboard') && currentUser.role === 'admin') {
    return <AdminDashboard />
  }

  if (!characterReady) {
    return <CharacterSelect onReady={() => setCharacterReady(true)} />
  }

  return (
    <>
      <Game key={serverRestartKey} />
      <ServerRestartOverlay />
    </>
  )
}
