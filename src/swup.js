import Swup from 'swup'

function normalizePath(url) {
  const { pathname } = new URL(url, window.location.origin)
  return pathname.replace(/\/$/, '') || '/'
}

// Met à jour w--current sur tous les liens pointant vers `url`, immédiatement au clic
// (sans attendre la fin de la transition swup).
function updateCurrentLinks(url) {
  const path = normalizePath(url)

  document.querySelectorAll('a.w--current').forEach((el) => {
    el.classList.remove('w--current')
  })

  document.querySelectorAll('a[href]').forEach((el) => {
    if (normalizePath(el.href) === path) {
      el.classList.add('w--current')
    }
  })
}

export function initSwup(options = {}) {
  const swup = new Swup({
    containers: ['#swup'],
    ...options,
  })

  swup.hooks.on('link:click', (visit) => {
    updateCurrentLinks(visit.to.url)
  })

  // Boutons précédent/suivant du navigateur : pas de link:click, il faut
  // donc aussi mettre à jour w--current ici.
  swup.hooks.on('history:popstate', (visit) => {
    updateCurrentLinks(visit.to.url)
  })

  return swup
}
