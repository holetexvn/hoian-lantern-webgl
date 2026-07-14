import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { createTraceTexture, createLidTexture, addTracePulse } from './materials.js'

// Closed-stack Y positions: each layer rests on the previous one (no gaps).
const BASE_Y = { substrate: 0, interposer: 0.13, cache: 0.24, die: 0.25, heatspreader: 0.44 }
const EXPLODE_Y = { substrate: -1.15, interposer: -0.45, cache: 0.4, die: 1.0, heatspreader: 2.1 }

export function createChip() {
  const group = new THREE.Group()
  const layers = {}
  const pulsed = []

  // substrate: PCB + BGA pin grid
  const substrate = new THREE.Group()
  const pcbMat = new THREE.MeshStandardMaterial({
    color: 0x0a1a13, roughness: 0.55, metalness: 0.25,
    emissive: 0xffffff, emissiveMap: createTraceTexture(1337), emissiveIntensity: 1.0,
  })
  addTracePulse(pcbMat); pulsed.push(pcbMat)
  substrate.add(new THREE.Mesh(new RoundedBoxGeometry(4, 0.16, 4, 2, 0.04), pcbMat))
  const pins = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.028, 0.028, 0.1, 6),
    new THREE.MeshStandardMaterial({ color: 0xd8b96a, roughness: 0.35, metalness: 1 }),
    900
  )
  const m = new THREE.Matrix4()
  let i = 0
  for (let gx = 0; gx < 30; gx++)
    for (let gz = 0; gz < 30; gz++) {
      m.setPosition(-1.85 + gx * (3.7 / 29), -0.13, -1.85 + gz * (3.7 / 29))
      pins.setMatrixAt(i++, m)
    }
  substrate.add(pins)

  const interposer = new THREE.Mesh(
    new RoundedBoxGeometry(3.1, 0.1, 3.1, 2, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x2b2437, roughness: 0.3, metalness: 0.6 })
  )

  const dieMat = new THREE.MeshStandardMaterial({
    color: 0x101226, roughness: 0.25, metalness: 0.7,
    emissive: 0xffffff, emissiveMap: createTraceTexture(777, 512, '#9a6bff'), emissiveIntensity: 1.4,
  })
  addTracePulse(dieMat); pulsed.push(dieMat)
  const die = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 2.4), dieMat)

  const cache = new THREE.Group()
  const cacheMat = new THREE.MeshStandardMaterial({
    color: 0x0b1d22, roughness: 0.42, metalness: 0.55, emissive: 0x14b8a6, emissiveIntensity: 0.18,
  })
  const cacheGeo = new THREE.BoxGeometry(0.6, 0.12, 2.4)
  const cacheL = new THREE.Mesh(cacheGeo, cacheMat); cacheL.position.x = -1.15
  const cacheR = new THREE.Mesh(cacheGeo, cacheMat); cacheR.position.x = 1.15
  cache.add(cacheL, cacheR)

  const heatspreader = new THREE.Mesh(
    new RoundedBoxGeometry(3.4, 0.26, 3.4, 3, 0.08),
    new THREE.MeshStandardMaterial({ map: createLidTexture(), roughness: 0.38, metalness: 0.9, envMapIntensity: 0.7 })
  )

  const defs = { substrate, interposer, cache, die, heatspreader }
  for (const [k, obj] of Object.entries(defs)) {
    obj.position.y = BASE_Y[k]
    layers[k] = obj
    group.add(obj)
  }

  function setExplode(t) {
    const e = t * t * (3 - 2 * t)
    for (const k of Object.keys(layers)) layers[k].position.y = BASE_Y[k] + EXPLODE_Y[k] * e
    cacheL.position.x = -1.15 - 0.5 * e
    cacheR.position.x = 1.15 + 0.5 * e
  }

  function setReveal(t) {
    group.position.y = -5.6 * (1 - t * t)
    for (const mt of pulsed) mt.emissiveIntensity = 0.1 + 1.3 * t
  }

  function update(time) {
    for (const mt of pulsed) if (mt.userData.uTime) mt.userData.uTime.value = time
  }

  return { group, layers, setExplode, setReveal, update }
}
