// Shared mutable touch input state — written by TouchControls, read by Player each frame.
export const touchState = {
  // Joystick Y-axis
  forward: false,
  back: false,
  // On-foot strafe (corrected: joystick right → strafeRight)
  strafeLeft: false,
  strafeRight: false,
  // Vehicle steering (original direction: joystick left → vehicleLeft)
  vehicleLeft: false,
  vehicleRight: false,
  // Legacy aliases used in vehicle controls
  left: false,
  right: false,
  // Buttons
  shoot: false,
  enter: false,
  run: false,
  // Right-side drag: accumulated pixel delta since last frame, consumed by Player
  camDx: 0, // horizontal look (yaw)
  camDy: 0, // vertical look (pitch)
}
