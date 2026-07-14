export function detectQuality() {
  const params = new URLSearchParams(location.search)
  const mem = navigator.deviceMemory || 8
  const cores = navigator.hardwareConcurrency || 8
  let tier = 1
  if (mem >= 8 && cores >= 8 && devicePixelRatio <= 2.5) tier = 2
  if (mem <= 4 || cores <= 4) tier = 0
  if (matchMedia('(max-width: 768px)').matches) tier = Math.min(tier, 1)
  if (params.get('tier') !== null) tier = Math.max(0, Math.min(2, +params.get('tier')))
  const cfg = [
    { dpr: 1,   fluidDye: 128, particles: 10000 },
    { dpr: 1.5, fluidDye: 256, particles: 50000 },
    { dpr: 2,   fluidDye: 512, particles: 100000 },
  ][tier]
  return {
    tier,
    dpr: Math.min(cfg.dpr, devicePixelRatio),
    fluidDye: cfg.fluidDye,
    fluidSim: cfg.fluidDye / 2,
    particles: cfg.particles,
  }
}

// Samples the first ~4s; if avg FPS < 45, calls onDowngrade(fps) once.
export function createFpsGovernor(onDowngrade) {
  let t = 0, frames = 0, done = false
  return function sample(dt) {
    if (done) return
    t += dt; frames++
    if (t >= 4) {
      done = true
      const fps = frames / t
      if (fps < 45) onDowngrade(fps)
    }
  }
}
