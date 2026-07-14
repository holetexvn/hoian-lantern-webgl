import * as THREE from 'three'

const ITEMS = [
  { key: 'heatspreader', text: 'Vapor-chamber heatspreader', side: 1 },
  { key: 'die', text: '48× tensor-engine die', side: -1 },
  { key: 'cache', text: '384 MB neural cache', side: 1 },
  { key: 'interposer', text: 'Optical interposer', side: -1 },
  { key: 'substrate', text: 'BGA substrate · 900 pins', side: 1 },
]

export function createAnnotations(container, chip, camera) {
  const els = ITEMS.map((it) => {
    const d = document.createElement('div')
    d.className = 'anno'
    d.textContent = it.text
    container.appendChild(d)
    return { ...it, el: d }
  })
  const v = new THREE.Vector3()

  function update(explode) {
    const o = Math.max(0, Math.min(1, (explode - 0.35) / 0.45))
    container.style.opacity = o
    if (o <= 0) return
    for (const a of els) {
      chip.layers[a.key].getWorldPosition(v)
      v.x += a.side * 2.3
      v.project(camera)
      const x = (v.x * 0.5 + 0.5) * innerWidth
      const y = (-v.y * 0.5 + 0.5) * innerHeight
      a.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`
    }
  }
  return { update }
}
