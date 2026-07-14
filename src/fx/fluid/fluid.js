import * as THREE from 'three'
import { baseVert, splatFrag, advectFrag, divergenceFrag, pressureFrag, gradientFrag, clearFrag } from './shaders.js'

export function createFluid(renderer, { simRes = 128, dyeRes = 256 } = {}) {
  const opt = {
    type: THREE.HalfFloatType, format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false,
  }
  const fbo = (w, h) => new THREE.WebGLRenderTarget(w, h, opt)
  const dbl = (w, h) => ({
    read: fbo(w, h), write: fbo(w, h),
    swap() { const t = this.read; this.read = this.write; this.write = t },
  })

  const velocity = dbl(simRes, simRes)
  const pressure = dbl(simRes, simRes)
  const divergence = fbo(simRes, simRes)
  const dye = dbl(dyeRes, dyeRes)

  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const scene = new THREE.Scene()
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2))
  scene.add(quad)

  const U = (v) => ({ value: v })
  const mk = (frag, uniforms) => new THREE.RawShaderMaterial({
    vertexShader: baseVert, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false,
  })
  const simTexel = new THREE.Vector2(1 / simRes, 1 / simRes)
  const mats = {
    splat: mk(splatFrag, { uTarget: U(null), uPoint: U(new THREE.Vector2()), uColor: U(new THREE.Vector3()), uRadius: U(0.0022), uAspect: U(1) }),
    advect: mk(advectFrag, { uVelocity: U(null), uSource: U(null), uTexel: U(simTexel), uDt: U(0), uDissipation: U(1) }),
    divergence: mk(divergenceFrag, { uVelocity: U(null), uTexel: U(simTexel) }),
    pressure: mk(pressureFrag, { uPressure: U(null), uDivergence: U(null), uTexel: U(simTexel) }),
    gradient: mk(gradientFrag, { uPressure: U(null), uVelocity: U(null), uTexel: U(simTexel) }),
    clear: mk(clearFrag, { uTexture: U(null), uValue: U(0.8) }),
  }

  function pass(mat, target) {
    quad.material = mat
    renderer.setRenderTarget(target)
    renderer.render(scene, cam)
  }

  const params = { velDissipation: 0.998, dyeDissipation: 0.988, force: 0.18, radius: 0.0032 }
  const color = new THREE.Color()

  function splat(x, y, dx, dy, time) {
    const s = mats.splat
    s.uniforms.uAspect.value = innerWidth / innerHeight
    s.uniforms.uRadius.value = params.radius
    s.uniforms.uPoint.value.set(x, y)
    s.uniforms.uTarget.value = velocity.read.texture
    s.uniforms.uColor.value.set(dx, dy, 0)
    pass(s, velocity.write); velocity.swap()

    // hue locked to the brand band (teal → indigo) instead of a full rainbow cycle
    color.setHSL(0.56 + 0.12 * Math.sin(time * 0.15), 0.9, 0.55)
    const k = Math.min(1, Math.hypot(dx, dy) * 0.004)
    s.uniforms.uTarget.value = dye.read.texture
    s.uniforms.uColor.value.set(color.r * k, color.g * k, color.b * k)
    pass(s, dye.write); dye.swap()
  }

  function update(dt, time, pointer) {
    const prevAutoClear = renderer.autoClear
    renderer.autoClear = false

    const speed = Math.hypot(pointer.vx, pointer.vy)
    if (speed > 2) splat(pointer.nx, pointer.ny, pointer.vx * params.force, -pointer.vy * params.force, time)

    // ambient wandering splat — keeps the hero alive with no pointer input
    const ax = 0.5 + 0.3 * Math.sin(time * 0.21) + 0.06 * Math.sin(time * 0.9)
    const ay = 0.45 + 0.24 * Math.sin(time * 0.33 + 1.7)
    splat(ax, ay, 60 * Math.cos(time * 0.21), 48 * Math.cos(time * 0.33 + 1.7), time + 20)

    const a = mats.advect
    a.uniforms.uDt.value = dt
    a.uniforms.uVelocity.value = velocity.read.texture
    a.uniforms.uSource.value = velocity.read.texture
    a.uniforms.uDissipation.value = params.velDissipation
    pass(a, velocity.write); velocity.swap()

    mats.divergence.uniforms.uVelocity.value = velocity.read.texture
    pass(mats.divergence, divergence)

    mats.clear.uniforms.uTexture.value = pressure.read.texture
    pass(mats.clear, pressure.write); pressure.swap()

    for (let i = 0; i < 20; i++) {
      mats.pressure.uniforms.uPressure.value = pressure.read.texture
      mats.pressure.uniforms.uDivergence.value = divergence.texture
      pass(mats.pressure, pressure.write); pressure.swap()
    }

    mats.gradient.uniforms.uPressure.value = pressure.read.texture
    mats.gradient.uniforms.uVelocity.value = velocity.read.texture
    pass(mats.gradient, velocity.write); velocity.swap()

    a.uniforms.uVelocity.value = velocity.read.texture
    a.uniforms.uSource.value = dye.read.texture
    a.uniforms.uDissipation.value = params.dyeDissipation
    pass(a, dye.write); dye.swap()

    renderer.setRenderTarget(null)
    renderer.autoClear = prevAutoClear
  }

  return { update, getTexture: () => dye.read.texture, params }
}
