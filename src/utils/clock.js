function getLondonTime() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(new Date())

  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00'
  const dayPeriod = parts.find((p) => p.type === 'dayPeriod')?.value.toLowerCase() ?? ''

  return `london, ${hour}:${minute} ${dayPeriod}`
}

export function initClock() {
  const el = document.getElementById('time')
  if (!el) return

  // Au hover (desktop uniquement), on remplace l'heure par un texte fixe ;
  // le tick ne réécrit pas pendant le hover, et on revient à l'heure au hover out.
  let hovering = false

  const tick = () => {
    if (hovering) return
    el.textContent = getLondonTime()
  }

  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)')

  el.addEventListener('mouseenter', () => {
    if (!canHover.matches) return
    hovering = true
    el.textContent = 'Working Worldwide'
  })

  el.addEventListener('mouseleave', () => {
    if (!hovering) return
    hovering = false
    tick()
  })

  tick()
  setInterval(tick, 1000)
}
