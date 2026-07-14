export function createPointer() {
  const p = {
    x: innerWidth / 2, y: innerHeight / 2,
    nx: 0.5, ny: 0.5, vx: 0, vy: 0, down: false,
  }
  let lx = p.x, ly = p.y
  addEventListener('pointermove', (e) => { p.x = e.clientX; p.y = e.clientY })
  addEventListener('pointerdown', () => { p.down = true })
  addEventListener('pointerup', () => { p.down = false })
  p.update = (dt) => {
    const safe = Math.max(dt, 1e-3)
    p.vx = (p.x - lx) / safe
    p.vy = (p.y - ly) / safe
    lx = p.x; ly = p.y
    p.nx = p.x / innerWidth
    p.ny = 1 - p.y / innerHeight
  }
  return p
}
