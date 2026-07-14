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

// sky lanterns (đèn trời) rising into the night
const skyLanterns = []
const skyGroup = new THREE.Group()
function lanternBodyTexture() {
  const c = document.createElement('canvas')
  c.width = 32; c.height = 64
  const g = c.getContext('2d')
  const gr = g.createLinearGradient(0, 64, 0, 0)
  gr.addColorStop(0, '#ffdf9e')
  gr.addColorStop(0.45, '#ff9e4a')
  gr.addColorStop(1, '#c74e28')
  g.fillStyle = gr
  g.fillRect(0, 0, 32, 64)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
const lanternTex = lanternBodyTexture()
const lanternGlowTex = glowTexture('rgba(255,225,170,1)', 'rgba(255,140,50,0.75)')
for (let i = 0; i < 22; i++) {
  const lantern = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.062, 0.15, 10, 1, true),
    new THREE.MeshBasicMaterial({ map: lanternTex, side: THREE.DoubleSide, transparent: true })
  )
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: lanternGlowTex, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, opacity: 0.85,
  }))
  glow.scale.set(0.34, 0.34, 1)
  lantern.add(body, glow)
  lantern.userData = {
    x: (Math.random() - 0.5) * 9,
    z: (Math.random() - 0.5) * 9,
    y: 2 + Math.random() * 7,
    rise: 0.14 + Math.random() * 0.14,
    sway: Math.random() * Math.PI * 2,
    body, glow,
  }
  skyLanterns.push(lantern)
  skyGroup.add(lantern)
}
scene.add(skyGroup)

// the night boat — a dark sampan with a warm lantern, circling like Tokyo's tram
function makeBoat() {
  const boat = new THREE.Group()
  const pts = []
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * Math.PI * 0.5
    pts.push(new THREE.Vector2(Math.sin(a) * 0.5, (1 - Math.cos(a)) * 0.28))
  }
  const hull = new THREE.Mesh(
    new THREE.LatheGeometry(pts, 20),
    new THREE.MeshStandardMaterial({ color: 0x0b0805, roughness: 0.75, metalness: 0.05, side: THREE.DoubleSide })
  )
  hull.rotation.x = Math.PI
  hull.position.y = 0.15
  hull.scale.set(2.2, 0.5, 0.4) // long, low sampan silhouette
  boat.add(hull)
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.55, 6),
    new THREE.MeshStandardMaterial({ color: 0x241608, roughness: 0.8 })
  )
  pole.position.set(-0.75, 0.35, 0)
  boat.add(pole)
  const boatGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture('rgba(255,230,180,1)', 'rgba(255,120,50,0.8)'),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }))
  boatGlow.scale.set(0.42, 0.42, 1)
  boatGlow.position.set(-0.75, 0.68, 0)
  boat.add(boatGlow)
  const boatLight = new THREE.PointLight(0xffa050, 3.2, 4, 2)
  boatLight.position.set(-0.75, 0.68, 0)
  boat.add(boatLight)
  return boat
}
const boat1 = makeBoat()
const boat2 = makeBoat()
boat2.scale.setScalar(0.8)
scene.add(boat1, boat2)

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

// cinematic intro: glide up from the water to the hero view
const intro = {
  active: true, k: 0,
  from: new THREE.Vector3(7.6, 0.55, 8.2),
  to: new THREE.Vector3(5.4, 3.1, 6.8),
  tFrom: new THREE.Vector3(0, 1.4, 0),
  tTo: new THREE.Vector3(0, 0.85, 0),
}
camera.position.copy(intro.from)
controls.target.copy(intro.tFrom)
addEventListener('pointerdown', () => { intro.active = false }, { once: true })

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

  // sky lanterns rise, sway, fade out high and respawn low
  for (const l of skyLanterns) {
    const u = l.userData
    u.y += u.rise * dt
    if (u.y > 10) {
      u.y = 1.6 + Math.random() * 1.2
      u.x = (Math.random() - 0.5) * 9
      u.z = (Math.random() - 0.5) * 9
    }
    l.position.set(u.x + Math.sin(t * 0.4 + u.sway) * 0.35, u.y, u.z + Math.cos(t * 0.3 + u.sway) * 0.3)
    const fade = Math.min(1, (u.y - 1.4) / 0.8) * Math.max(0, Math.min(1, (10 - u.y) / 2.5))
    u.body.material.opacity = fade
    u.glow.material.opacity = 0.85 * fade * (0.85 + Math.sin(t * 5 + u.sway) * 0.15)
  }

  // boats circle the diorama like the Tokyo tram
  const a1 = t * 0.07
  boat1.position.set(Math.cos(a1) * 4.7, 0.01 + Math.sin(t * 0.8) * 0.012, Math.sin(a1) * 4.7)
  boat1.rotation.y = -a1 - Math.PI / 2 // bow along the direction of travel
  boat1.rotation.z = Math.sin(t * 0.9) * 0.02
  const a2 = -t * 0.05 + 2.5
  boat2.position.set(Math.cos(a2) * 5.6, 0.01 + Math.sin(t * 0.7 + 2) * 0.012, Math.sin(a2) * 5.6)
  boat2.rotation.y = -a2 + Math.PI / 2
  boat2.rotation.z = Math.sin(t * 0.8 + 1) * 0.02

  // cinematic intro dolly, skipped on first interaction
  if (intro.active) {
    intro.k = Math.min(1, intro.k + dt / 4.5)
    const e = intro.k < 0.5 ? 2 * intro.k * intro.k : 1 - Math.pow(-2 * intro.k + 2, 2) / 2
    camera.position.lerpVectors(intro.from, intro.to, e)
    controls.target.lerpVectors(intro.tFrom, intro.tTo, e)
    if (intro.k >= 1) intro.active = false
  }

  controls.update()
  composer.render()
  requestAnimationFrame(frame)
}
frame()
