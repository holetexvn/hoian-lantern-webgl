import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { Reflector } from 'three/addons/objects/Reflector.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

const canvas = document.querySelector('#stage')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05

const scene = new THREE.Scene()
// night sky: deep indigo fading to a warm town-glow horizon
const bg = document.createElement('canvas')
bg.width = 16; bg.height = 512
const bgc = bg.getContext('2d')
const grad = bgc.createLinearGradient(0, 0, 0, 512)
grad.addColorStop(0, '#0b0e22')
grad.addColorStop(0.55, '#171a36')
grad.addColorStop(0.88, '#241f38')
grad.addColorStop(1, '#191624')
bgc.fillStyle = grad
bgc.fillRect(0, 0, 16, 512)
const bgTex = new THREE.CanvasTexture(bg)
bgTex.colorSpace = THREE.SRGBColorSpace
scene.background = bgTex

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100)
camera.position.set(5.4, 3.1, 6.8)

const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
scene.environmentIntensity = 0.22

// moonlight + warm town glow
const moon = new THREE.DirectionalLight(0x8fa4ff, 0.55)
moon.position.set(-4, 8, -3)
const warmA = new THREE.PointLight(0xffa050, 26, 14, 2)
warmA.position.set(1.6, 1.6, 2.2)
const warmB = new THREE.PointLight(0xff7a3c, 14, 12, 2)
warmB.position.set(-1.8, 1.2, -1.6)
const hemi = new THREE.HemisphereLight(0x35406e, 0x40241c, 0.85)
scene.add(moon, warmA, warmB, hemi)

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.45, 0.55, 0.62)
composer.addPass(bloom)
composer.addPass(new OutputPass())

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 0.85, 0)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.autoRotate = true
controls.autoRotateSpeed = 0.55
controls.minDistance = 3.5
controls.maxDistance = 14
controls.maxPolarAngle = Math.PI / 2 - 0.02
controls.enablePan = false
let resumeTimer
controls.addEventListener('start', () => { controls.autoRotate = false; clearTimeout(resumeTimer) })
controls.addEventListener('end', () => { resumeTimer = setTimeout(() => { controls.autoRotate = true }, 4000) })

// loading overlay
const loaderEl = document.querySelector('#loader')
const fillEl = document.querySelector('#loader-fill')
const pctEl = document.querySelector('#loader-pct')
const manager = new THREE.LoadingManager()
manager.onProgress = (_url, loaded, total) => {
  const pct = Math.round((loaded / total) * 100)
  fillEl.style.width = `${pct}%`
  pctEl.textContent = `${pct}%`
}
manager.onLoad = () => { loaderEl.classList.add('done') }

// the diorama — normalized to ~5.4 world units wide, base resting at y=0
let waterY = 0
new GLTFLoader(manager).load('/models/hoian.glb', (gltf) => {
  const model = gltf.scene
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  const scale = 5.4 / Math.max(size.x, size.z)
  model.scale.setScalar(scale)
  const scaled = new THREE.Box3().setFromObject(model)
  const center = scaled.getCenter(new THREE.Vector3())
  model.position.x -= center.x
  model.position.z -= center.z
  model.position.y -= scaled.min.y
  scene.add(model)
})

// HoleTex signboard — lacquered wood, gold lettering, hung above the front door
function signTexture() {
  const c = document.createElement('canvas')
  c.width = 1024; c.height = 288
  const g = c.getContext('2d')
  const wood = g.createLinearGradient(0, 0, 0, 288)
  wood.addColorStop(0, '#4a1a12')
  wood.addColorStop(0.5, '#331109')
  wood.addColorStop(1, '#260c07')
  g.fillStyle = wood
  g.fillRect(0, 0, 1024, 288)
  g.strokeStyle = '#c89b52'
  g.lineWidth = 6
  g.strokeRect(18, 18, 988, 252)
  g.lineWidth = 2
  g.strokeRect(34, 34, 956, 220)
  g.fillStyle = '#f2c66b'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.shadowColor = 'rgba(255,190,90,0.55)'
  g.shadowBlur = 26
  g.font = '600 150px Georgia, "Times New Roman", serif'
  g.fillText('HoleTex', 512, 138)
  g.shadowBlur = 0
  g.font = '24px Georgia, serif'
  g.fillText('◆', 92, 144)
  g.fillText('◆', 932, 144)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}
const sign = new THREE.Group()
const signBoard = new THREE.Mesh(
  new THREE.PlaneGeometry(1.0, 0.28),
  new THREE.MeshBasicMaterial({ map: signTexture() })
)
signBoard.position.y = -0.14 // pivot at the top edge so it swings like a hung sign
sign.add(signBoard)
// clear wall strip between the lantern wire and the upper windows (probed via raycast)
sign.position.set(0.78, 2.5, -0.2)
scene.add(sign)

// mirror-calm river surface all around the diorama
const water = new Reflector(new THREE.CircleGeometry(60, 64), {
  textureWidth: Math.floor(innerWidth * Math.min(devicePixelRatio, 2) * 0.5),
  textureHeight: Math.floor(innerHeight * Math.min(devicePixelRatio, 2) * 0.5),
  color: 0x2a3145,
  clipBias: 0.003,
})
water.rotation.x = -Math.PI / 2
water.position.y = waterY - 0.02
scene.add(water)

// floating lotus lanterns (hoa đăng) drifting on the water
function glowTexture(inner, outer) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const rad = g.createRadialGradient(64, 64, 4, 64, 64, 62)
  rad.addColorStop(0, inner)
  rad.addColorStop(0.35, outer)
  rad.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = rad
  g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
const lanternColors = [
  ['rgba(255,235,200,1)', 'rgba(255,140,60,0.85)'],
  ['rgba(255,220,220,1)', 'rgba(255,70,90,0.85)'],
  ['rgba(230,255,250,1)', 'rgba(40,210,190,0.8)'],
  ['rgba(255,225,250,1)', 'rgba(230,80,200,0.8)'],
]
const floaters = []
const floaterGroup = new THREE.Group()
for (let i = 0; i < 42; i++) {
  const [inner, outer] = lanternColors[i % lanternColors.length]
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(inner, outer), transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, opacity: 0.9,
  }))
  const angle = Math.random() * Math.PI * 2
  const radius = 3.6 + Math.random() * 4.4
  const s = 0.22 + Math.random() * 0.2
  sprite.scale.set(s, s, 1)
  sprite.userData = { angle, radius, speed: 0.02 + Math.random() * 0.03, bob: Math.random() * Math.PI * 2 }
  floaters.push(sprite)
  floaterGroup.add(sprite)
}
scene.add(floaterGroup)

// fireflies drifting around the buildings
const fireflyCount = 60
const fireflyGeo = new THREE.BufferGeometry()
const fireflyPos = new Float32Array(fireflyCount * 3)
const fireflySeed = []
for (let i = 0; i < fireflyCount; i++) {
  fireflySeed.push({
    a: Math.random() * Math.PI * 2, r: 1.6 + Math.random() * 2.6,
    y: 0.4 + Math.random() * 2.6, p: Math.random() * Math.PI * 2,
  })
}
fireflyGeo.setAttribute('position', new THREE.BufferAttribute(fireflyPos, 3))
const fireflies = new THREE.Points(fireflyGeo, new THREE.PointsMaterial({
  map: glowTexture('rgba(255,250,220,1)', 'rgba(255,190,90,0.8)'),
  size: 0.09, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  color: 0xffd9a0, sizeAttenuation: true,
}))
scene.add(fireflies)

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
})

window.__dbg = { camera, controls, scene, THREE }

const clock = new THREE.Clock()
let t = 0
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05)
  t += dt

  for (const f of floaters) {
    const u = f.userData
    u.angle += u.speed * dt
    f.position.set(
      Math.cos(u.angle) * u.radius,
      0.05 + Math.sin(t * 0.9 + u.bob) * 0.015,
      Math.sin(u.angle) * u.radius
    )
  }
  for (let i = 0; i < fireflyCount; i++) {
    const s = fireflySeed[i]
    fireflyPos[i * 3 + 0] = Math.cos(s.a + t * 0.05) * s.r
    fireflyPos[i * 3 + 1] = s.y + Math.sin(t * 0.6 + s.p) * 0.22
    fireflyPos[i * 3 + 2] = Math.sin(s.a + t * 0.05) * s.r
  }
  fireflyGeo.attributes.position.needsUpdate = true

  warmA.intensity = 26 + Math.sin(t * 2.3) * 2.5   // gentle lantern flicker
  warmB.intensity = 14 + Math.sin(t * 1.7 + 1.2) * 1.6
  sign.rotation.x = Math.sin(t * 0.8) * 0.035 - 0.02  // sign swings gently in the breeze

  controls.update()
  composer.render()
  requestAnimationFrame(frame)
}
frame()
