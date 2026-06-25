// Shared mutable touch input state — written by TouchControls, read by Player each frame.
export const touchState = {
  // Joystick Y-axis
  forward: false,
  back: false,
  // Joystick X-axis — used for VEHICLE steering (in-vehicle) and on-foot STRAFE
  left: false,       // vehicle steer left
  right: false,      // vehicle steer right
  strafeLeft: false, // on-foot strafe left
  strafeRight: false,// on-foot strafe right
  // Buttons
  shoot: false,
  enter: false,
  run: false,
  // Right-side drag: accumulated pixel delta since last frame, consumed by Player
  camDx: 0, // horizontal look (yaw)
  camDy: 0, // vertical look (pitch)
}
