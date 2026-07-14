import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { state } from './state.js'

gsap.registerPlugin(ScrollTrigger)

export function initScroll({ camera, reduced }) {
  const scrub = 0.8

  if (reduced) {
    state.fluid = 0; state.reveal = 1; state.explode = 0; state.flow = 0.25
    camera.position.set(0, 2.2, 8.5)
    document.querySelectorAll('.spec-value').forEach((el) => { el.textContent = el.dataset.count })
    return
  }

  // NOTE: camera waypoints are chained — each act's "from" must equal the
  // previous act's "to", or the boundary will snap. Retune them in lockstep.

  // Act 1 → 2: fluid dissolves, chip reveals, camera settles into a 3/4 product view
  gsap.timeline({ scrollTrigger: { trigger: '#act-reveal', start: 'top bottom', end: 'top top', scrub } })
    .to(state, { fluid: 0, ease: 'none' }, 0)
    .to(state, { reveal: 1, shift: -0.6, ease: 'none' }, 0)
    .to(camera.position, { x: 0.6, y: 2.4, z: 7.0, ease: 'none' }, 0)

  // Act 3: exploded view, camera rises and pulls back so the full stack fits
  gsap.timeline({ scrollTrigger: { trigger: '#act-explode', start: 'top 80%', end: 'bottom bottom', scrub } })
    .fromTo(state, { explode: 0, shift: -0.6 }, { explode: 1, shift: 0, ease: 'none', immediateRender: false }, 0)
    .fromTo(camera.position, { x: 0.6, y: 2.4, z: 7.0 }, { x: 1.4, y: 2.8, z: 9.4, ease: 'none', immediateRender: false }, 0)

  // Act 4: stack closes, particle flow ramps up, camera swings left
  gsap.timeline({ scrollTrigger: { trigger: '#act-flow', start: 'top bottom', end: 'center center', scrub } })
    .fromTo(state, { explode: 1, flow: 0, shift: 0 }, { explode: 0, flow: 1, shift: 0.55, ease: 'none', immediateRender: false }, 0)
    .fromTo(camera.position, { x: 1.4, y: 2.8, z: 9.4 }, { x: -1.9, y: 1.7, z: 8.8, ease: 'none', immediateRender: false }, 0)

  // Act 5: flow calms, camera pulls back
  gsap.timeline({ scrollTrigger: { trigger: '#act-specs', start: 'top bottom', end: 'top 30%', scrub } })
    .fromTo(state, { flow: 1, shift: 0.55, lift: 0 }, { flow: 0.25, shift: 0, lift: 1.15, ease: 'none', immediateRender: false }, 0)
    .fromTo(camera.position, { x: -1.9, y: 1.7, z: 8.8 }, { x: 0, y: 2.6, z: 10.8, ease: 'none', immediateRender: false }, 0)

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
