import { initSwup } from './swup.js'
import { initMedia, initImages } from './utils/media.js'
import { initClock } from './utils/clock.js'
import { initHome, destroyHome } from './pages/home.js'
import { initWork } from './pages/work.js'
import { initPlayground, destroyPlayground } from './pages/playground.js'
import { initAbout } from './pages/about.js'
import { initDetails } from './pages/details.js'

// Ajouter une nouvelle page : créer src/pages/<nom>.js puis l'enregistrer ici.
const pages = {
  home: initHome,
  work: initWork,
  playground: initPlayground,
  about: initAbout,
  details: initDetails,
}

function getCurrentPage() {
  return document.querySelector('[data-swup]')?.dataset.swup ?? null
}

function runCurrentPage() {
  initMedia()
  initImages()

  const page = getCurrentPage()

  // logo-home/logo-main sont en dehors de #swup : si on n'est pas/plus sur la
  // home, on coupe son ScrollTrigger et on force l'état statique (logo-main visible).
  if (page !== 'home') {
    destroyHome()
  }

  // Le carrousel anime.js pose des listeners sur window/document/body : ils
  // survivent à la navigation swup si on ne les retire pas explicitement.
  if (page !== 'playground') {
    destroyPlayground()
  }

  if (!page) return

  const init = pages[page]
  if (!init) {
    console.warn(`[minchki] Aucun module enregistré pour data-swup="${page}"`)
    return
  }

  init()
}

function bootstrap() {
  const swup = initSwup()

  // #time est en dehors du container #swup : une seule init suffit, pas besoin
  // de la relancer à chaque navigation.
  initClock()

  // page:view ne se déclenche qu'après une navigation swup, pas au chargement
  // initial : on initialise donc la page courante manuellement une première fois.
  runCurrentPage()
  swup.hooks.on('page:view', runCurrentPage)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap)
} else {
  bootstrap()
}
