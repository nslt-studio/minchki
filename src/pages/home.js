import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const SCROLL_DISTANCE = () => window.innerHeight * 2 // 200vh
const DOCKED_WIDTH = 160

function setDockedState(logoHome, logoMain, docked) {
  gsap.set(logoHome, { opacity: docked ? 0 : 1, pointerEvents: docked ? 'none' : 'auto' })
  gsap.set(logoMain, { opacity: docked ? 1 : 0 })
}

export function initHome() {
  const logoHome = document.querySelector('.logo-home')
  const logoMain = document.querySelector('.logo-main')
  if (!logoHome || !logoMain) return

  ScrollTrigger.getById('home-logo')?.kill()

  gsap.set(logoHome, { xPercent: -50, y: 0, width: '100%' })
  setDockedState(logoHome, logoMain, false)

  // Hauteur réellement rendue une fois docké à DOCKED_WIDTH, mesurée directement
  // (pas déduite d'un ratio supposé constant, qui peut être faux si la hauteur
  // ne diminue pas proportionnellement à la largeur). set → mesure → reset se
  // font de façon synchrone, avant le prochain paint : aucun flash visuel.
  gsap.set(logoHome, { width: DOCKED_WIDTH })
  const dockedHeight = logoHome.getBoundingClientRect().height
  gsap.set(logoHome, { width: '100%' })

  const getTargetY = () => -(window.innerHeight - dockedHeight)

  const tween = gsap.to(logoHome, {
    y: () => getTargetY(),
    width: DOCKED_WIDTH,
    ease: 'none',
    paused: true,
  })

  ScrollTrigger.create({
    id: 'home-logo',
    trigger: document.body,
    start: 'top top',
    end: () => `+=${SCROLL_DISTANCE()}`,
    scrub: true,
    animation: tween,
    // Recalcule automatiquement start/end (SCROLL_DISTANCE) et invalide le tween
    // (donc relit getTargetY()) à chaque resize : ScrollTrigger écoute déjà
    // "resize" par défaut, pas besoin d'un listener manuel.
    invalidateOnRefresh: true,
    onLeave: () => setDockedState(logoHome, logoMain, true),
    onEnterBack: () => setDockedState(logoHome, logoMain, false),
  })
}

// À appeler quand on quitte la home : logo-home/logo-main sont en dehors de
// #swup (persistants), donc sans ça le ScrollTrigger de la home resterait actif
// et continuerait à piloter leur opacity au scroll sur les autres pages.
export function destroyHome() {
  ScrollTrigger.getById('home-logo')?.kill()

  // .logo-home peut ne pas exister en dehors de la home : on traite les deux
  // indépendamment pour ne jamais laisser logo-main bloqué à opacity 0.
  const logoHome = document.querySelector('.logo-home')
  const logoMain = document.querySelector('.logo-main')

  if (logoHome) {
    gsap.set(logoHome, { opacity: 0, pointerEvents: 'none' })
  }
  if (logoMain) {
    gsap.set(logoMain, { opacity: 1 })
  }
}
