// Scroll-driven shared state. Tweened by core/scroll.js, read everywhere else.
export const state = {
  fluid: 1,   // hero fluid opacity 1→0
  reveal: 0,  // chip rise / light up 0→1
  explode: 0, // layer separation 0→1→0
  flow: 0,    // particle stream intensity 0→1
  shift: 0,   // lookAt x offset — pushes the chip off-center away from the copy column
  lift: 0,    // lookAt y offset — drops the chip toward the bottom of the frame (specs act)
}
