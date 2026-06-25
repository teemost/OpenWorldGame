import { create } from 'zustand'

interface MinimapDot {
  x: number
  z: number
  color: string
  size: number
}

interface GameStore {
  health: number
  money: number
  wantedLevel: number
  score: number
  timeOfDay: number
  isGameOver: boolean
  inVehicle: boolean
  ammo: number
  // Minimap data (written from scene, read by HUD)
  minimapDots: MinimapDot[]
  playerX: number
  playerZ: number

  setHealth: (h: number) => void
  takeDamage: (amount: number) => void
  addMoney: (amount: number) => void
  setWantedLevel: (w: number) => void
  incrementWanted: () => void
  decrementWanted: () => void
  addScore: (amount: number) => void
  setTimeOfDay: (t: number) => void
  setGameOver: (v: boolean) => void
  setInVehicle: (v: boolean) => void
  useAmmo: () => boolean
  addAmmo: (amount: number) => void
  setMinimapDots: (dots: MinimapDot[]) => void
  setPlayerPos: (x: number, z: number) => void
  resetGame: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  health: 100,
  money: 500,
  wantedLevel: 0,
  score: 0,
  timeOfDay: 10,
  isGameOver: false,
  inVehicle: false,
  ammo: 60,
  minimapDots: [],
  playerX: 5,
  playerZ: 5,

  setHealth: (h) => set({ health: Math.max(0, Math.min(100, h)) }),
  takeDamage: (amount) =>
    set((s) => {
      const health = Math.max(0, s.health - amount)
      return { health, isGameOver: health <= 0 }
    }),
  addMoney: (amount) => set((s) => ({ money: s.money + amount })),
  setWantedLevel: (w) => set({ wantedLevel: Math.max(0, Math.min(5, w)) }),
  incrementWanted: () =>
    set((s) => ({ wantedLevel: Math.min(5, s.wantedLevel + 1) })),
  decrementWanted: () =>
    set((s) => ({ wantedLevel: Math.max(0, s.wantedLevel - 1) })),
  addScore: (amount) => set((s) => ({ score: s.score + amount })),
  setTimeOfDay: (t) => set({ timeOfDay: t }),
  setGameOver: (v) => set({ isGameOver: v }),
  setInVehicle: (v) => set({ inVehicle: v }),
  useAmmo: () => {
    const { ammo } = get()
    if (ammo <= 0) return false
    set({ ammo: ammo - 1 })
    return true
  },
  addAmmo: (amount) => set((s) => ({ ammo: s.ammo + amount })),
  setMinimapDots: (dots) => set({ minimapDots: dots }),
  setPlayerPos: (x, z) => set({ playerX: x, playerZ: z }),
  resetGame: () =>
    set({
      health: 100,
      money: 500,
      wantedLevel: 0,
      score: 0,
      timeOfDay: 10,
      isGameOver: false,
      inVehicle: false,
      ammo: 60,
    }),
}))
