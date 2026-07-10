let cleanup = null

const OFFSET = 16

function isTouchDevice() {
  return window.matchMedia('(pointer: coarse)').matches
}

export function initCursor() {
  destroyCursor()

  // Curseur custom : desktop uniquement, pas de souris sur tactile.
  if (isTouchDevice()) return

  const cursor = document.querySelector('.cursor')
  const titleEl = cursor?.querySelector('[data-cursor="title"]')
  const descEl = cursor?.querySelector('[data-cursor="description"]')
  const items = document.querySelectorAll('[item-title], [item-description]')
  if (!cursor || !titleEl || !descEl || !items.length) return

  cursor.style.position = 'fixed'
  cursor.style.top = '0px'
  cursor.style.left = '0px'
  cursor.style.opacity = '0'
  cursor.style.pointerEvents = 'none'

  let mouseX = 0
  let mouseY = 0
  let active = false

  function positionCursor() {
    if (!active) return

    const rect = cursor.getBoundingClientRect()
    let x = mouseX + OFFSET
    let y = mouseY + OFFSET
    let alignEnd = false

    // Le curseur doit toujours rester entièrement visible : s'il sort par
    // la droite/le bas, on le fait passer de l'autre côté de la souris (avec
    // le même décalage de sécurité, inversé).
    if (mouseX + OFFSET + rect.width > window.innerWidth) {
      x = mouseX - rect.width - OFFSET
      alignEnd = true
    }
    if (mouseY + OFFSET + rect.height > window.innerHeight) {
      y = mouseY - rect.height - OFFSET
    }

    titleEl.classList.toggle('align-end', alignEnd)
    descEl.classList.toggle('align-end', alignEnd)
    cursor.style.left = `${x}px`
    cursor.style.top = `${y}px`
  }

  function onMouseMove(e) {
    mouseX = e.clientX
    mouseY = e.clientY
    positionCursor()
  }

  const handlers = []
  items.forEach((item) => {
    function onEnter(e) {
      active = true

      const title = item.getAttribute('item-title')
      const description = item.getAttribute('item-description')

      // Certaines pages (playground) n'ont qu'un des deux : on cache le p
      // vide plutôt que de laisser un espace/line-height inutile.
      titleEl.textContent = title || ''
      titleEl.style.display = title ? '' : 'none'
      descEl.textContent = description || ''
      descEl.style.display = description ? '' : 'none'

      cursor.style.opacity = '1'
      mouseX = e.clientX
      mouseY = e.clientY
      positionCursor()
    }

    function onLeave() {
      active = false
      cursor.style.opacity = '0'
    }

    item.addEventListener('mouseenter', onEnter)
    item.addEventListener('mouseleave', onLeave)
    handlers.push({ item, onEnter, onLeave })
  })

  document.addEventListener('mousemove', onMouseMove)

  cleanup = () => {
    document.removeEventListener('mousemove', onMouseMove)
    handlers.forEach(({ item, onEnter, onLeave }) => {
      item.removeEventListener('mouseenter', onEnter)
      item.removeEventListener('mouseleave', onLeave)
    })
  }
}

export function destroyCursor() {
  cleanup?.()
  cleanup = null
}
