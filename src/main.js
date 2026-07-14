import * as THREE from 'three'
import { createStage } from './core/stage.js'
import { createPointer } from './core/pointer.js'
import { detectQuality, createFpsGovernor } from './core/quality.js'
import { state } from './core/state.js'
import { createChip } from './chip/chip.js'
import { initScroll } from './core/scroll.js'
import { initCursor } from './fx/cursor.js'
import { createAnnotations } from './ui/annotations.js'
import { createFluid } from './fx/fluid/fluid.js'
import { createParticles } from './fx/particles/particles.js'

const gl2test = document.createElement('canvas').getContext('webgl2')
if (!gl2test || !gl2test.getExtension('EXT_color_buffer_float')) {
  document.querySelector('#fallback').hidden = false
  document.querySelector('#content').style.display = 'none'
  throw new Error('WebGL2 required')
}

const cfg = detectQuality()
const stage = createStage(document.querySelector('#stage'), cfg.dpr)
const { renderer, scene, camera, composer, gradePass } = stage
const pointer = createPointer()

const chip = createChip()
scene.add(chip.group)
if (new URLSearchParams(location.search).has('debug')) window.__chip = chip
if (new URLSearchParams(location.search).has('debug')) window.__state = state
if (new URLSearchParams(location.search).has('debug')) window.__stage = stage

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
initScroll({ camera, reduced })
initCursor()

const governor = createFpsGovernor((fps) => {
  console.warn(`[h1] avg ${fps.toFixed(0)} fps < 45 — reducing pixel ratio`)
  const lowered = Math.max(1, cfg.dpr - 0.5)
  renderer.setPixelRatio(lowered)
  stage.composer.setPixelRatio(lowered)
})

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

const particles = createParticles(renderer, cfg.particles)
scene.add(particles.points)
const cursorWorld = new THREE.Vector3(0, 0, 100)
const rayDir = new THREE.Vector3()
function updateCursorWorld() {
  rayDir.set(pointer.nx * 2 - 1, pointer.ny * 2 - 1, 0.5).unproject(camera).sub(camera.position).normalize()
  if (Math.abs(rayDir.z) < 1e-4) return
  const t = -camera.position.z / rayDir.z
  cursorWorld.copy(camera.position).addScaledVector(rayDir, t)
}

const debug = new URLSearchParams(location.search).has('debug')
if (debug) {
  window.__state = state
  window.__chip = chip
  const fpsEl = document.querySelector('#fps')
  fpsEl.hidden = false
  let acc = 0, n = 0
  setInterval(() => { if (n) fpsEl.textContent = `${(n / acc).toFixed(0)} fps · tier ${cfg.tier}`; acc = 0; n = 0 }, 500)
  window.__fpsSample = (dt) => { acc += dt; n++ }
  const { default: GUI } = await import('lil-gui')
  const gui = new GUI({ title: 'H1 debug' })
  gui.add(stage.bloomPass, 'strength', 0, 3).name('bloom')
  const f = gui.addFolder('fluid')
  f.add(fluid.params, 'force', 0, 1)
  f.add(fluid.params, 'radius', 0.0005, 0.01)
  f.add(fluid.params, 'dyeDissipation', 0.9, 1)
  const p = gui.addFolder('particles')
  p.add(particles.params, 'curl', 0, 5)
  p.add(particles.params, 'speed', 0, 3)
  p.add(particles.params, 'size', 5, 80)
}

addEventListener('resize', () => { stage.resize(); fitFluidPlane() })

const clock = new THREE.Clock()
let elapsed = 0
let chipAngle = 0
function frame() {
  if (document.hidden) { requestAnimationFrame(frame); return }
  const dt = Math.min(clock.getDelta(), 0.05)
  elapsed += dt
  pointer.update(dt)

  // FX UPDATE (tasks append blocks here)
  chip.update(elapsed)
  chip.setReveal(state.reveal)
  chip.setExplode(state.explode)
  chipAngle += dt * 0.16 * (1 - 0.75 * state.explode)
  chip.group.rotation.y = chipAngle + 0.6 * state.explode
  stage.lights.key.intensity = 1.7 * (0.12 + 0.88 * state.reveal)
  stage.lights.rim.intensity = 1.5 * (0.25 + 0.75 * state.reveal)
  annotations.update(state.explode)

  if (state.fluid > 0.01) {
    fluid.update(dt, elapsed, pointer)
    fluidPlane.material.map = fluid.getTexture()
    fluidPlane.material.opacity = state.fluid
    fluidPlane.visible = true
  } else {
    fluidPlane.visible = false
  }

  if (state.flow > 0.005) {
    updateCursorWorld()
    particles.update(dt, elapsed, cursorWorld, state.flow)
    particles.points.visible = true
  } else {
    particles.points.visible = false
  }

  camera.lookAt(state.shift, 0.2 + 0.2 * state.reveal + 0.35 * state.explode + state.lift, 0)
  governor(dt)
  if (window.__fpsSample) window.__fpsSample(dt)
  stage.gradePass.uniforms.uTime.value = elapsed
  stage.composer.render()
  requestAnimationFrame(frame)
}
if (new URLSearchParams(location.search).has('debug')) window.__tick = frame
frame()
