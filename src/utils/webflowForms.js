const CHECKED = 'w--redirected-checked'
const FOCUS = 'w--redirected-focus'
const VISUAL = '.w-checkbox-input, .w-radio-input'

let syncListening = false

function visualOf(input) {
  return input.closest('.w-checkbox, .w-radio')?.querySelector(VISUAL) ?? null
}

function syncInput(input) {
  visualOf(input)?.classList.toggle(CHECKED, input.checked)
}

function syncCustomInputs() {
  if (syncListening) return
  syncListening = true

  // Sur window (et non document) : en bubbling, window passe après les
  // listeners délégués de webflow.js sur document, donc on a le dernier mot.
  window.addEventListener('change', (e) => {
    const input = e.target
    if (input.type === 'checkbox') {
      syncInput(input)
    } else if (input.type === 'radio') {
      // Cocher un radio décoche les autres du groupe sans leur envoyer de change.
      const group = input.form?.querySelectorAll(`input[type="radio"][name="${CSS.escape(input.name)}"]`) ?? [input]
      group.forEach(syncInput)
    }
  })

  document.addEventListener('focusin', (e) => {
    if (e.target.type === 'checkbox' || e.target.type === 'radio') visualOf(e.target)?.classList.add(FOCUS)
  })
  document.addEventListener('focusout', (e) => {
    if (e.target.type === 'checkbox' || e.target.type === 'radio') visualOf(e.target)?.classList.remove(FOCUS)
  })
}

// Soumission : webflow.js charge un bundle par page. Si la page d'arrivée
// n'a pas de formulaire, le module "forms" peut être absent et rien
// n'intercepte le submit après une navigation swup → envoi natif (GET),
// rechargement, aucun mail. Dans ce cas seulement, on reproduit l'envoi
// hébergé de Webflow (même endpoint, même payload que webflow.js).
let submitListening = false

function collectFields(form) {
  const fields = {}
  const inputs = form.querySelectorAll('input, select, textarea')

  inputs.forEach((el, i) => {
    if (['submit', 'button', 'file', 'reset', 'image'].includes(el.type)) return
    const name = encodeURIComponent(el.dataset.name || el.name || `Field ${i + 1}`)

    if (el.type === 'checkbox') {
      fields[name] = el.checked
    } else if (el.type === 'radio') {
      if (name in fields) return
      fields[name] = form.querySelector(`input[type="radio"][name="${CSS.escape(el.name)}"]:checked`)?.value ?? null
    } else {
      fields[name] = el.value.trim()
    }
  })

  return fields
}

// Encodage identique à jQuery.param (fields[Nom]=valeur), attendu par l'API.
function encode(payload) {
  if (window.jQuery) return window.jQuery.param(payload)
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(payload)) {
    if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) params.append(`${key}[${k}]`, v ?? '')
    } else {
      params.append(key, value ?? '')
    }
  }
  return params.toString()
}

function showResult(form, success) {
  const wrapper = form.closest('.w-form')
  const done = wrapper?.querySelector(':scope > .w-form-done')
  const fail = wrapper?.querySelector(':scope > .w-form-fail')

  if (success && form.dataset.redirect) {
    window.location.href = form.dataset.redirect
    return
  }

  form.style.display = success ? 'none' : ''
  if (done) done.style.display = success ? 'block' : 'none'
  if (fail) fail.style.display = success ? 'none' : 'block'
  ;(success ? done : fail)?.focus?.()
}

async function submitToWebflow(form) {
  const siteId = document.documentElement.dataset.wfSite
  const button = form.querySelector('[type="submit"]')
  const label = button?.value
  if (button) {
    button.disabled = true
    if (button.dataset.wait) button.value = button.dataset.wait
  }

  const payload = {
    name: form.dataset.name || form.getAttribute('name') || 'Untitled Form',
    pageId: form.dataset.wfPageId || '',
    elementId: form.dataset.wfElementId || '',
    domain: document.documentElement.dataset.wfDomain || null,
    source: window.location.href,
    test: false,
    fields: collectFields(form),
    fileUploads: {},
    dolphin: false,
  }

  let success = false
  try {
    const res = await fetch(`https://webflow.com/api/v1/form/${siteId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: encode(payload),
    })
    const json = await res.json().catch(() => null)
    success = json?.code === 200
  } catch (err) {
    console.warn('[minchki] Envoi du formulaire échoué :', err)
  }

  if (button) {
    button.disabled = false
    if (label != null) button.value = label
  }
  showResult(form, success)
}

function handleSubmits() {
  if (submitListening) return
  submitListening = true

  // Sur window : passe après le handler délégué de webflow.js (sur document).
  // S'il a pris le submit en charge, il a appelé preventDefault → on ne fait rien.
  window.addEventListener('submit', (e) => {
    const form = e.target
    if (e.defaultPrevented || !form.closest?.('.w-form')) return
    if (form.getAttribute('action')) return // action custom : comportement natif

    e.preventDefault()
    submitToWebflow(form)
  })
}

export function initWebflowForms() {
  syncCustomInputs()
  handleSubmits()

  if (!document.querySelector('#swup form')) return

  // État initial (champs pré-cochés, ou retour arrière avec état restauré).
  document.querySelectorAll('#swup form input[type="checkbox"], #swup form input[type="radio"]').forEach(syncInput)

  try {
    window.Webflow?.require?.('forms')?.ready?.()
  } catch (err) {
    console.warn('[minchki] Réinit des formulaires Webflow impossible :', err)
  }
}
