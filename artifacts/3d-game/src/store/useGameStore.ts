import { create } from 'zustand'

interface MinimapDot {
  x: number
  z: number
  color: string
  size: number
}

export type GraphicsQuality = 'low' | 'medium' | 'high'
export type ShopType = 'ammo' | 'medic' | 'weapons'

export interface InventoryItem {
  id: string
  name: string
  icon: string
  quantity: number
  type: 'weapon' | 'ammo' | 'consumable' | 'equipment'
  description: string
  stackable: boolean
  useValue?: number
}

const DEFAULT_INVENTORY: InventoryItem[] = [
  { id: 'pistol',    name: 'Glock 17',      icon: '🔫', quantity: 1, type: 'weapon',    description: 'Standard 9mm sidearm. 15-round capacity.', stackable: false },
  { id: 'knife',     name: 'Combat Knife',  icon: '🔪', quantity: 1, type: 'weapon',    description: 'Silent melee weapon. No ammo needed.', stackable: false },
  { id: 'bandages',  name: 'Bandages',      icon: '🩹', quantity: 2, type: 'consumable', description: 'Restores 20 HP. Quick field patch.', stackable: true, useValue: 20 },
  { id: 'radio',     name: 'Police Scanner',icon: '📻', quantity: 1, type: 'equipment',  description: 'Track police movements. Reduces wanted surprise.', stackable: false },
  { id: 'id_card',   name: 'Fake ID',       icon: '🪪', quantity: 1, type: 'equipment',  description: 'Reduces wanted level by 1 when used.', stackable: false, useValue: 1 },
]

interface GameStore {
  health: number
  money: number
  wantedLevel: number
  score: number
  timeOfDay: number
  isGameOver: boolean
  inVehicle: boolean
  ammo: number
  armor: number
  playerFuel: number
  minimapDots: MinimapDot[]
  playerX: number
  playerZ: number
  fps: number
  quality: GraphicsQuality
  serverRestartKey: number
  restartCountdown: number | null
  isPaused: boolean
  showFullMap: boolean
  interactionPrompt: string | null
  showStore: boolean
  currentShopType: ShopType | null
  isInsideHouse: boolean
  currentHouseId: string | null
  waypointX: number | null
  waypointZ: number | null
  sensitivity: number
  fov: number
  showFps: boolean
  showMinimap: boolean
  godMode: boolean
  inventory: InventoryItem[]
  showInventory: boolean

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
  addArmor: (amount: number) => void
  setFuel: (f: number) => void
  drainFuel: (amount: number) => void
  addFuel: (amount: number) => void
  setMinimapDots: (dots: MinimapDot[]) => void
  setPlayerPos: (x: number, z: number) => void
  setFps: (fps: number) => void
  setQuality: (q: GraphicsQuality) => void
  resetGame: () => void
  initFromSettings: (health: number, money: number, ammo: number) => void
  triggerRestart: () => void
  tickRestart: () => void
  setPaused: (v: boolean) => void
  setShowFullMap: (v: boolean) => void
  setInteractionPrompt: (p: string | null) => void
  openStore: (type: ShopType) => void
  closeStore: () => void
  enterHouse: (id: string) => void
  exitHouse: () => void
  setWaypoint: (x: number, z: number) => void
  clearWaypoint: () => void
  setSensitivity: (v: number) => void
  setFov: (v: number) => void
  setShowFps: (v: boolean) => void
  setShowMinimap: (v: boolean) => void
  setGodMode: (v: boolean) => void
  addInventoryItem: (item: InventoryItem) => void
  removeInventoryItem: (id: string, qty?: number) => void
  useInventoryItem: (id: string) => void
  setShowInventory: (v: boolean) => void
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
  armor: 0,
  playerFuel: 100,
  minimapDots: [],
  playerX: 5,
  playerZ: 5,
  fps: 0,
  quality: 'medium',
  serverRestartKey: 0,
  restartCountdown: null,
  isPaused: false,
  showFullMap: false,
  interactionPrompt: null,
  showStore: false,
  currentShopType: null,
  isInsideHouse: false,
  currentHouseId: null,
  waypointX: null,
  waypointZ: null,
  sensitivity: 1.0,
  fov: 68,
  showFps: true,
  showMinimap: true,
  godMode: false,
  inventory: DEFAULT_INVENTORY,
  showInventory: false,

  setHealth: (h) => set({ health: Math.max(0, Math.min(100, h)) }),
  takeDamage: (amount) =>
    set((s) => {
      if (s.godMode) return {}
      const armorAbsorb = s.armor > 0 ? Math.min(s.armor, amount * 0.6) : 0
      const actualDmg = amount - armorAbsorb
      const armor = Math.max(0, s.armor - armorAbsorb)
      const health = Math.max(0, s.health - actualDmg)
      return { health, armor, isGameOver: health <= 0 }
    }),
  addMoney: (amount) => set((s) => ({ money: s.money + amount })),
  setWantedLevel: (w) => set({ wantedLevel: Math.max(0, Math.min(5, w)) }),
  incrementWanted: () =>
    set((s) => {
      if (s.godMode) return {}
      return { wantedLevel: Math.min(5, s.wantedLevel + 1) }
    }),
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
  addAmmo: (amount) => set((s) => ({ ammo: Math.min(999, s.ammo + amount) })),
  addArmor: (amount) => set((s) => ({ armor: Math.min(100, s.armor + amount) })),
  setFuel: (f) => set({ playerFuel: Math.max(0, Math.min(100, f)) }),
  drainFuel: (amount) => set((s) => ({ playerFuel: Math.max(0, s.playerFuel - amount) })),
  addFuel: (amount) => set((s) => ({ playerFuel: Math.min(100, s.playerFuel + amount) })),
  setMinimapDots: (dots) => set({ minimapDots: dots }),
  setPlayerPos: (x, z) => set({ playerX: x, playerZ: z }),
  setFps: (fps) => set({ fps }),
  setQuality: (quality) => set({ quality }),
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
      armor: 0,
      playerFuel: 100,
      isPaused: false,
      showFullMap: false,
      showStore: false,
      isInsideHouse: false,
      currentHouseId: null,
      interactionPrompt: null,
      waypointX: null,
      waypointZ: null,
      godMode: false,
      showInventory: false,
      inventory: DEFAULT_INVENTORY,
    }),
  initFromSettings: (health, money, ammo) =>
    set({ health, money, ammo }),
  triggerRestart: () => set({ restartCountdown: 3 }),
  tickRestart: () => {
    const { restartCountdown } = get()
    if (restartCountdown === null) return
    if (restartCountdown <= 1) {
      set({
        restartCountdown: null,
        serverRestartKey: get().serverRestartKey + 1,
        wantedLevel: 0,
        score: 0,
        timeOfDay: 10,
        isGameOver: false,
        inVehicle: false,
      })
    } else {
      set({ restartCountdown: restartCountdown - 1 })
    }
  },
  setPaused: (v) => set({ isPaused: v }),
  setShowFullMap: (v) => set({ showFullMap: v }),
  setInteractionPrompt: (p) => set({ interactionPrompt: p }),
  openStore: (type) => set({ showStore: true, currentShopType: type }),
  closeStore: () => set({ showStore: false, currentShopType: null }),
  enterHouse: (id) => set({ isInsideHouse: true, currentHouseId: id }),
  exitHouse: () => set({ isInsideHouse: false, currentHouseId: null }),
  setWaypoint: (x, z) => set({ waypointX: x, waypointZ: z }),
  clearWaypoint: () => set({ waypointX: null, waypointZ: null }),
  setSensitivity: (v) => set({ sensitivity: Math.max(0.2, Math.min(3.0, v)) }),
  setFov: (v) => set({ fov: Math.max(45, Math.min(100, v)) }),
  setShowFps: (v) => set({ showFps: v }),
  setShowMinimap: (v) => set({ showMinimap: v }),
  setGodMode: (v) => set({ godMode: v }),

  addInventoryItem: (item) =>
    set((s) => {
      const existing = s.inventory.find(i => i.id === item.id)
      if (existing && item.stackable) {
        return {
          inventory: s.inventory.map(i =>
            i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
          ),
        }
      }
      if (existing) return {}
      return { inventory: [...s.inventory, item] }
    }),

  removeInventoryItem: (id, qty = 1) =>
    set((s) => {
      const item = s.inventory.find(i => i.id === id)
      if (!item) return {}
      if (item.quantity <= qty) {
        return { inventory: s.inventory.filter(i => i.id !== id) }
      }
      return {
        inventory: s.inventory.map(i =>
          i.id === id ? { ...i, quantity: i.quantity - qty } : i
        ),
      }
    }),

  useInventoryItem: (id) => {
    const { inventory, health, wantedLevel } = get()
    const item = inventory.find(i => i.id === id)
    if (!item || item.quantity <= 0) return
    if (item.type === 'consumable') {
      if (item.useValue) {
        get().setHealth(Math.min(100, health + item.useValue))
      }
      get().removeInventoryItem(id, 1)
    } else if (item.type === 'equipment' && item.id === 'id_card') {
      if (wantedLevel > 0) {
        get().decrementWanted()
        get().removeInventoryItem(id, 1)
      }
    }
  },

  setShowInventory: (v) => set({ showInventory: v }),
}))
