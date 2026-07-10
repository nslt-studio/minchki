import { slugify } from '../utils/slugify.js'

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

  const applyDim = (items, category, dimmedOpacity) => {
    items.forEach((item) => {
      const match = matches(item, category)
      item.style.opacity = match ? '' : dimmedOpacity
      item.style.pointerEvents = match ? '' : 'none'
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

    applyDim(gridItems, category, '0.1')
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
}
