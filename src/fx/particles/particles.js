import * as THREE from 'three'
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js'
import { velFrag, posFrag, pointsVert, pointsFrag } from './shaders.js'

export function createParticles(renderer, count = 50000) {
  const size = Math.ceil(Math.sqrt(count))
  const total = size * size
  const gpu = new GPUComputationRenderer(size, size, renderer)

  const pos0 = gpu.createTexture()
  const vel0 = gpu.createTexture()
  const pd = pos0.image.data
  for (let i = 0; i < total; i++) {
    pd[i * 4 + 0] = -6 + Math.random() * 12
    pd[i * 4 + 1] = (Math.random() - 0.5) * 2.6
    pd[i * 4 + 2] = (Math.random() - 0.5) * 2.6
    pd[i * 4 + 3] = Math.random() * 1.2
  }

  const velVar = gpu.addVariable('textureVel', velFrag, vel0)
  const posVar = gpu.addVariable('texturePos', posFrag, pos0)
  gpu.setVariableDependencies(velVar, [velVar, posVar])
  gpu.setVariableDependencies(posVar, [velVar, posVar])

  const params = { curl: 1.6, speed: 1.0, size: 26 }
  Object.assign(velVar.material.uniforms, {
    uTime: { value: 0 }, uDt: { value: 0 },
    uCurl: { value: params.curl }, uSpeed: { value: params.speed },
    uCursor: { value: new THREE.Vector3(0, 0, 100) },
  })
  Object.assign(posVar.material.uniforms, { uTime: { value: 0 }, uDt: { value: 0 } })

  const err = gpu.init()
  if (err !== null) console.error('[particles] GPUComputationRenderer:', err)

  const geo = new THREE.BufferGeometry()
  const positions = new Float32Array(total * 3)
  const refs = new Float32Array(total * 2)
  for (let i = 0; i < total; i++) {
    refs[i * 2 + 0] = (i % size) / size + 0.5 / size
    refs[i * 2 + 1] = Math.floor(i / size) / size + 0.5 / size
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('ref', new THREE.BufferAttribute(refs, 2))

  const mat = new THREE.ShaderMaterial({
    vertexShader: pointsVert, fragmentShader: pointsFrag,
    uniforms: { uPos: { value: null }, uVel: { value: null }, uSize: { value: params.size }, uOpacity: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  })
  const points = new THREE.Points(geo, mat)
  points.frustumCulled = false
  points.visible = false

  function update(dt, time, cursor, strength) {
    velVar.material.uniforms.uTime.value = time
    velVar.material.uniforms.uDt.value = dt
    velVar.material.uniforms.uCurl.value = params.curl
    velVar.material.uniforms.uSpeed.value = params.speed
    velVar.material.uniforms.uCursor.value.copy(cursor)
    posVar.material.uniforms.uTime.value = time
    posVar.material.uniforms.uDt.value = dt
    gpu.compute()
    mat.uniforms.uPos.value = gpu.getCurrentRenderTarget(posVar).texture
    mat.uniforms.uVel.value = gpu.getCurrentRenderTarget(velVar).texture
    mat.uniforms.uSize.value = params.size
    mat.uniforms.uOpacity.value = strength
  }

  return { points, update, params }
}
