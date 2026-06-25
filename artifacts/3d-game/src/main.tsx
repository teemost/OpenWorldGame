import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress known Three.js r184 upstream deprecation warnings that auto-correct
// themselves (PCFSoftShadowMap → PCFShadowMap, Clock → Timer). These are
// informational only and do not affect runtime behaviour.
const _warn = console.warn.bind(console)
console.warn = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : ''
  if (msg.includes('PCFSoftShadowMap has been deprecated')) return
  if (msg.includes('THREE.Clock: This module has been deprecated')) return
  _warn(...args)
}

createRoot(document.getElementById("root")!).render(<App />);
