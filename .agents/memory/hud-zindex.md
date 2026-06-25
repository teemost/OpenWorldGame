---
name: HUD z-index vs TouchControls
description: TouchControls full-screen overlay at zIndex:400 blocks HUD buttons on mobile; interactive HUD elements need zIndex≥1000
---

## The rule
Any HUD element that must be clickable/tappable on mobile must use `zIndex ≥ 1000`.

**Why:** TouchControls (`src/game/TouchControls.tsx`) renders a full-screen `position:fixed, inset:0` overlay at `zIndex:400` with `pointerEvents:'auto'`. This overlay is rendered AFTER HUD in the DOM (App.tsx order: `<HUD />` then `<TouchControls />`), so it sits on top of anything in HUD at the same z-index. The admin dropdown button was at `zIndex:400` — same level — making it unclickable on touch devices.

**How to apply:**
- Admin button: `zIndex: 1000`
- Admin dropdown panel: `zIndex: 1000`
- Any future interactive HUD overlay (modals, popups, context menus): `zIndex ≥ 1000`
- TouchControls max z-index is ~910, so 1000 clears it safely.
