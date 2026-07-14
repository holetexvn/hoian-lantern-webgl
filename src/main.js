import * as THREE from 'three'
import { createStage } from './core/stage.js'
import { createPointer } from './core/pointer.js'
import { detectQuality } from './core/quality.js'
import { state } from './core/state.js'

const cfg = detectQuality()
const stage = createStage(document.querySelector('#stage'), cfg.dpr)
const { renderer, scene, camera } = stage
const pointer = createPointer()

// TEMP test cube — removed in Task 3
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1.5, 1.5, 1.5),
  new THREE.MeshStandardMaterial({ color: 0x7df2ff, metalness: 0.8, roughness: 0.3 })
)
scene.add(cube)

addEventListener('resize', () => stage.resize())

const clock = new THREE.Clock()
let elapsed = 0
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05)
  elapsed += dt
  pointer.update(dt)

  // FX UPDATE (tasks append blocks here)
  cube.rotation.set(elapsed * 0.4, elapsed * 0.6, 0)

  camera.lookAt(0, 0.4 * state.reveal + 0.5 * state.explode, 0)
  renderer.render(scene, camera)
  requestAnimationFrame(frame)
}
frame()
