import * as THREE from 'three'

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createTraceTexture(seed, size = 1024, color = '#7df2ff') {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  g.fillStyle = '#000'
  g.fillRect(0, 0, size, size)
  const rnd = mulberry32(seed)
  g.strokeStyle = color
  g.fillStyle = color
  g.lineWidth = Math.max(1, size * 0.0035)
  g.lineCap = 'square'
  const clamp = (v) => Math.max(size * 0.05, Math.min(size * 0.95, v))
  for (let i = 0; i < 90; i++) {
    let x = rnd() * size, y = rnd() * size
    g.beginPath()
    g.moveTo(x, y)
    for (let s = 0; s < 4; s++) {
      if (rnd() < 0.5) x = clamp(x + (rnd() - 0.5) * size * 0.3)
      else y = clamp(y + (rnd() - 0.5) * size * 0.3)
      g.lineTo(x, y)
    }
    g.stroke()
    const pad = size * 0.006
    g.fillRect(x - pad, y - pad, pad * 2, pad * 2)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function createLidTexture(size = 512) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  const grad = g.createLinearGradient(0, 0, size, size)
  grad.addColorStop(0, '#cdd5de'); grad.addColorStop(0.5, '#aab3bf'); grad.addColorStop(1, '#c4ccd6')
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)
  g.fillStyle = 'rgba(30,36,46,0.85)'
  g.textAlign = 'center'
  g.font = `700 ${size * 0.22}px "Segoe UI", sans-serif`
  g.fillText('H1', size / 2, size * 0.52)
  g.font = `500 ${size * 0.05}px "Segoe UI", sans-serif`
  g.fillText('HOLETEX · NEURAL SILICON', size / 2, size * 0.62)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// Injects a moving bright band into the emissive term (r160+: vEmissiveMapUv).
export function addTracePulse(mat) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 }
    mat.userData.uTime = shader.uniforms.uTime
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <emissivemap_fragment>', `
        #include <emissivemap_fragment>
        float band = smoothstep(0.22, 0.0, abs(fract(vEmissiveMapUv.y * 2.0 - uTime * 0.22) - 0.5));
        totalEmissiveRadiance *= 0.55 + 1.9 * band;
      `)
  }
}
