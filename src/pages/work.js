import { updateHistoryRecord } from 'swup'
import { slugify } from '../utils/slugify.js'

// .grid-item / .index-item ne sont pas forcément des enfants directs de leur
// liste (Webflow ajoute un wrapper .w-dyn-item autour de chaque item de
// Collection List) : on retrouve l'ancêtre direct à déplacer pour ne pas
// casser la structure lors d'un réordonnancement (tri, filtre...).
function directChild(list, el) {
  let node = el
  while (node && node.parentElement !== list) {
    node = node.parentElement
  }
  return node
}

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
  const gridList = document.querySelector('.grid-list')
  const indexList = document.querySelector('.index-list')
  const gridItems = gridList ? [...gridList.querySelectorAll('.grid-item')] : []
  const indexItems = indexList ? [...indexList.querySelectorAll('.index-item')] : []
  if (!buttons.length || (!gridItems.length && !indexItems.length)) return

  // Le bouton "All" (data-category="All", casse libre) correspond à la valeur
  // interne 'all' : aucun filtre, tous les items actifs.
  const categoryOf = (button) => {
    const category = (button.getAttribute('data-category') || '').trim()
    return category.toLowerCase() === 'all' ? 'all' : category
  }

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

  // Les items correspondant au filtre passent en premier (dans leur ordre
  // relatif d'origine), les autres suivent (dans leur ordre relatif
  // d'origine) — pas de tri, juste un regroupement par correspondance.
  const reorderByMatch = (list, items, category) => {
    if (!list) return
    const matching = items.filter((item) => matches(item, category))
    const nonMatching = items.filter((item) => !matches(item, category))
    ;[...matching, ...nonMatching].forEach((item) => {
      const child = directChild(list, item)
      if (child) list.appendChild(child)
    })
  }

  const updateUrl = (category) => {
    const url = new URL(window.location.href)
    if (category === 'all') {
      url.searchParams.delete('category')
    } else {
      url.searchParams.set('category', slugify(category))
    }
    // updateHistoryRecord (et non history.replaceState(null, ...)) : conserve
    // l'état d'historique de swup (source: 'swup', index). Sans lui, swup
    // ignore le popstate et le bouton "précédent" change l'URL sans changer
    // la page.
    updateHistoryRecord(url.pathname + url.search + url.hash)
  }

  const applyFilter = (category, { syncUrl = true } = {}) => {
    buttons.forEach((button) => {
      button.classList.toggle('active', categoryOf(button) === category)
    })

    applyDim(gridItems, category, '0.1', { blur: true })
    applyDim(indexItems, category, '0.35')

    reorderByMatch(gridList, gridItems, category)
    reorderByMatch(indexList, indexItems, category)

    if (syncUrl) updateUrl(category)
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => applyFilter(categoryOf(button)))
  })

  // Filtre porté par l'URL (?category=...) au chargement, pour arriver depuis
  // une autre page directement sur la bonne vue filtrée. L'URL est en minuscule
  // (slugifiée) : on matche donc en slugifiant aussi les data-category.
  const urlCategory = new URL(window.location.href).searchParams.get('category')
  const matchedButton = urlCategory
    ? [...buttons].find((button) => slugify(button.getAttribute('data-category') || '') === urlCategory)
    : null
  const initialCategory = matchedButton ? categoryOf(matchedButton) : 'all'

  // Pas besoin de ré-écrire l'URL si on vient déjà de la lire dedans.
  applyFilter(initialCategory, { syncUrl: !matchedButton })
}

function initSort() {
  const buttons = document.querySelectorAll('[data-sort]')
  const gridList = document.querySelector('.grid-list')
  const indexList = document.querySelector('.index-list')
  if (!buttons.length || !gridList || !indexList) return

  const gridItems = [...gridList.querySelectorAll('.grid-item')]
  const indexItems = [...indexList.querySelectorAll('.index-item')]

  const gridByName = new Map(gridItems.map((item) => [item.getAttribute('data-name'), item]))
  const indexByName = new Map(indexItems.map((item) => [item.getAttribute('data-name'), item]))

  const sorters = {
    alphabetical: (names) => [...names].sort((a, b) => (a || '').localeCompare(b || '')),
  }

  // Référence fixe : chaque tri repart toujours de cet ordre d'origine, jamais
  // du résultat du tri précédent. Sinon, en cas d'égalité, Array.prototype.sort
  // étant stable, le départage dépendrait de l'ordre laissé par le tri
  // précédent au lieu d'être toujours le même.
  const names = indexItems.map((item) => item.getAttribute('data-name'))

  const applySort = (sort) => {
    const sorter = sorters[sort]
    if (!sorter) return

    buttons.forEach((button) => {
      button.classList.toggle('active', button.getAttribute('data-sort') === sort)
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

  applySort('alphabetical')
}

export function initWork() {
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
}
