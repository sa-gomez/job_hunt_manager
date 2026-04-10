const PLATFORM = detectPlatform()

function detectPlatform() {
  const url = window.location.href
  if (url.includes('boards.greenhouse.io') || url.includes('job-boards.greenhouse.io')) return 'greenhouse'
  if (url.includes('jobs.lever.co')) return 'lever'
  return null
}

function extractJobInfo() {
  const url = window.location.href
  if (PLATFORM === 'greenhouse') {
    const jobMatch = url.match(/\/jobs\/(\d+)/)
    const companyMatch = url.match(/greenhouse\.io\/([^/?]+)/)
    return {
      source: 'greenhouse',
      external_id: jobMatch?.[1] ?? null,
      company: companyMatch?.[1] ?? null,
      job_url: url.split('?')[0],
      job_title: document.querySelector('h1')?.textContent?.trim() ?? document.title,
    }
  }
  if (PLATFORM === 'lever') {
    const match = url.match(/jobs\.lever\.co\/([^/]+)\/([^/?]+)/)
    return {
      source: 'lever',
      external_id: match?.[2] ?? null,
      company: match?.[1] ?? null,
      job_url: url.replace(/\/apply$/, '').split('?')[0],
      job_title: document.querySelector('h2')?.textContent?.trim() ?? document.title,
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Native input / select helpers
// ---------------------------------------------------------------------------

function setField(selector, value) {
  if (value == null || value === '') return
  const el = typeof selector === 'string' ? document.querySelector(selector) : selector
  if (!el) return
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (nativeSetter) nativeSetter.call(el, value)
  else el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

function setNativeSelect(el, value) {
  if (!el || value == null || value === '') return
  const lower = String(value).toLowerCase()
  const opts = Array.from(el.options)
  const match =
    opts.find(o => o.value.toLowerCase() === lower) ??
    opts.find(o => o.text.toLowerCase().includes(lower)) ??
    opts.find(o => lower.includes(o.text.toLowerCase().trim()) && o.text.trim() !== '')
  if (match) {
    el.value = match.value
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }
}

// ---------------------------------------------------------------------------
// React-select helpers (the new Greenhouse job-boards SPA uses these)
// ---------------------------------------------------------------------------

// Walk up from el to find a react-select container (class ending in "-container")
function getReactSelectContainer(el) {
  if (!el) return null
  let node = el.parentElement
  while (node && node !== document.body) {
    const cls = typeof node.className === 'string' ? node.className : ''
    if (cls.split(' ').some(c => c.endsWith('-container'))) return node
    node = node.parentElement
  }
  return null
}

function isInsideReactSelect(el) {
  return getReactSelectContainer(el) !== null
}

// Click a react-select control open, wait for the menu, then click the matching option.
async function clickReactSelectOption(container, value) {
  if (!container || value == null || value === '') return
  const lower = String(value).toLowerCase()

  // The control is the first direct child div with "-control" in its class
  const control = Array.from(container.children).find(
    el => typeof el.className === 'string' && el.className.includes('-control')
  ) ?? container

  // Open the dropdown
  control.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }))
  control.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))

  await new Promise(r => setTimeout(r, 250))

  // React-select renders options with role="option" in a portal attached to document body
  const allOptions = [...document.querySelectorAll('[role="option"]')]

  // Prefer exact text match, fall back to contains
  const match =
    allOptions.find(o => o.textContent?.trim().toLowerCase() === lower) ??
    allOptions.find(o => o.textContent?.trim().toLowerCase().includes(lower)) ??
    allOptions.find(o => lower.includes(o.textContent?.trim().toLowerCase() ?? ''))

  if (match) {
    match.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    match.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    match.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  } else {
    // Close the dropdown without a selection
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  }

  // Small gap before the next dropdown interaction
  await new Promise(r => setTimeout(r, 100))
}

// ---------------------------------------------------------------------------
// Unified label-based setter (async — handles both native and react-select)
// ---------------------------------------------------------------------------

function findByLabel(labelText) {
  const lower = labelText.toLowerCase()
  for (const label of document.querySelectorAll('label')) {
    if (!label.textContent?.toLowerCase().includes(lower)) continue
    const forId = label.getAttribute('for')
    if (forId) {
      const el = document.getElementById(forId)
      if (el) return el
    }
    const el =
      label.querySelector('input, textarea, select') ??
      label.closest('div, li, fieldset')?.querySelector('input, textarea, select')
    if (el) return el
  }
  return null
}

async function setByLabel(labelText, value) {
  if (value == null || value === '') return
  const el = findByLabel(labelText)
  if (!el) return

  if (el.tagName === 'SELECT') {
    setNativeSelect(el, String(value))
    return
  }

  const reactContainer = getReactSelectContainer(el)
  if (reactContainer) {
    await clickReactSelectOption(reactContainer, String(value))
    return
  }

  setField(el, String(value))
}

function boolToYesNo(val) {
  if (val === true) return 'Yes'
  if (val === false) return 'No'
  return null
}

// ---------------------------------------------------------------------------
// Platform fill functions
// ---------------------------------------------------------------------------

async function fillGreenhouse(fd) {
  // Standard fields by selector (sync — native inputs)
  setField('#first_name', fd.first_name)
  setField('#last_name', fd.last_name)
  setField('#email', fd.email)
  setField('#phone', fd.phone)
  setField('#job_application_location', fd.location)

  // Rails-style name attributes (classic boards.greenhouse.io embeds)
  setField('input[name="job_application[first_name]"]', fd.first_name)
  setField('input[name="job_application[last_name]"]', fd.last_name)
  setField('input[name="job_application[email]"]', fd.email)
  setField('input[name="job_application[phone]"]', fd.phone)

  // Text / textarea fields by label (may be native inputs)
  await setByLabel('linkedin', fd.linkedin_url)
  await setByLabel('website', fd.website_url)
  await setByLabel('portfolio', fd.website_url)
  await setByLabel('work authorization', fd.work_authorization)
  await setByLabel('authorized to work', fd.work_authorization)
  await setByLabel('name pronunciation', fd.name_pronunciation)
  await setByLabel('start date', fd.start_date)
  await setByLabel('timeline', fd.timeline_notes)
  await setByLabel('work location', fd.location)
  await setByLabel('cover letter', fd.cover_letter_template)
  await setByLabel('additional information', fd.cover_letter_template)

  // Dropdowns (likely react-select on new Greenhouse job-boards)
  await setByLabel('country', fd.country)
  await setByLabel('visa sponsorship', boolToYesNo(fd.requires_visa_sponsorship))
  await setByLabel('sponsorship required', boolToYesNo(fd.requires_visa_sponsorship))
  await setByLabel('future visa', boolToYesNo(fd.requires_future_visa_sponsorship))
  await setByLabel('future sponsorship', boolToYesNo(fd.requires_future_visa_sponsorship))
  await setByLabel('relocation', boolToYesNo(fd.willing_to_relocate))
  await setByLabel('in-person', fd.office_availability)
  await setByLabel('office availability', fd.office_availability)
  await setByLabel('on-site', fd.office_availability)

  // EEOC (Hispanic/Latino is a separate ethnicity Yes/No, not a race option)
  await setByLabel('hispanic', fd.eeoc_ethnicity)
  await setByLabel('latino', fd.eeoc_ethnicity)
  await setByLabel('gender', fd.eeoc_gender)
  await setByLabel('race', fd.eeoc_race)
  await setByLabel('ethnicity', fd.eeoc_race)
  await setByLabel('veteran', fd.eeoc_veteran_status)
  await setByLabel('disability', fd.eeoc_disability_status)

  // Custom Q&A — employer-specific answers matched by label substring
  for (const [labelKey, answer] of Object.entries(fd.custom_answers ?? {})) {
    await setByLabel(labelKey, answer)
  }
}

async function fillLever(fd) {
  setField('input[name="name"]', fd.full_name)
  setField('input[name="email"]', fd.email)
  setField('input[name="phone"]', fd.phone)
  setField('input[name="urls[LinkedIn]"]', fd.linkedin_url)
  setField('input[name="urls[Portfolio]"]', fd.website_url)

  await setByLabel('name pronunciation', fd.name_pronunciation)
  await setByLabel('start date', fd.start_date)
  await setByLabel('timeline', fd.timeline_notes)
  await setByLabel('visa', boolToYesNo(fd.requires_visa_sponsorship))
  await setByLabel('relocation', boolToYesNo(fd.willing_to_relocate))
  await setByLabel('country', fd.country)

  for (const [labelKey, answer] of Object.entries(fd.custom_answers ?? {})) {
    await setByLabel(labelKey, answer)
  }
}

// ---------------------------------------------------------------------------
// Form answer reader (for "Save Answers" popup button)
// ---------------------------------------------------------------------------

const STANDARD_IDS = new Set(['first_name', 'last_name', 'email', 'phone', 'job_application_location'])
const STANDARD_NAME_PREFIXES = [
  'job_application[first_name]', 'job_application[last_name]',
  'job_application[email]', 'job_application[phone]',
]

function readGreenhouseAnswers() {
  const answers = {}
  for (const label of document.querySelectorAll('label')) {
    const rawText = label.textContent?.trim()
    if (!rawText) continue

    const forId = label.getAttribute('for')
    if (forId && STANDARD_IDS.has(forId)) continue

    let el = forId
      ? document.getElementById(forId)
      : label.querySelector('input, textarea, select') ??
        label.closest('div, li')?.querySelector('input, textarea, select')
    if (!el) continue

    const name = el.getAttribute('name') ?? ''
    if (STANDARD_NAME_PREFIXES.some(p => name.startsWith(p))) continue

    let value = ''
    if (el.tagName === 'SELECT') {
      const opt = el.options[el.selectedIndex]
      value = opt?.text?.trim() ?? ''
      if (!value || value.toLowerCase().startsWith('select')) continue
    } else if (isInsideReactSelect(el)) {
      // Read the currently displayed value from the react-select container
      const container = getReactSelectContainer(el)
      const singleValue = container?.querySelector('[class*="-singleValue"]')
      value = singleValue?.textContent?.trim() ?? ''
    } else {
      value = el.value?.trim() ?? ''
    }

    if (value) {
      const key = rawText.replace(/\*/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
      if (key) answers[key] = value
    }
  }
  return answers
}

function readLeverAnswers() {
  const answers = {}
  const SKIP_NAMES = new Set(['name', 'email', 'phone', 'urls[LinkedIn]', 'urls[Portfolio]'])
  for (const label of document.querySelectorAll('label')) {
    const rawText = label.textContent?.trim()
    if (!rawText) continue
    const forId = label.getAttribute('for')
    let el = forId
      ? document.getElementById(forId)
      : label.querySelector('input, textarea, select') ??
        label.closest('div')?.querySelector('input, textarea, select')
    if (!el) continue
    if (SKIP_NAMES.has(el.getAttribute('name') ?? '')) continue
    let value = ''
    if (el.tagName === 'SELECT') {
      const opt = el.options[el.selectedIndex]
      value = opt?.text?.trim() ?? ''
      if (!value || value.toLowerCase().startsWith('select')) continue
    } else if (isInsideReactSelect(el)) {
      const container = getReactSelectContainer(el)
      const singleValue = container?.querySelector('[class*="-singleValue"]')
      value = singleValue?.textContent?.trim() ?? ''
    } else {
      value = el.value?.trim() ?? ''
    }
    if (value) {
      const key = rawText.replace(/\*/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
      if (key) answers[key] = value
    }
  }
  return answers
}

// ---------------------------------------------------------------------------
// Submission detection
// ---------------------------------------------------------------------------

let submissionDetected = false
const _fetch = window.fetch.bind(window)
window.fetch = async function (input, init) {
  const response = await _fetch(input, init)
  if (!submissionDetected && init?.method?.toUpperCase() === 'POST') {
    const url = typeof input === 'string' ? input : input?.url ?? ''
    const isSubmission =
      (PLATFORM === 'greenhouse' && (url.includes('/applications') || url.includes('/apply'))) ||
      (PLATFORM === 'lever' && url.includes('/apply'))
    if (isSubmission && response.ok) {
      submissionDetected = true
      chrome.runtime.sendMessage({ type: 'APPLICATION_SUBMITTED', jobInfo: extractJobInfo() })
    }
  }
  return response
}

// ---------------------------------------------------------------------------
// Message listener
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'FILL_FORM') {
    // Respond immediately so the popup shows "Filled" right away;
    // the async field filling continues in the background.
    sendResponse({ ok: true, platform: PLATFORM })
    if (PLATFORM === 'greenhouse') fillGreenhouse(msg.fillData)
    else if (PLATFORM === 'lever') fillLever(msg.fillData)
  }
  if (msg.type === 'GET_JOB_INFO') {
    sendResponse({ jobInfo: extractJobInfo(), platform: PLATFORM })
  }
  if (msg.type === 'READ_FORM_ANSWERS') {
    let answers = {}
    if (PLATFORM === 'greenhouse') answers = readGreenhouseAnswers()
    else if (PLATFORM === 'lever') answers = readLeverAnswers()
    sendResponse({ answers, platform: PLATFORM })
  }
})

if (typeof module !== 'undefined') {
  module.exports = {
    boolToYesNo, setField, setNativeSelect,
    getReactSelectContainer, findByLabel,
    readGreenhouseAnswers, readLeverAnswers,
  }
}
