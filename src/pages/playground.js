import gsap from 'gsap'
import { Draggable } from 'gsap/Draggable'
import { InertiaPlugin } from 'gsap/InertiaPlugin'

gsap.registerPlugin(Draggable, InertiaPlugin)

// Tous les réglages du carrousel, regroupés ici pour être facilement ajustables.
const CONFIG = {
  // Rayon "souhaité" du cercle (en vw en landscape, vh en portrait) — sera
  // automatiquement réduit si besoin pour ne jamais sortir de l'écran (voir
  // edgeMargin plus bas).
  radius: { landscape: 37.5, portrait: 50 },
  // Taille des items, en fraction de leur part de circonférence : 2π (~6.28)
  // = bord à bord (aucun espace) ; plus petit = plus d'espace entre eux.
  itemSizeFactor: { landscape: 4.8, portrait: 5.3 },
  // Perspective = radius × ce facteur. Plus grand = scène plus "plate" (moins
  // de fisheye) ; plus petit = effet 3D plus prononcé.
  perspectiveFactor: 2,
  // Décalage vertical premier plan/arrière-plan = radius × ce facteur. Plus
  // grand = effet "vu d'en haut" plus marqué ; 0 = aucun décalage.
  verticalSpreadFactor: 0.125,
  // Vitesse de rotation automatique (degrés/frame environ) — vitesse de repos
  // constante ; la molette/trackpad ajoute un boost temporaire par-dessus.
  speed: { landscape: 0.2, portrait: 0.2 },
  // Sensibilité du drag (pixels de souris → degrés de rotation).
  dragSpeed: { landscape: 0.05, portrait: 0.1 },
  // Marge de sécurité (en % de la largeur/hauteur d'écran) entre le bord d'un
  // item au plus loin du centre et le bord de l'écran.
  edgeMargin: 1,
}

let mm = null

// macOS (écrans ProMotion) peut réduire le vrai taux de rafraîchissement de
// l'écran tant qu'il ne détecte pas d'activité "justifiant" un framerate
// élevé — même si notre JS tourne à chaque rAF, il y a alors réellement
// moins de frames rendues par seconde (rotation saccadée), et bouger la
// souris lève ce throttling instantanément. will-change ne suffit pas à
// l'empêcher. Un flux vidéo actif (même invisible) est traité comme une
// activité continue par le système et empêche ce throttling : on en génère
// un sans aucun fichier externe via canvas.captureStream().
function startKeepAwakeVideo() {
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 2

  const stream = canvas.captureStream(30)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.srcObject = stream
  video.style.cssText = 'position:fixed;inset:0;width:1px;height:1px;opacity:0;pointer-events:none;'
  document.body.appendChild(video)
  video.play().catch(() => {})

  return () => {
    stream.getTracks().forEach((track) => track.stop())
    video.remove()
  }
}

// Ratio largeur/hauteur intrinsèque du média (img/video) d'un item : utilisé
// pour calculer une largeur explicite (au lieu de "auto", peu fiable ici —
// la liste est positionnée en absolute, sans contexte de taille naturelle à
// hériter). Repli sur 1 (carré) si le média n'est pas encore chargé.
function getAspectRatio(item) {
  const media = item.querySelector('img, video')
  if (!media) return 1
  const w = media.naturalWidth || media.videoWidth || 0
  const h = media.naturalHeight || media.videoHeight || 0
  return w && h ? w / h : 1
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

export function initPlayground() {
  destroyPlayground()

  mm = gsap.matchMedia()

  mm.add(
    {
      isLandscape: '(orientation: landscape)',
      isTouch: '(pointer: coarse)',
    },
    (context) => {
      const { isLandscape, isTouch } = context.conditions

      const list = document.querySelector('.playground-list')
      const items = shuffle(Array.from(document.querySelectorAll('.playground-item')))
      const count = items.length
      if (!list || !count) return

      const stopKeepAwakeVideo = startKeepAwakeVideo()

      const angleStep = 360 / count
      const unit = isLandscape ? 'vw' : 'vh'

      // Rayon effectif = le rayon souhaité, plafonné pour qu'un item au plus
      // loin du centre (radius + moitié de sa propre largeur) reste toujours
      // en deçà de (50% de l'écran - marge de sécurité). En portrait, le
      // débordement est acceptable : pas de plafond, radius.portrait pilote
      // directement la taille.
      const preferredRadius = isLandscape ? CONFIG.radius.landscape : CONFIG.radius.portrait
      const itemSizeFactor = isLandscape ? CONFIG.itemSizeFactor.landscape : CONFIG.itemSizeFactor.portrait
      const maxRadius = (50 - CONFIG.edgeMargin) / (1 + itemSizeFactor / (2 * count))
      const radius = isLandscape ? Math.min(preferredRadius, maxRadius) : preferredRadius

      const itemSize = radius / count
      const speed = isLandscape ? CONFIG.speed.landscape : CONFIG.speed.portrait
      const perspective = radius * CONFIG.perspectiveFactor
      const verticalSpread = radius * CONFIG.verticalSpreadFactor
      const dragSpeed = isLandscape ? CONFIG.dragSpeed.landscape : CONFIG.dragSpeed.portrait

      // .playground étant une Collection List Webflow, chaque .playground-item
      // est enveloppé dans un .w-dyn-item qui reste en flux normal — comme il
      // ne contient rien d'autre (l'item lui-même passe en absolute juste
      // après), il s'effondre à une hauteur ~0, et .playground-list perd toute
      // taille propre. Sans taille définie, "50% 50%" (centre de rotation par
      // défaut) ne correspond plus au centre visuel du carrousel. On force donc
      // .playground-list à occuper exactement .playground (inset: 0).
      gsap.set('.playground', { position: 'relative' })
      gsap.set(list, {
        position: 'absolute',
        inset: 0,
        perspective: `${perspective}${unit}`,
        perspectiveOrigin: '50% 50%',
      })

      // La perspective doit rester sur un élément STATIQUE : si on tourne le
      // même élément qui la porte, son propre point de fuite tourne avec lui
      // (oscillation visible, items qui sortent du cadre périodiquement). La
      // rotation se fait donc sur un enfant séparé, créé ici.
      const spinner = document.createElement('div')
      spinner.className = 'playground-spinner'
      list.appendChild(spinner)
      items.forEach((item) => spinner.appendChild(item))

      // willChange: 'transform' sur les éléments animés à chaque frame : sans
      // ce hint, macOS (écrans ProMotion) peut réduire le taux de
      // rafraîchissement réel tant qu'il ne détecte pas d'input utilisateur,
      // même si le JS continue de tourner à chaque rAF — d'où la rotation
      // saccadée à l'arrêt, fluide dès qu'on bouge la souris. Le hint indique
      // au navigateur que ces éléments restent activement animés.
      gsap.set(spinner, {
        position: 'fixed',
        inset: 0,
        transformStyle: 'preserve-3d',
        willChange: 'transform',
      })

      // La dimension qui porte l'espacement le long du cercle est fixe (pour
      // un gap constant entre items, quel que soit leur média) : width en
      // landscape, height en portrait — symétrique.
      gsap.set(items, {
        position: 'absolute',
        top: '50%',
        left: '50%',
        xPercent: -50,
        yPercent: -50,
        height: isLandscape ? 'auto' : `${itemSize * itemSizeFactor}${unit}`,
        willChange: 'transform',
      })

      // Position calculée à la main pour les deux orientations : GSAP
      // compose translate puis rotate (pas l'inverse), donc un z constant +
      // rotation seule ne suffit pas à répartir les items sur le cercle
      // (testé : ça les superpose tous au même endroit). x/y/z doivent donc
      // porter la position réelle. La rotation individuelle (même angle,
      // même signe que dans x/y) s'additionne à la rotation dynamique du
      // spinner (même axe) : au moment précis où un item arrive devant, les
      // deux s'annulent et l'item est à plat.
      // La largeur en portrait est calculée explicitement (au lieu de
      // "auto", qui cassait la mise en page ici) à partir du ratio naturel
      // du média de chaque item, mise à l'échelle sur la hauteur fixe.
      const heightValue = itemSize * itemSizeFactor
      const angles = []
      items.forEach((item, i) => {
        const angle = i * angleStep
        const radians = (angle * Math.PI) / 180
        angles[i] = { angle, radians }

        gsap.set(item, {
          width: isLandscape
            ? `${itemSize * itemSizeFactor}${unit}`
            : `${heightValue * getAspectRatio(item)}${unit}`,
          rotationX: isLandscape ? 0 : -angle,
          rotationY: isLandscape ? angle : 0,
          x: isLandscape ? `${Math.sin(radians) * radius}${unit}` : 0,
          y: isLandscape ? 0 : `${Math.sin(radians) * radius}${unit}`,
          z: `${Math.cos(radians) * radius}${unit}`,
        })
      })

      // État partagé (vitesse de rotation + valeurs de drag/molette)
      const state = {
        speed,
        increment: speed,
        wheelY: 0,
      }

      // Rotation du cylindre entier (spin) + léger flottement vertical
      let rotY = 0
      let rotX = 0
      const setRotationY = gsap.quickSetter(spinner, 'rotationY', 'deg')
      const setRotationX = gsap.quickSetter(spinner, 'rotationX', 'deg')
      setRotationY(rotY)
      setRotationX(rotX)
      if (isLandscape) {
        gsap.set(spinner, { y: '-5vh' })
      }

      // Les items au premier plan doivent toujours être un peu plus bas que
      // ceux à l'arrière-plan — pas en inclinant tout le groupe (ça lierait
      // le décalage vertical à l'angle FIXE de chaque item, qui tourne en
      // boucle et donne un effet de vague), mais en recalculant à chaque
      // frame la profondeur RÉELLE de chaque item (son angle courant = angle
      // fixe + rotation actuelle du groupe) et en y appliquant un y proportionnel.
      const setItemY = isLandscape
        ? Array.from(items).map((item) => gsap.quickSetter(item, 'y', unit))
        : null

      // Glisser-déposer : Draggable anime un proxy invisible, jamais le
      // carrousel lui-même — seul le delta de mouvement nous intéresse.
      const dragProxy = document.createElement('div')
      dragProxy.style.cssText = 'position:fixed;inset:0;opacity:0;pointer-events:none;'
      document.body.appendChild(dragProxy)

      let frameDeltaX = 0
      let frameDeltaY = 0

      const [draggable] = Draggable.create(dragProxy, {
        trigger: document.body,
        type: isLandscape ? 'x' : 'y',
        inertia: true,
        onPress: () => {
          gsap.to(state, { increment: 0, duration: 0.3 })
        },
        // this.deltaX/deltaY est le delta natif de Draggable depuis le dernier
        // update (pas la position cumulée) : c'est ce qu'il faut lire ici, pas
        // une différence recalculée à la main contre un lastX remis à 0 à
        // chaque clic (ça causait un saut brutal en réutilisant l'ancienne
        // position cumulée du drag précédent).
        onDrag: function () {
          frameDeltaX += this.deltaX * dragSpeed
          frameDeltaY += this.deltaY * dragSpeed
        },
        // Après relâchement, InertiaPlugin continue à animer le proxy selon
        // la vélocité du geste : onThrowUpdate se déclenche à chaque frame de
        // cette décélération, exactement comme onDrag pendant le drag actif.
        onThrowUpdate: function () {
          frameDeltaX += this.deltaX * dragSpeed
          frameDeltaY += this.deltaY * dragSpeed
        },
        onRelease: function () {
          // Si le relâchement ne déclenche pas d'inertie (mouvement trop
          // lent), on reprend la vitesse normale tout de suite ; sinon
          // onThrowComplete s'en charge une fois la décélération terminée.
          if (!this.isThrowing) {
            gsap.to(state, { increment: state.speed, duration: 0.6 })
          }
        },
        onThrowComplete: () => {
          gsap.to(state, { increment: state.speed, duration: 0.6 })
        },
      })

      // Boucle de rotation continue (auto-rotation + drag + molette)
      function onTick() {
        // Le framerate réel varie (ex : throttling macOS du rAF quand la
        // souris est immobile → rotation saccadée/plus lente ; redevient
        // fluide/rapide dès qu'il y a de l'input) : on normalise l'incrément
        // constant sur le temps réel écoulé entre deux ticks
        // (gsap.ticker.deltaRatio(60), normalisé sur une base 60fps) pour
        // garder une vitesse angulaire stable en degrés/seconde quel que
        // soit le framerate effectif. Le drag et la molette restent bruts :
        // ce sont des déplacements déjà liés au geste réel, pas une vitesse
        // à extrapoler.
        const frameScale = gsap.ticker.deltaRatio(60)

        // Inversé pour que le contenu suive le doigt/curseur pendant le
        // drag (signe opposé entre landscape et portrait, comme pour la molette).
        const dragDelta = (isLandscape ? frameDeltaX : frameDeltaY) * (isLandscape ? -1 : 1)
        const next = (isLandscape ? rotY : rotX) - state.increment * frameScale - dragDelta - state.wheelY

        if (isLandscape) {
          rotY = next
          setRotationY(rotY)

          angles.forEach(({ angle }, i) => {
            const currentAngle = angle + rotY
            const rad = (currentAngle * Math.PI) / 180
            // cos > 0 : l'item est actuellement au premier plan → y positif
            // (CSS : plus bas). cos < 0 : arrière-plan → y négatif (plus haut).
            setItemY[i](Math.cos(rad) * verticalSpread)
          })
        } else {
          rotX = next
          setRotationX(rotX)
        }

        frameDeltaX = 0
        frameDeltaY = 0
      }
      gsap.ticker.add(onTick)

      // Molette de souris
      const wheelDecay = gsap.to(state, { wheelY: 0, duration: 0.5, paused: true, overwrite: true })
      function onWheel(e) {
        const damping = 0.1
        state.wheelY = gsap.utils.interpolate(state.wheelY, e.deltaY, 0.2) * damping
        wheelDecay.invalidate().restart()
      }

      // Survol d'un item (desktop uniquement, pas de hover sur tactile) :
      // scale + arrêt complet de la rotation tant que le curseur est
      // précisément sur cet item (sa vraie zone rendue en 3D, pas une
      // approximation) — binaire, pas de ralentissement intermédiaire.
      function onItemMouseEnter() {
        if (isTouch) return
        gsap.to(this, { scale: 1.1, duration: 0.15, ease: 'power1.out' })
        gsap.to(state, { increment: 0, duration: 0.4 })
      }
      function onItemMouseLeave() {
        if (isTouch) return
        gsap.to(this, { scale: 1, duration: 0.15, ease: 'power1.out' })
        gsap.to(state, { increment: state.speed, duration: 0.4 })
      }

      document.body.addEventListener('wheel', onWheel, false)
      items.forEach(($item) => {
        $item.addEventListener('mouseenter', onItemMouseEnter, false)
        $item.addEventListener('mouseleave', onItemMouseLeave, false)
      })

      // Nettoyage (utile en SPA / navigation par ajax)
      return () => {
        document.body.removeEventListener('wheel', onWheel)
        items.forEach(($item) => {
          $item.removeEventListener('mouseenter', onItemMouseEnter)
          $item.removeEventListener('mouseleave', onItemMouseLeave)
        })
        gsap.ticker.remove(onTick)
        draggable.kill()
        dragProxy.remove()
        stopKeepAwakeVideo()
      }
    }
  )
}

export function destroyPlayground() {
  mm?.revert()
  mm = null
}
