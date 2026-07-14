import * as THREE from 'three'
import { createStage } from './core/stage.js'
import { createPointer } from './core/pointer.js'
import { detectQuality } from './core/quality.js'
import { state } from './core/state.js'
import { createChip } from './chip/chip.js'
import { initScroll } from './core/scroll.js'
import { createAnnotations } from './ui/annotations.js'
import { createFluid } from './fx/fluid/fluid.js'

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

const fluid = createFluid(renderer, { simRes: cfg.fluidSim, dyeRes: cfg.fluidDye })
const fluidPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({
    map: fluid.getTexture(), transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false,
  })
)
fluidPlane.renderOrder = 5
fluidPlane.position.set(0, 0, -9)
camera.add(fluidPlane)
function fitFluidPlane() {
  const h = 2 * 9 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  fluidPlane.scale.set(h * camera.aspect, h, 1)
}
fitFluidPlane()

addEventListener('resize', () => { stage.resize(); fitFluidPlane() })

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

  if (state.fluid > 0.01) {
    fluid.update(dt, elapsed, pointer)
    fluidPlane.material.map = fluid.getTexture()
    fluidPlane.material.opacity = state.fluid
    fluidPlane.visible = true
  } else {
    fluidPlane.visible = false
  }

  camera.lookAt(0, 0.4 * state.reveal + 0.5 * state.explode, 0)
  stage.gradePass.uniforms.uTime.value = elapsed
  stage.composer.render()
  requestAnimationFrame(frame)
}
if (new URLSearchParams(location.search).has('debug')) window.__tick = frame
frame()
