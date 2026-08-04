// Menu mobile : bouton [data-nav="menu"] ouvre, [data-nav="close"] ferme, en
// dehors de #swup (persistant), une seule init suffit. .nav-mob-inner fait
// déjà 100dvh en CSS : on se contente de révéler/masquer .nav-mob via
// max-height, la transition (durée/easing) est gérée en CSS côté Webflow.
function setOpen(navMob, open) {
  navMob.style.maxHeight = open ? '100dvh' : ''
}

// Changement de page (clic sur un nav-mob-link) : plutôt que de rejouer la
// collapse en max-height (visible pendant la navigation), on fade en
// opacity 300ms. Une fois le fade terminé, on reset à l'état initial
// (opacity 1, max-height 0) — invisible car max-height 0, prêt pour la
// prochaine ouverture normale (max-height).
function closeWithFade(navMob) {
  navMob.style.opacity = '0'
  const onEnd = (e) => {
    if (e.target !== navMob || e.propertyName !== 'opacity') return
    navMob.removeEventListener('transitionend', onEnd)
    // Reset instantané : on coupe la transition CSS le temps de remettre
    // l'état initial, sinon opacity/max-height rejouent leur transition en
    // sens inverse et on voit l'élément se refermer.
    navMob.style.transition = 'none'
    navMob.style.opacity = ''
    navMob.style.maxHeight = ''
    void navMob.offsetHeight
    navMob.style.transition = ''
  }
  navMob.addEventListener('transitionend', onEnd)
}

export function initNavMobile() {
  const menuButton = document.querySelector('button[data-nav="menu"]')
  const closeButton = document.querySelector('button[data-nav="close"]')
  const navMob = document.querySelector('.nav-mob')
  if (!navMob) return

  setOpen(navMob, false)

  menuButton?.addEventListener('click', () => setOpen(navMob, true))
  closeButton?.addEventListener('click', () => setOpen(navMob, false))

  navMob.querySelectorAll('a[href]').forEach((link) => {
    link.addEventListener('click', () => closeWithFade(navMob))
  })
}
