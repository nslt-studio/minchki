let cleanup = null

function isTouchDevice() {
  return window.matchMedia('(pointer: coarse)').matches
}

// Distance de drag (en fraction de la largeur d'un item) à partir de
// laquelle on bascule sur l'item suivant/précédent plutôt que de revenir à
// l'item de départ — même logique de seuil qu'un swipe tactile classique.
const SWIPE_THRESHOLD = 0.1

// Drag à la souris/trackpad dans .words (le swipe tactile fonctionne déjà
// nativement, cette fonction ne sert que le pointeur souris/trackpad).
function initWordsDrag() {
  if (isTouchDevice()) return null

  const words = document.querySelector('.words')
  if (!words) return null

  const items = Array.from(words.querySelectorAll('.words-item'))
  if (!items.length) return null

  words.style.cursor = 'grab'

  let isDown = false
  let dragMoved = false
  let startX = 0
  let startScrollLeft = 0
  let snapRestoreTimer = null

  // Position d'un item DANS le contenu scrollable de .words (pas
  // item.offsetLeft, relatif au offsetParent positionné le plus proche —
  // voir plus bas), recalculée à chaque usage pour rester juste après un
  // resize/changement de layout.
  function getItemPosition(item) {
    return item.getBoundingClientRect().left - words.getBoundingClientRect().left + words.scrollLeft
  }

  function scrollToItem(index) {
    words.scrollTo({ left: getItemPosition(items[index]), behavior: 'smooth' })
    armSnapRestore()
  }

  // Réactiver scroll-snap-type pendant que .words n'est pas encore aligné
  // sur un point de snap peut forcer le navigateur à corriger la position
  // instantanément (souvent vers 0) AVANT que notre scrollTo smooth ne parte
  // — d'où le "retour à 0 puis swipe". On attend donc que le scroll animé
  // soit réellement arrivé (scrollend, + un fallback par debounce sur
  // scroll) avant de le réactiver, une fois déjà exactement sur la cible.
  function armSnapRestore() {
    clearTimeout(snapRestoreTimer)
    snapRestoreTimer = setTimeout(() => {
      words.style.scrollSnapType = ''
    }, 100)
  }

  function onWordsScroll() {
    // Ne s'applique qu'après relâchement (pendant le scroll animé vers la
    // cible) : pendant le drag actif lui-même, le snap doit rester désactivé
    // sans interruption, quelle que soit la fréquence des scroll events.
    if (!isDown && words.style.scrollSnapType === 'none') armSnapRestore()
  }

  function onPointerDown(e) {
    isDown = true
    dragMoved = false
    startX = e.clientX
    startScrollLeft = words.scrollLeft
    words.style.cursor = 'grabbing'
    words.style.userSelect = 'none'
    // Le scroll-snap natif "combat" un scrollLeft imposé en JS pendant le
    // drag (résistance/à-coups) : on le désactive le temps du geste.
    words.style.scrollSnapType = 'none'
    e.preventDefault()
  }

  function onPointerMove(e) {
    if (!isDown) return
    if (Math.abs(e.clientX - startX) > 3) dragMoved = true
    words.scrollLeft = startScrollLeft - (e.clientX - startX)
  }

  function stopDrag() {
    if (!isDown) return
    isDown = false
    words.style.cursor = 'grab'
    words.style.userSelect = ''

    // item.offsetLeft est relatif au offsetParent positionné le plus proche
    // (pas forcément .words si .words n'a pas de position:relative/absolute
    // etc.) : ça peut retomber hors de l'espace de scroll réel de .words et
    // fausser complètement seuil + cible. getItemPosition() recalcule donc
    // la position de chaque item DANS le contenu scrollable de .words via
    // getBoundingClientRect, fiable quel que soit le contexte de positionnement.
    const positions = items.map(getItemPosition)

    // Item le plus proche de la position de DÉPART du drag (= l'item
    // "actif" avant le geste), pour juger la distance parcourue par rapport
    // à sa propre largeur plutôt qu'un seuil en pixels fixe.
    const startIndex = positions.reduce(
      (closest, pos, i) => (Math.abs(pos - startScrollLeft) < Math.abs(positions[closest] - startScrollLeft) ? i : closest),
      0
    )

    const delta = words.scrollLeft - startScrollLeft
    const threshold = items[startIndex].offsetWidth * SWIPE_THRESHOLD

    let targetIndex = startIndex
    if (delta > threshold) targetIndex = Math.min(startIndex + 1, items.length - 1)
    else if (delta < -threshold) targetIndex = Math.max(startIndex - 1, 0)

    // scroll-snap-type reste désactivé pendant le scroll animé : le
    // réactiver ici forcerait le navigateur à "corriger" instantanément la
    // position vers un point de snap (souvent 0) avant même que notre
    // scrollTo ne parte. On part donc bien de la position de relâchement, et
    // le snap ne sera réactivé qu'une fois arrivé (voir armSnapRestore).
    words.scrollTo({ left: positions[targetIndex], behavior: 'smooth' })
    armSnapRestore()
  }

  // Clic direct sur un item (sans drag) : on swipe vers lui. dragMoved
  // permet d'ignorer le click de fin de geste quand stopDrag() vient déjà de
  // traiter un vrai drag, pour ne pas déclencher un second scrollTo dessus.
  function onItemClick(index) {
    if (dragMoved) return
    scrollToItem(index)
  }

  const onItemClickHandlers = items.map((item, index) => {
    const handler = () => onItemClick(index)
    item.addEventListener('click', handler)
    return handler
  })

  words.addEventListener('mousedown', onPointerDown)
  window.addEventListener('mousemove', onPointerMove)
  window.addEventListener('mouseup', stopDrag)
  words.addEventListener('scroll', onWordsScroll, { passive: true })

  return () => {
    words.removeEventListener('mousedown', onPointerDown)
    window.removeEventListener('mousemove', onPointerMove)
    window.removeEventListener('mouseup', stopDrag)
    words.removeEventListener('scroll', onWordsScroll)
    items.forEach((item, index) => item.removeEventListener('click', onItemClickHandlers[index]))
    clearTimeout(snapRestoreTimer)
    words.style.cursor = ''
    words.style.userSelect = ''
    words.style.scrollSnapType = ''
  }
}

// data-nav="top" scrolle en haut de page ; toute autre valeur est lue
// directement comme l'#id de la section à cibler (data-nav="offering" ->
// #offering) — aucune liste fixe à tenir à jour, on peut ajouter autant de
// button [data-nav] que voulu du côté Webflow.
function scrollToNav(nav) {
  if (nav === 'top') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }

  document.getElementById(nav)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function initAbout() {
  destroyAbout()

  const wordsCleanup = initWordsDrag()

  const buttons = document.querySelectorAll('.button[data-nav]')
  if (!buttons.length) {
    cleanup = () => wordsCleanup?.()
    return
  }

  function setActive(nav) {
    buttons.forEach((btn) => btn.classList.toggle('active', btn.dataset.nav === nav))
  }

  // Le clic force l'état actif tout de suite, et suspend le scrollspy le
  // temps du scroll animé (sinon les sections traversées pendant le scroll
  // vers la cible font défiler la classe active sur d'autres buttons au
  // passage).
  let suspendSpy = false
  let resumeTimer = null

  function armSpyResume() {
    clearTimeout(resumeTimer)
    resumeTimer = setTimeout(() => {
      suspendSpy = false
    }, 150)
  }

  function onScroll() {
    if (suspendSpy) armSpyResume()
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      suspendSpy = true
      armSpyResume()
      setActive(button.dataset.nav)
      scrollToNav(button.dataset.nav)
    })
  })

  // Une section par button [data-nav] (hors "top", qui n'a pas de section
  // propre) — dérivé directement des buttons présents sur la page, pas d'une
  // liste fixe.
  const sections = [...buttons]
    .map((btn) => btn.dataset.nav)
    .filter((nav) => nav !== 'top')
    .map((nav) => ({ nav, el: document.getElementById(nav) }))
    .filter((s) => s.el)

  let observer = null

  if (sections.length) {
    // Bande de détection au centre de l'écran (45%-55%) : la section qui s'y
    // trouve devient la section "active" au scroll.
    observer = new IntersectionObserver(
      (entries) => {
        if (suspendSpy) return

        const visible = entries.filter((entry) => entry.isIntersecting)
        if (visible.length) {
          const topMost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b))
          const match = sections.find((s) => s.el === topMost.target)
          if (match) setActive(match.nav)
          return
        }

        // Aucune section dans la bande : au-dessus de la première, on
        // retombe sur "top".
        if (window.scrollY < sections[0].el.offsetTop) {
          setActive('top')
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    )

    sections.forEach((s) => observer.observe(s.el))
  }

  window.addEventListener('scroll', onScroll, { passive: true })

  cleanup = () => {
    window.removeEventListener('scroll', onScroll)
    clearTimeout(resumeTimer)
    observer?.disconnect()
    wordsCleanup?.()
  }
}

export function destroyAbout() {
  cleanup?.()
  cleanup = null
}
