import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime; varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float d = distance(vUv, vec2(0.5));
      c.rgb *= smoothstep(0.92, 0.32, d) * 0.35 + 0.65;
      c.rgb += (hash(vUv * 917.0 + fract(uTime) * 91.0) - 0.5) * 0.04;
      gl_FragColor = c;
    }`,
}

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
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.5

  const lights = {
    key: new THREE.DirectionalLight(0xd8e6ff, 2.2),
    rim: new THREE.DirectionalLight(0x8a5cff, 3.0),
    amb: new THREE.AmbientLight(0x222233, 0.6),
  }
  lights.key.position.set(4, 6, 5)
  lights.rim.position.set(-5, 3, -6)
  scene.add(lights.key, lights.rim, lights.amb)

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.9, 0.65, 0.72)
  composer.addPass(bloomPass)
  const gradePass = new ShaderPass(GradeShader)
  composer.addPass(gradePass)
  composer.addPass(new OutputPass())

  function resize() {
    camera.aspect = innerWidth / innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(innerWidth, innerHeight)
    composer.setSize(innerWidth, innerHeight)
  }
  return { renderer, scene, camera, lights, composer, bloomPass, gradePass, resize }
}
