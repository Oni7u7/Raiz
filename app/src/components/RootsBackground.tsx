import { useEffect, useRef } from 'react'
import { animate, createScope, stagger, svg, type Scope } from 'animejs'

// Fondo puramente decorativo para los márgenes vacíos en pantallas anchas
// (Home, dashboards, EventForm) — trazos finos tipo raíz que se dibujan y
// "borran" en loop, muy discretos (ver .roots-bg-path en index.css para la
// opacidad/color). aria-hidden porque no aporta nada al contenido; se oculta
// por completo en pantallas angostas vía CSS (no hay margen que llenar ahí).
export function RootsBackground() {
  const root = useRef<HTMLDivElement>(null)
  const scope = useRef<Scope | null>(null)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Con reduced-motion, los <path> se quedan con su stroke normal
    // (completo, sin animar) — nunca se les aplica el draw progresivo.
    if (prefersReducedMotion) return

    scope.current = createScope({ root }).add(() => {
      animate(svg.createDrawable('.roots-bg-path'), {
        draw: ['0 0', '0 1', '1 1'],
        ease: 'inOutQuad',
        duration: 9000,
        delay: stagger(500),
        loop: true,
      })
    })

    return () => scope.current?.revert()
  }, [])

  return (
    <div ref={root} className="roots-bg">
      <svg viewBox="0 0 1600 1400" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        {/* margen izquierdo */}
        <path
          className="roots-bg-path"
          d="M 30 -20 C 90 120, 40 260, 100 400 C 140 500, 70 620, 120 760 C 150 850, 90 950, 110 1080"
        />
        <path
          className="roots-bg-path"
          d="M -10 300 C 60 340, 100 440, 60 560 C 30 650, 110 730, 70 860"
        />
        <path
          className="roots-bg-path"
          d="M 70 700 C 20 800, 90 900, 40 1040 C 10 1140, 80 1240, 30 1380"
        />
        {/* margen derecho */}
        <path
          className="roots-bg-path"
          d="M 1570 20 C 1500 150, 1560 280, 1490 420 C 1450 520, 1540 640, 1480 780"
        />
        <path
          className="roots-bg-path"
          d="M 1610 380 C 1530 420, 1500 520, 1550 640 C 1580 720, 1500 820, 1540 950 C 1560 1020, 1510 1100, 1550 1200"
        />
        <path
          className="roots-bg-path"
          d="M 1520 750 C 1580 830, 1510 930, 1560 1060 C 1590 1140, 1530 1240, 1570 1380"
        />
      </svg>
    </div>
  )
}
