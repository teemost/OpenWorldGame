import { Canvas } from '@react-three/fiber'
import { KeyboardControls } from '@react-three/drei'
import { Component, ReactNode, useState, useEffect } from 'react'
import GameScene, { Controls } from './game/GameScene'
import './index.css'

const keyMap = [
  { name: Controls.forward, keys: ['ArrowUp', 'KeyW'] },
  { name: Controls.back, keys: ['ArrowDown', 'KeyS'] },
  { name: Controls.left, keys: ['ArrowLeft', 'KeyA'] },
  { name: Controls.right, keys: ['ArrowRight', 'KeyD'] },
  { name: Controls.shoot, keys: ['Space'] },
  { name: Controls.enter, keys: ['KeyE'] },
  { name: Controls.run, keys: ['ShiftLeft', 'ShiftRight'] },
]

class ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
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
      <div style={{ marginTop: 24, color: '#666', fontSize: 12 }}>
        Controls: WASD = Move · Space = Shoot · E = Enter Vehicle · Shift = Run
      </div>
    </div>
  )
}

function WebGLCheck({ children }: { children: ReactNode }) {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const ctx =
        canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl')
      setWebglSupported(!!ctx)
    } catch {
      setWebglSupported(false)
    }
  }, [])

  if (webglSupported === null) {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        background: '#0a0a1a', display: 'flex',
        alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'monospace',
      }}>
        Loading…
      </div>
    )
  }

  if (!webglSupported) return <NoWebGLFallback />
  return <>{children}</>
}

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden' }}>
      <WebGLCheck>
        <ErrorBoundary fallback={<NoWebGLFallback />}>
          <KeyboardControls map={keyMap}>
            <Canvas
              shadows
              camera={{ position: [5, 15, 25], fov: 65, near: 0.1, far: 500 }}
              gl={{
                antialias: true,
                powerPreference: 'default',
                failIfMajorPerformanceCaveat: false,
              }}
              style={{ width: '100%', height: '100%' }}
            >
              <GameScene />
            </Canvas>
          </KeyboardControls>
        </ErrorBoundary>
      </WebGLCheck>

      {/* Startup tip overlay */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.8)',
          color: '#fff',
          padding: '16px 28px',
          borderRadius: 12,
          fontFamily: 'monospace',
          fontSize: 16,
          textAlign: 'center',
          pointerEvents: 'none',
          animation: 'fadeOut 0.5s ease-out 4s forwards',
          zIndex: 200,
          border: '1px solid #444',
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 'bold', color: '#ffcc00', marginBottom: 10 }}>
          OPEN WORLD CRIME CITY
        </div>
        <div style={{ color: '#aaa', lineHeight: 1.8 }}>
          Click the game · WASD to move
          <br />
          SPACE: Shoot · E: Enter/Exit Vehicle · Shift: Run
        </div>
      </div>
    </div>
  )
}
