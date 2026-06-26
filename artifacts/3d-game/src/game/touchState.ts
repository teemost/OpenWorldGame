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
  // Shoot joystick (right-side twin-stick aiming)
  shootJoyX: 0,    // normalized -1..1, right = positive
  shootJoyY: 0,    // normalized -1..1, down = positive (up = negative)
  shootAiming: false,
  shootDist: 0,    // normalized 0..1 drag distance
}
