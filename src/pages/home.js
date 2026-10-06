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

  // La PROGRESSION du scroll se base sur 100svh, stable quand la barre
  // d'adresse mobile apparaît/disparaît (sinon l'animation avance/recule d'un
  // coup à chaque mouvement de barre). Mesurée via une sonde, relue au resize.
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none;'
  document.body.appendChild(probe)

  // La POSITION, elle, doit coller au bas de l'écran visible, avec ou sans
  // barre. Ni un ancrage bottom + y calculé en JS (le navigateur déplace
  // l'élément avant que le JS ne recalcule y → le logo partait trop haut),
  // ni un y calculé depuis la hauteur visible lue en JS (iOS la met à jour
  // d'un coup, parfois en fin d'animation de barre → sauts) ne suivent la
  // barre en temps réel. On exprime donc top en % du viewport via calc() :
  // c'est le navigateur qui le résout, de façon synchrone avec la barre,
  // exactement comme un ancrage bottom. Le JS ne fournit que la progression.
  // clearProps : revenir à l'ancrage Webflow d'origine pour mesurer l'écart
  // en bas (un retour sur la home via swup trouverait sinon le top posé à
  // l'init précédente).
  gsap.set(logoHome, { clearProps: 'top,bottom' })
  gsap.set(logoHome, { xPercent: -50, y: 0, yPercent: 0, width: '100%' })
  const bottomGap = window.innerHeight - logoHome.getBoundingClientRect().bottom
  gsap.set(logoHome, { bottom: 'auto' })
  setDockedState(logoHome, logoMain, false)

  let stableVh = 0
  let openWidth = 0
  let docked = false
  let ticking = false

  // Largeur réellement rendue, mesurée directement. set → mesure → reset se
  // font de façon synchrone, avant le prochain paint : aucun flash visuel.
  function measure() {
    stableVh = probe.getBoundingClientRect().height || window.innerHeight
    gsap.set(logoHome, { width: '100%' })
    openWidth = logoHome.getBoundingClientRect().width
  }

  // Bas de l'écran visible → haut, largeur 100% → 160px. Aucune hauteur
  // mesurée en JS (une mesure faite avant que le logo ait sa taille finale
  // — image/police pas encore chargée — le faisait passer sous l'écran) :
  // top = (1 - progress) × (100% - bottomGap) - progress × bottomGap, où
  // 100% = hauteur visible, et yPercent = -(1 - progress) × 100 remonte le
  // logo de sa PROPRE hauteur courante. Les deux sont résolus par le
  // navigateur : à progress 0, le bas du logo est exactement au bas visible.
  function update() {
    ticking = false

    const distance = stableVh * 2
    const progress = Math.min(1, Math.max(0, window.scrollY / distance))

    logoHome.style.top = `calc(${1 - progress} * (100% - ${bottomGap}px) - ${progress * bottomGap}px)`
    gsap.set(logoHome, {
      yPercent: -(1 - progress) * 100,
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

  // Le resize (rotation, redimensionnement desktop) ne déclenche pas de
  // scroll : on remesure puis on repositionne.
  function onResize() {
    measure()
    update()
  }

  measure()
  update()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize)

  // Après une navigation swup, la mise en page (scroll remis à 0, barre
  // d'adresse qui se réaffiche) n'est pas forcément stabilisée au moment de
  // l'init : on remesure une fois la frame suivante passée, puis après la
  // transition.
  let settleFrame = requestAnimationFrame(() => {
    settleFrame = requestAnimationFrame(onResize)
  })
  const settleTimeout = setTimeout(onResize, 500)

  cleanup = () => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onResize)
    cancelAnimationFrame(settleFrame)
    clearTimeout(settleTimeout)
    probe.remove()
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
