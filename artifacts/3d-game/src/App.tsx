import { Canvas } from '@react-three/fiber'
import { KeyboardControls } from '@react-three/drei'
import { Component, ReactNode, useState, useEffect, useRef } from 'react'
import GameScene, { Controls } from './game/GameScene'
import TouchControls from './game/TouchControls'
import HUD from './game/HUD'
import AuthScreen from './auth/AuthScreen'
import { useAuthStore } from './auth/useAuthStore'
import { touchState } from './game/touchState'
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
    <div style={{ width:'100vw',height:'100vh',background:'#0a0a1a',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontFamily:'monospace' }}>
      Loading…
    </div>
  )
  return supported ? <>{children}</> : <NoWebGLFallback />
}

function LandscapeGuard({ children }: { children: ReactNode }) {
  const [isPortrait, setIsPortrait] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkMobile = () => setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0)
    const checkOrientation = () => setIsPortrait(window.innerHeight > window.innerWidth)
    checkMobile(); checkOrientation()
    window.addEventListener('resize', checkOrientation)
    window.addEventListener('orientationchange', checkOrientation)
    return () => {
      window.removeEventListener('resize', checkOrientation)
      window.removeEventListener('orientationchange', checkOrientation)
    }
  }, [])
  if (isMobile && isPortrait) return (
    <div style={{ position:'fixed',inset:0,zIndex:9999,background:'#0a0a1a',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'#fff',fontFamily:'monospace',textAlign:'center',gap:20 }}>
      <div style={{ fontSize:72 }}>↻</div>
      <div style={{ fontSize:22,fontWeight:'bold',color:'#ffcc00' }}>ROTATE YOUR DEVICE</div>
      <div style={{ fontSize:14,color:'#aaa',maxWidth:260 }}>This game plays in landscape mode.</div>
    </div>
  )
  return <>{children}</>
}

function useIsTouch() {
  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => { setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0) }, [])
  return isTouch
}

// Mouse camera drag for desktop
function useMouseCameraOrbit(enabled: boolean) {
  const isDragging = useRef(false)
  const lastX = useRef(0)
  const lastY = useRef(0)

  useEffect(() => {
    if (!enabled) return

    const onDown = (e: MouseEvent) => {
      if (e.button === 0 || e.button === 2) {
        isDragging.current = true
        lastX.current = e.clientX
        lastY.current = e.clientY
      }
    }
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      touchState.camDx += e.clientX - lastX.current
      touchState.camDy += e.clientY - lastY.current
      lastX.current = e.clientX
      lastY.current = e.clientY
    }
    const onUp = () => { isDragging.current = false }

    window.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('contextmenu', e => e.preventDefault())
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [enabled])
}

function Game() {
  const isTouch = useIsTouch()
  useMouseCameraOrbit(!isTouch)

  return (
    <LandscapeGuard>
      <div style={{ width:'100vw',height:'100vh',background:'#000',overflow:'hidden',position:'relative' }}>
        <WebGLCheck>
          <ErrorBoundary fallback={<NoWebGLFallback />}>
            <KeyboardControls map={keyMap}>
              <Canvas
                shadows
                camera={{ position:[0,5,8], fov:68, near:0.1, far:600 }}
                gl={{ antialias:true, powerPreference:'default', failIfMajorPerformanceCaveat:false }}
                style={{ width:'100%',height:'100%' }}
              >
                <GameScene />
              </Canvas>
            </KeyboardControls>
          </ErrorBoundary>
        </WebGLCheck>

        <HUD />
        {isTouch && <TouchControls />}

        {!isTouch && (
          <div style={{
            position:'fixed',top:'50%',left:'50%',
            transform:'translate(-50%,-50%)',
            background:'rgba(0,0,0,0.82)',color:'#fff',
            padding:'16px 28px',borderRadius:12,
            fontFamily:'monospace',fontSize:15,textAlign:'center',
            pointerEvents:'none',
            animation:'fadeOut 0.5s ease-out 5s forwards',
            zIndex:200,border:'1px solid #444',
          }}>
            <div style={{ fontSize:20,fontWeight:'bold',color:'#ffcc00',marginBottom:10 }}>
              OPEN WORLD CRIME CITY
            </div>
            <div style={{ color:'#aaa',lineHeight:1.9 }}>
              WASD — Move &nbsp;|&nbsp; Mouse drag — Camera<br/>
              Space — Shoot &nbsp;|&nbsp; E — Enter/Exit Vehicle<br/>
              Shift — Run
            </div>
          </div>
        )}
      </div>
    </LandscapeGuard>
  )
}

export default function App() {
  const currentUser = useAuthStore(s => s.currentUser)
  if (!currentUser) return <AuthScreen />
  return <Game />
}
