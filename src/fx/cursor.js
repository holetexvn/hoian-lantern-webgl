import gsap from 'gsap'

export function initCursor() {
  if (!matchMedia('(pointer: fine)').matches) return
  document.documentElement.classList.add('has-cursor')
  const root = document.querySelector('#cursor')
  const dot = root.querySelector('.cursor-dot')
  const ring = root.querySelector('.cursor-ring')

  const dotX = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power2' })
  const dotY = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power2' })
  const ringX = gsap.quickTo(ring, 'x', { duration: 0.38, ease: 'power3' })
  const ringY = gsap.quickTo(ring, 'y', { duration: 0.38, ease: 'power3' })

  addEventListener('pointermove', (e) => {
    dotX(e.clientX); dotY(e.clientY)
    ringX(e.clientX); ringY(e.clientY)
  })

  document.querySelectorAll('a, [data-magnetic]').forEach((el) => {
    el.addEventListener('pointerenter', () => root.classList.add('is-hover'))
    el.addEventListener('pointerleave', () => root.classList.remove('is-hover'))
  })

  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const toX = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3' })
    const toY = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3' })
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect()
      toX((e.clientX - (r.left + r.width / 2)) * 0.35)
      toY((e.clientY - (r.top + r.height / 2)) * 0.35)
    })
    el.addEventListener('pointerleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' })
    })
  })
}
