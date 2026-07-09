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

  const tick = () => {
    el.textContent = getLondonTime()
  }

  tick()
  setInterval(tick, 1000)
}
