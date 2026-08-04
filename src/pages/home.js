import gsap from 'gsap'

const DOCKED_WIDTH = 160

function setDockedState(logoHome, logoMain, docked) {
  gsap.set(logoHome, { opacity: docked ? 0 : 1, pointerEvents: docked ? 'none' : 'auto' })
  gsap.set(logoMain, { opacity: docked ? 1 : 0 })
}

let cleanup = null

export function initHome() {
  destroyHome()

  const logoHome = document.querySelector('.logo-home')
  const logoMain = document.querySelector('.logo-main')
  if (!logoHome || !logoMain) return

  gsap.set(logoHome, { xPercent: -50, y: 0, width: '100%' })
  setDockedState(logoHome, logoMain, false)

  // Largeur/hauteur réellement rendues, mesurées directement (pas déduites
  // d'un ratio supposé constant). set → mesure → reset se font de façon
  // synchrone, avant le prochain paint : aucun flash visuel. La largeur
  // n'est pas affectée par la barre d'adresse mobile (elle ne joue que sur
  // la hauteur) : la mesurer une fois ici est donc sûr, contrairement à la
  // hauteur qui doit être relue à chaque frame (voir plus bas).
  const openWidth = logoHome.getBoundingClientRect().width
  gsap.set(logoHome, { width: DOCKED_WIDTH })
  const dockedHeight = logoHome.getBoundingClientRect().height
  gsap.set(logoHome, { width: '100%' })

  let docked = false
  let ticking = false

  // Tout est recalculé ici à partir de window.innerHeight/window.scrollY lus
  // À CET INSTANT, à chaque frame de scroll — aucune valeur mise en cache
  // nulle part (pas de ScrollTrigger start/end figés, pas de refresh à
  // déclencher). Sur mobile, quand la barre d'adresse apparaît/disparaît en
  // scrollant, window.innerHeight change réellement d'une frame à l'autre :
  // en le relisant à chaque frame plutôt qu'en dépendant d'un mécanisme de
  // cache/invalidation (resize event, ScrollTrigger.refresh, etc. — qui se
  // sont tous montrés en retard ou aveugles à ce changement précis), la
  // position suit exactement, sans jamais pouvoir être en décalage.
  function update() {
    ticking = false

    const vh = window.innerHeight
    const distance = vh * 2
    const progress = Math.min(1, Math.max(0, window.scrollY / distance))
    const targetY = -(vh - dockedHeight)

    gsap.set(logoHome, {
      y: progress * targetY,
      width: gsap.utils.interpolate(openWidth, DOCKED_WIDTH, progress),
    })

    const shouldDock = progress >= 1
    if (shouldDock !== docked) {
      docked = shouldDock
      setDockedState(logoHome, logoMain, docked)
    }
  }

  function onScroll() {
    if (ticking) return
    ticking = true
    requestAnimationFrame(update)
  }

  update()
  window.addEventListener('scroll', onScroll, { passive: true })
  // Le resize (rotation, redimensionnement desktop) ne déclenche pas de
  // scroll : sans ce listener, la position resterait figée sur les valeurs
  // du dernier scroll jusqu'au scroll suivant.
  window.addEventListener('resize', update)

  cleanup = () => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', update)
  }
}

// À appeler quand on quitte la home : logo-home/logo-main sont en dehors de
// #swup (persistants), donc sans ça les listeners de la home resteraient
// actifs et continueraient à piloter leur opacity/position au scroll sur les
// autres pages.
export function destroyHome() {
  cleanup?.()
  cleanup = null

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
