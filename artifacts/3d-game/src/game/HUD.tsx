import { useGameStore } from '../store/useGameStore'

export default function HUD() {
  const {
    health, money, wantedLevel, score, isGameOver, ammo, inVehicle,
    minimapDots, playerX, playerZ, resetGame,
  } = useGameStore()

  const mapSize = 160
  const mapScale = mapSize / 220 // map covers -110 to 110

  const toMapX = (worldX: number) => mapSize / 2 + worldX * mapScale
  const toMapZ = (worldZ: number) => mapSize / 2 + worldZ * mapScale

  if (isGameOver) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontFamily: 'monospace',
          zIndex: 1000,
        }}
      >
        <div style={{ fontSize: 64, color: '#ff3333', marginBottom: 16, fontWeight: 'bold' }}>
          WASTED
        </div>
        <div style={{ fontSize: 24, color: '#ffaa33', marginBottom: 8 }}>Score: {score}</div>
        <div style={{ fontSize: 18, color: '#aaa', marginBottom: 32 }}>Money: ${money}</div>
        <button
          onClick={resetGame}
          style={{
            padding: '12px 32px',
            fontSize: 20,
            background: '#cc3333',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontWeight: 'bold',
          }}
        >
          RESPAWN
        </button>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100 }}>
      {/* Top-left: Wanted Level */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div
          style={{
            background: 'rgba(0,0,0,0.7)',
            color: '#ffcc00',
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: 20,
            fontFamily: 'monospace',
            letterSpacing: 4,
          }}
        >
          {Array.from({ length: 5 }, (_, i) => (
            <span
              key={i}
              style={{ color: i < wantedLevel ? '#ffcc00' : '#444', marginRight: 2 }}
            >
              ★
            </span>
          ))}
        </div>
        {wantedLevel > 0 && (
          <div
            style={{
              background: 'rgba(180,0,0,0.8)',
              color: '#fff',
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: 12,
              fontFamily: 'monospace',
              animation: 'pulse 1s infinite',
            }}
          >
            {wantedLevel >= 4 ? '⚡ SWAT TEAM' : wantedLevel >= 2 ? '🚨 POLICE CHASE' : '🚔 POLICE ALERT'}
          </div>
        )}
      </div>

      {/* Top-right: Money & Score */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 6,
        }}
      >
        <div
          style={{
            background: 'rgba(0,0,0,0.7)',
            color: '#44ff88',
            padding: '6px 14px',
            borderRadius: 6,
            fontSize: 22,
            fontFamily: 'monospace',
            fontWeight: 'bold',
          }}
        >
          ${money.toLocaleString()}
        </div>
        <div
          style={{
            background: 'rgba(0,0,0,0.5)',
            color: '#aaffee',
            padding: '4px 10px',
            borderRadius: 4,
            fontSize: 14,
            fontFamily: 'monospace',
          }}
        >
          SCORE: {score}
        </div>
      </div>

      {/* Bottom-left: Health & Vehicle status */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div
          style={{
            background: 'rgba(0,0,0,0.7)',
            padding: '8px 12px',
            borderRadius: 6,
            minWidth: 180,
          }}
        >
          <div
            style={{
              color: '#aaa',
              fontSize: 11,
              fontFamily: 'monospace',
              marginBottom: 4,
              letterSpacing: 1,
            }}
          >
            HEALTH
          </div>
          <div
            style={{
              width: '100%',
              height: 12,
              background: '#333',
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${health}%`,
                height: '100%',
                background:
                  health > 60 ? '#44cc44' : health > 30 ? '#ccaa22' : '#cc3333',
                transition: 'width 0.2s',
                borderRadius: 6,
              }}
            />
          </div>
          <div
            style={{
              color: health > 60 ? '#44cc44' : health > 30 ? '#ccaa22' : '#cc3333',
              fontSize: 14,
              fontFamily: 'monospace',
              marginTop: 4,
            }}
          >
            {health} / 100
          </div>
        </div>

        <div
          style={{
            background: 'rgba(0,0,0,0.7)',
            color: '#ffaa33',
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: 14,
            fontFamily: 'monospace',
          }}
        >
          {inVehicle ? '🚗 IN VEHICLE — [E] EXIT' : `🔫 AMMO: ${ammo}`}
        </div>
      </div>

      {/* Bottom-right: Minimap */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          right: 16,
          width: mapSize,
          height: mapSize,
          background: 'rgba(0,0,0,0.75)',
          border: '2px solid #555',
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 0 12px rgba(0,0,0,0.8)',
        }}
      >
        {/* Map roads */}
        {[-80, -40, 0, 40, 80].map((r) => (
          <div key={`mvr${r}`} style={{
            position: 'absolute',
            left: toMapX(r) - 2,
            top: 0,
            width: 4,
            height: mapSize,
            background: '#333',
          }} />
        ))}
        {[-80, -40, 0, 40, 80].map((r) => (
          <div key={`mhr${r}`} style={{
            position: 'absolute',
            left: 0,
            top: toMapZ(r) - 2,
            width: mapSize,
            height: 4,
            background: '#333',
          }} />
        ))}

        {/* Dots */}
        {minimapDots.map((dot, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: toMapX(dot.x) - dot.size / 2,
              top: toMapZ(dot.z) - dot.size / 2,
              width: dot.size,
              height: dot.size,
              background: dot.color,
              borderRadius: '50%',
            }}
          />
        ))}

        {/* Player dot */}
        <div
          style={{
            position: 'absolute',
            left: toMapX(playerX) - 5,
            top: toMapZ(playerZ) - 5,
            width: 10,
            height: 10,
            background: '#00ffaa',
            borderRadius: '50%',
            border: '2px solid #fff',
            zIndex: 10,
          }}
        />

        <div
          style={{
            position: 'absolute',
            bottom: 4,
            left: 0,
            right: 0,
            textAlign: 'center',
            color: '#888',
            fontSize: 9,
            fontFamily: 'monospace',
          }}
        >
          MINIMAP
        </div>
      </div>

      {/* Center: Controls hint — desktop only (hidden on touch devices via CSS) */}
      <div className="desktop-hint"
        style={{
          position: 'absolute',
          bottom: 90,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.6)',
          color: '#ccc',
          padding: '8px 16px',
          borderRadius: 8,
          fontSize: 12,
          fontFamily: 'monospace',
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        WASD / Arrows: Move · Space: Shoot · E: Vehicle · Shift: Run
      </div>
    </div>
  )
}
