import * as THREE from 'three'
import { createStage } from './core/stage.js'
import { createPointer } from './core/pointer.js'
import { detectQuality } from './core/quality.js'
import { state } from './core/state.js'
import { createChip } from './chip/chip.js'
import { initScroll } from './core/scroll.js'
import { createAnnotations } from './ui/annotations.js'

const cfg = detectQuality()
const stage = createStage(document.querySelector('#stage'), cfg.dpr)
const { renderer, scene, camera, composer, gradePass } = stage
const pointer = createPointer()

const chip = createChip()
scene.add(chip.group)
if (new URLSearchParams(location.search).has('debug')) window.__chip = chip
if (new URLSearchParams(location.search).has('debug')) window.__state = state
if (new URLSearchParams(location.search).has('debug')) window.__stage = stage

initScroll({ camera })

const annotations = createAnnotations(document.querySelector('#annotations'), chip, camera)

addEventListener('resize', () => stage.resize())

const clock = new THREE.Clock()
let elapsed = 0
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05)
  elapsed += dt
  pointer.update(dt)

  // FX UPDATE (tasks append blocks here)
  chip.update(elapsed)
  chip.setReveal(state.reveal)
  chip.setExplode(state.explode)
  chip.group.rotation.y = elapsed * 0.16 * (1 - 0.75 * state.explode) + 0.6 * state.explode
  stage.lights.key.intensity = 2.2 * (0.12 + 0.88 * state.reveal)
  stage.lights.rim.intensity = 3.0 * (0.25 + 0.75 * state.reveal)
  annotations.update(state.explode)

  camera.lookAt(0, 0.4 * state.reveal + 0.5 * state.explode, 0)
  stage.gradePass.uniforms.uTime.value = elapsed
  stage.composer.render()
  requestAnimationFrame(frame)
}
frame()
