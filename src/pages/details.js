import { slugify } from '../utils/slugify.js'

export function initDetails() {
  document.querySelectorAll('.industries-item .nav-link').forEach((link) => {
    const filter = link.getAttribute('data-filter')
    if (!filter) return

    link.href = `/work?category=${slugify(filter)}`
  })
}
