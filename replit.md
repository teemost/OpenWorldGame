# Open World Crime City

A 3D browser-based open-world crime simulation game (GTA-style) built with React and Three.js. Players navigate a city, drive vehicles, interact with NPCs, and face a wanted system. Includes an admin dashboard for live game configuration and custom 3D model uploads.

## Run & Operate

- `PORT=24982 BASE_PATH=/ pnpm --filter @workspace/3d-game run dev` — run the game (port 24982)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (only needed if running the API server with DB)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Game: React 19, Three.js, @react-three/fiber, @react-three/drei, Zustand
- UI: Tailwind CSS 4, Radix UI, Framer Motion, Wouter (routing)
- API: Express 5, Pino logging
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod, drizzle-zod
- Build: Vite (frontend), esbuild (API server)

## Where things live

- `artifacts/3d-game/` — main game frontend (Vite SPA)
  - `src/game/` — core 3D scene, city data, controls
  - `src/auth/` — custom localStorage-based auth (login/register)
  - `src/admin/` — admin dashboard for live tuning and model uploads
  - `src/store/` — Zustand stores
- `artifacts/api-server/` — Express backend
- `lib/db/` — Drizzle schema and migrations
- `lib/api-spec/` — OpenAPI definition
- `lib/api-client-react/` — generated API hooks

## Architecture decisions

- Auth is custom localStorage-based (no external provider). Passwords are Base64-hashed client-side. Suitable for a game prototype.
- 3D model assets are stored in IndexedDB via the admin panel — no backend asset server needed.
- Vite requires `PORT` and `BASE_PATH` env vars at startup (validated at boot).
- Game frontend runs on port 24982; API server on port 5000 (separate workflows).

## Product

- Open-world 3D crime city game playable in the browser
- Player movement, vehicles, NPC encounters, wanted/combat system
- Admin dashboard for real-time game settings and custom 3D model management
- Mobile touch controls with landscape enforcement

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always provide `PORT` and `BASE_PATH` when starting the 3d-game Vite server or it will throw on startup.
- The hardcoded admin account email is `agboolasamul09@gmail.com` with password `admin123`.
- `DATABASE_URL` is only required if running the API server; the game itself runs without it.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
