import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

export function createStage(canvas, dpr) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(dpr)
  renderer.setSize(innerWidth, innerHeight)
  renderer.toneMapping = THREE.ACESFilmicToneMapping

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x030308)

  const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 80)
  camera.position.set(0, 1.1, 9)
  scene.add(camera) // so children attached to camera render

  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.06).texture
  scene.environmentIntensity = 0.5

  const lights = {
    key: new THREE.DirectionalLight(0xd8e6ff, 2.2),
    rim: new THREE.DirectionalLight(0x8a5cff, 3.0),
    amb: new THREE.AmbientLight(0x222233, 0.6),
  }
  lights.key.position.set(4, 6, 5)
  lights.rim.position.set(-5, 3, -6)
  scene.add(lights.key, lights.rim, lights.amb)

  function resize() {
    camera.aspect = innerWidth / innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(innerWidth, innerHeight)
  }
  return { renderer, scene, camera, lights, resize }
}
