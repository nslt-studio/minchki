import gsap from 'gsap'

// Tous les timings du loader, regroupés ici pour être facilement ajustables.
// Les transitions (durée/easing) sont gérées en CSS côté Webflow : ce fichier
// ne fait que déclencher les changements de valeur (scale, opacity) au bon
// moment via gsap.set() (affectation immédiate, pas d'animation GSAP), et
// laisse le CSS animer visuellement la transition.
const CONFIG = {
  scaleDownDelay: 0.45, // déclenche le scale down de .loader-img
  scale: 0.25,
  // .loader-img passe en opacity 0 ce délai après le DÉBUT du scale down,
  // même si le scale n'est pas terminé — voulu. Le stagger des <p> démarre
  // au même instant.
  imgFadeDelayAfterScale: 0.4,
  textStagger: 0.05,
  // Ce délai après le déclenchement du stagger, .loader-text fond à son tour.
  holdBeforeTextFade: 1.5,
  // Ce délai après le déclenchement du fade de .loader-text, .loader fond.
  loaderFadeDelayAfterText: 0.6,
  // Ce délai après le déclenchement du fade de .loader, la div est retirée du DOM.
  removeDelayAfterLoaderFade: 0.45,
}

export function initLoader() {
  const loader = document.querySelector('.loader')
  if (!loader) return

  const img = loader.querySelector('.loader-img-inner')
  const text = loader.querySelector('.loader-text')
  const paragraphs = text ? [...text.querySelectorAll('p')] : []

  // Scroll interdit tant que l'animation joue.
  document.documentElement.style.overflow = 'hidden'

  const scaleAt = CONFIG.scaleDownDelay
  const imgFadeAt = scaleAt + CONFIG.imgFadeDelayAfterScale
  const textFadeAt = imgFadeAt + CONFIG.holdBeforeTextFade
  const loaderFadeAt = textFadeAt + CONFIG.loaderFadeDelayAfterText
  const removeAt = loaderFadeAt + CONFIG.removeDelayAfterLoaderFade

  const tl = gsap.timeline({
    onComplete: () => {
      loader.remove()
      document.documentElement.style.overflow = ''
    },
  })

  if (img) {
    tl.set(img, { scale: CONFIG.scale }, scaleAt)
    tl.set(img, { opacity: 0 }, imgFadeAt)
  }

  if (paragraphs.length) {
    tl.set(paragraphs, { opacity: 1, stagger: CONFIG.textStagger }, imgFadeAt)
  }

  if (text) {
    tl.set(text, { opacity: 0 }, textFadeAt)
  }

  tl.set(loader, { opacity: 0 }, loaderFadeAt)

  // Occupe le timeline jusqu'au moment du remove (géré par onComplete).
  tl.set({}, {}, removeAt)
}
