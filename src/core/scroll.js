import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { state } from './state.js'

gsap.registerPlugin(ScrollTrigger)

export function initScroll({ camera }) {
  const scrub = 0.8

  // Act 1 → 2: fluid dissolves, chip reveals, camera pushes in
  gsap.timeline({ scrollTrigger: { trigger: '#act-reveal', start: 'top bottom', end: 'top top', scrub } })
    .to(state, { fluid: 0, ease: 'none' }, 0)
    .to(state, { reveal: 1, ease: 'none' }, 0)
    .to(camera.position, { z: 6.5, y: 0.6, ease: 'none' }, 0)

  // Act 3: exploded view, camera rises and orbits slightly
  gsap.timeline({ scrollTrigger: { trigger: '#act-explode', start: 'top 80%', end: 'bottom bottom', scrub } })
    .to(state, { explode: 1, ease: 'none' }, 0)
    .to(camera.position, { z: 7.5, y: 1.7, x: 1.3, ease: 'none' }, 0)

  // Act 4: stack closes, particle flow ramps up, camera swings left
  gsap.timeline({ scrollTrigger: { trigger: '#act-flow', start: 'top bottom', end: 'center center', scrub } })
    .to(state, { explode: 0, ease: 'none' }, 0)
    .to(state, { flow: 1, ease: 'none' }, 0)
    .to(camera.position, { z: 8.5, x: -1.5, y: 0.9, ease: 'none' }, 0)

  // Act 5: flow calms, camera pulls back
  gsap.timeline({ scrollTrigger: { trigger: '#act-specs', start: 'top bottom', end: 'top 30%', scrub } })
    .to(state, { flow: 0.25, ease: 'none' }, 0)
    .to(camera.position, { z: 10, x: 0, y: 1.4, ease: 'none' }, 0)

  // Spec counters: one-shot count-up when scrolled into view
  document.querySelectorAll('.spec-value').forEach((el) => {
    const target = +el.dataset.count
    const o = { v: 0 }
    gsap.to(o, {
      v: target, duration: 1.6, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
      onUpdate: () => { el.textContent = Math.round(o.v) },
    })
  })
}
