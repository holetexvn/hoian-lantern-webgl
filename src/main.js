import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

const canvas = document.querySelector('#stage')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.0

const scene = new THREE.Scene()
// warm sky gradient backdrop
const bg = document.createElement('canvas')
bg.width = 16; bg.height = 512
const bgc = bg.getContext('2d')
const grad = bgc.createLinearGradient(0, 0, 0, 512)
grad.addColorStop(0, '#bfe3dd')
grad.addColorStop(0.6, '#dcefe6')
grad.addColorStop(1, '#fdf3e3')
bgc.fillStyle = grad
bgc.fillRect(0, 0, 16, 512)
const bgTex = new THREE.CanvasTexture(bg)
bgTex.colorSpace = THREE.SRGBColorSpace
scene.background = bgTex

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100)
camera.position.set(6.5, 3.2, 9.5)

const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 0.6, 0)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.autoRotate = true
controls.autoRotateSpeed = 0.7
controls.minDistance = 4
controls.maxDistance = 16
controls.maxPolarAngle = Math.PI / 2 + 0.05
controls.enablePan = false
// pause the slow spin while the user is looking around, resume after
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

const draco = new DRACOLoader(manager)
draco.setDecoderPath('/draco/')
const gltfLoader = new GLTFLoader(manager)
gltfLoader.setDRACOLoader(draco)

let mixer
gltfLoader.load('/models/LittlestTokyo.glb', (gltf) => {
  const model = gltf.scene
  model.position.set(1, 1, 0)
  model.scale.set(0.01, 0.01, 0.01)
  scene.add(model)
  mixer = new THREE.AnimationMixer(model)
  mixer.clipAction(gltf.animations[0]).play()

  // soft fake contact shadow under the diorama
  const box = new THREE.Box3().setFromObject(model)
  const sc = document.createElement('canvas')
  sc.width = sc.height = 256
  const sg = sc.getContext('2d')
  const shadowGrad = sg.createRadialGradient(128, 128, 20, 128, 128, 126)
  shadowGrad.addColorStop(0, 'rgba(52,40,32,0.42)')
  shadowGrad.addColorStop(0.7, 'rgba(52,40,32,0.16)')
  shadowGrad.addColorStop(1, 'rgba(52,40,32,0)')
  sg.fillStyle = shadowGrad
  sg.fillRect(0, 0, 256, 256)
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 7),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false })
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = box.min.y + 0.01
  scene.add(shadow)
})

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

const clock = new THREE.Clock()
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05)
  if (mixer) mixer.update(dt)
  controls.update()
  renderer.render(scene, camera)
  requestAnimationFrame(frame)
}
frame()
