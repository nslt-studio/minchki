import gsap from 'gsap'
import { slugify } from '../utils/slugify.js'

let cleanup = null

function initViewToggle() {
  const buttons = document.querySelectorAll('[data-view]')
  const views = {
    grid: document.querySelector('.grid'),
    index: document.querySelector('.index'),
  }
  if (!buttons.length || !views.grid || !views.index) return

  const setView = (view) => {
    buttons.forEach((button) => {
      button.classList.toggle('active', button.getAttribute('data-view') === view)
    })
    views.grid.style.display = view === 'grid' ? 'block' : 'none'
    views.index.style.display = view === 'index' ? 'flex' : 'none'
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => setView(button.getAttribute('data-view')))
  })

  setView('grid')
}

function initCategoryFilter() {
  const buttons = document.querySelectorAll('[data-category]')
  const gridItems = document.querySelectorAll('.grid-list .grid-item')
  const indexItems = document.querySelectorAll('.index-list .index-item')
  if (!buttons.length || (!gridItems.length && !indexItems.length)) return

  const matches = (item, category) => {
    const itemCategories = (item.getAttribute('data-categories') || '')
      .split(',')
      .map((c) => c.trim())
    return category === 'all' || itemCategories.includes(category)
  }

  const applyDim = (items, category, dimmedOpacity, { blur = false } = {}) => {
    items.forEach((item) => {
      const match = matches(item, category)
      item.style.opacity = match ? '' : dimmedOpacity
      item.style.pointerEvents = match ? '' : 'none'
      if (blur) item.style.filter = match ? '' : 'blur(10px)'
    })
  }

  const updateUrl = (category) => {
    const url = new URL(window.location.href)
    if (category === 'all') {
      url.searchParams.delete('category')
    } else {
      url.searchParams.set('category', slugify(category))
    }
    window.history.replaceState(null, '', url)
  }

  const applyFilter = (category, { syncUrl = true } = {}) => {
    buttons.forEach((button) => {
      button.classList.toggle('active', button.getAttribute('data-category') === category)
    })

    applyDim(gridItems, category, '0.1', { blur: true })
    applyDim(indexItems, category, '0.35')

    if (syncUrl) updateUrl(category)
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => applyFilter(button.getAttribute('data-category')))
  })

  // Filtre porté par l'URL (?category=...) au chargement, pour arriver depuis
  // une autre page directement sur la bonne vue filtrée. L'URL est en minuscule
  // (slugifiée) : on matche donc en slugifiant aussi les data-category.
  const urlCategory = new URL(window.location.href).searchParams.get('category')
  const matchedButton = urlCategory
    ? [...buttons].find((button) => slugify(button.getAttribute('data-category') || '') === urlCategory)
    : null
  const initialCategory = matchedButton ? matchedButton.getAttribute('data-category') : 'all'

  // Pas besoin de ré-écrire l'URL si on vient déjà de la lire dedans.
  applyFilter(initialCategory, { syncUrl: !matchedButton })
}

function initLegend() {
  const legend = document.getElementById('legend')
  const indexItems = document.querySelectorAll('.index-list .index-item')
  if (!legend || !indexItems.length) return

  indexItems.forEach((item) => {
    item.addEventListener('mouseenter', () => {
      legend.textContent = 'Description'
    })
    item.addEventListener('mouseleave', () => {
      legend.textContent = 'Year'
    })
  })
}

// Stagger même valeur que loader.js pour le moment — à ajuster séparément
// par la suite, pas de couplage entre les deux.
const FILTERS_STAGGER = 0.03

// Tant qu'on n'est pas EXACTEMENT au top, les filter-button non-.active
// passent en display:none (stagger du dernier vers le premier). Au retour
// au top, ils repassent en display:block (stagger du premier vers le
// dernier — l'inverse).
function initFilters() {
  // Éléments concernés par le display:none/block en stagger : les
  // filter-button non-actifs, et les <p> parfois placés entre eux (toujours
  // concernés, pas de notion d'actif pour eux). querySelectorAll avec un
  // sélecteur groupé renvoie dans l'ordre du DOM, donc boutons et <p> restent
  // correctement entrelacés pour le stagger.
  function getToggleableElements() {
    return [...document.querySelectorAll('.filters .filter-button:not(.active), .filters p')]
  }

  // .filters ne doit pas s'effondrer quand la plupart de ses éléments passent
  // en display:none (sinon tout ce qui suit remonte/saute) : on fixe sa
  // hauteur à celle qu'elle a avec TOUT (boutons + <p>) en display:block, quel
  // que soit l'état d'affichage réel au moment de la mesure.
  const filters = document.querySelector('.filters')
  let resizeTimer = null

  function lockFiltersHeight() {
    if (!filters) return

    const elements = [...filters.querySelectorAll('.filter-button, p')]
    const previousDisplays = elements.map((el) => el.style.display)

    filters.style.height = 'auto'
    elements.forEach((el) => {
      el.style.display = 'block'
    })

    const fullHeight = filters.getBoundingClientRect().height

    elements.forEach((el, i) => {
      el.style.display = previousDisplays[i]
    })
    filters.style.height = `${fullHeight}px`
  }

  function onResize() {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(lockFiltersHeight, 150)
  }

  lockFiltersHeight()
  window.addEventListener('resize', onResize)

  // Le texte des filter-button se termine par "," pour tous sauf le dernier
  // (convention Webflow, texte réel, pas un ::after CSS). Vue/catégorie/tri
  // ont chacun leur propre bouton actif : plusieurs .active peuvent donc
  // rester visibles à la fois. C'est le DERNIER actif dans l'ordre du DOM
  // qui devient visuellement le dernier élément affiché — s'il n'est pas
  // naturellement le tout dernier bouton, sa virgule finale traîne toute
  // seule : on la remplace par un point le temps qu'il soit le dernier
  // visible, et on la restaure au retour au top.
  function fixActiveComma(atTop) {
    if (atTop) {
      document.querySelectorAll('.filter-button[data-comma-swapped="true"]').forEach((btn) => {
        btn.textContent = btn.textContent.replace(/\.(\s*)$/, ',$1')
        delete btn.dataset.commaSwapped
      })
      return
    }

    const actives = document.querySelectorAll('.filter-button.active')
    const lastActive = actives[actives.length - 1]
    if (lastActive && /,\s*$/.test(lastActive.textContent)) {
      lastActive.dataset.commaSwapped = 'true'
      lastActive.textContent = lastActive.textContent.replace(/,(\s*)$/, '.$1')
    }
  }

  let isAtTop = window.scrollY <= 0

  // gsap.set() sur plusieurs cibles ignore silencieusement stagger (seuls
  // .to/.from/.fromTo le gèrent réellement) : .to() avec une durée quasi
  // nulle pour que le stagger fonctionne (display ne s'anime pas en soi).
  function applyState(atTop) {
    fixActiveComma(atTop)

    const elements = getToggleableElements()
    if (!elements.length) return

    if (atTop) {
      gsap.to(elements, { display: 'block', duration: 0.01, stagger: FILTERS_STAGGER })
    } else {
      gsap.to(elements, { display: 'none', duration: 0.01, stagger: { each: FILTERS_STAGGER, from: 'end' } })
    }
  }

  // État initial correct sans animation (ex: page chargée déjà scrollée).
  fixActiveComma(isAtTop)
  gsap.set(getToggleableElements(), { display: isAtTop ? 'block' : 'none' })

  // Clic sur un filter-button.active (un de ceux qui restent affichés en
  // mode réduit) : ré-affiche tout, même sans être remonté au top. Repasse
  // dès le moindre scroll suivant (voir onScroll).
  let manuallyExpanded = false

  function onFiltersClick(e) {
    if (isAtTop || manuallyExpanded) return
    if (!e.target.closest('.filter-button.active')) return

    manuallyExpanded = true
    applyState(true)
  }

  filters?.addEventListener('click', onFiltersClick)

  function onScroll() {
    const nowAtTop = window.scrollY <= 0

    if (nowAtTop !== isAtTop) {
      isAtTop = nowAtTop
      manuallyExpanded = false
      applyState(isAtTop)
      return
    }

    // Toujours pas au top, mais ré-étendu manuellement au clic : le moindre
    // scroll suivant re-réduit tout.
    if (!isAtTop && manuallyExpanded) {
      manuallyExpanded = false
      applyState(false)
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true })

  return () => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onResize)
    filters?.removeEventListener('click', onFiltersClick)
    clearTimeout(resizeTimer)
  }
}

function initSort() {
  const buttons = document.querySelectorAll('[data-sort]')
  const gridList = document.querySelector('.grid-list')
  const indexList = document.querySelector('.index-list')
  if (!buttons.length || !gridList || !indexList) return

  // .grid-item / .index-item ne sont pas forcément des enfants directs de leur
  // liste (Webflow ajoute un wrapper .w-dyn-item autour de chaque item de
  // Collection List) : on retrouve l'ancêtre direct à déplacer pour ne pas
  // casser la structure lors du tri.
  const directChild = (list, el) => {
    let node = el
    while (node && node.parentElement !== list) {
      node = node.parentElement
    }
    return node
  }

  const gridItems = [...gridList.querySelectorAll('.grid-item')]
  const indexItems = [...indexList.querySelectorAll('.index-item')]

  const gridByName = new Map(gridItems.map((item) => [item.getAttribute('data-name'), item]))
  const indexByName = new Map(indexItems.map((item) => [item.getAttribute('data-name'), item]))

  const shuffle = (names) => {
    const result = [...names]
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }

  const sorters = {
    alphabetical: (names) => [...names].sort((a, b) => (a || '').localeCompare(b || '')),
    random: (names) => shuffle(names),
    date: (names) =>
      [...names].sort((a, b) => {
        const yearA = Number(indexByName.get(a)?.getAttribute('data-year')) || 0
        const yearB = Number(indexByName.get(b)?.getAttribute('data-year')) || 0
        return yearB - yearA
      }),
  }

  // Référence fixe : chaque tri repart toujours de cet ordre d'origine, jamais
  // du résultat du tri précédent. Sinon, en cas d'égalité (ex. même data-year),
  // Array.prototype.sort étant stable, le départage dépendrait de l'ordre
  // laissé par le tri précédent au lieu d'être toujours le même.
  const names = indexItems.map((item) => item.getAttribute('data-name'))

  const applySort = (sort) => {
    const sorter = sorters[sort]
    if (!sorter) return

    buttons.forEach((button) => {
      const value = button.getAttribute('data-sort')
      const isActive = value === sort
      button.classList.toggle('active', isActive)
      // .active pose pointer-events:none (on ne peut pas recliquer un tri déjà
      // actif) — sauf random, qu'on doit pouvoir recliquer pour re-mélanger.
      button.style.pointerEvents = isActive && value === 'random' ? 'auto' : ''
    })

    const order = sorter(names)

    order.forEach((name) => {
      const gridItem = gridByName.get(name)
      const gridChild = gridItem && directChild(gridList, gridItem)
      if (gridChild) gridList.appendChild(gridChild)

      const indexItem = indexByName.get(name)
      const indexChild = indexItem && directChild(indexList, indexItem)
      if (indexChild) indexList.appendChild(indexChild)
    })
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => applySort(button.getAttribute('data-sort')))
  })

  applySort('date')
}

export function initWork() {
  const categories = document.querySelector('.categories')
  if (categories) {
    const parent = categories.parentNode
    const buttons = categories.querySelectorAll('.categories-item .button')

    buttons.forEach((button) => {
      // La virgule ::after ciblait .categories-list .categories-item .button ;
      // une fois sortis de cette structure, on la rebranche via cette classe.
      button.classList.add('category-button')
      parent.insertBefore(button, categories)
    })

    categories.remove()
  }

  const index = document.getElementById('index')
  if (index) {
    index.textContent = document.querySelectorAll('.grid-list .grid-item').length
  }

  document.querySelectorAll('.index-list .index-item').forEach((indexItem) => {
    const categories = [...indexItem.querySelectorAll('.industries-item p')]
      .map((p) => p.textContent.trim())
      .filter(Boolean)
      .join(',')

    indexItem.setAttribute('data-categories', categories)

    const name = indexItem.getAttribute('data-name')
    if (!name) return

    const gridItem = document.querySelector(`.grid-list .grid-item[data-name="${CSS.escape(name)}"]`)
    if (gridItem) {
      gridItem.setAttribute('data-categories', categories)
    }

    const link = indexItem.querySelector(':scope > a')
    if (link) {
      link.href = `/work/${slugify(name)}`
    }
  })

  initViewToggle()
  initCategoryFilter()
  initSort()
  initLegend()

  const filtersCleanup = initFilters()
  cleanup = () => filtersCleanup?.()
}

export function destroyWork() {
  cleanup?.()
  cleanup = null
}
