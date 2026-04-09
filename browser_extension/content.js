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

// Set a text/textarea field value in a way that triggers React's synthetic events
function setField(selector, value) {
  if (value == null || value === '') return
  const el = typeof selector === 'string' ? document.querySelector(selector) : selector
  if (!el) return
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (nativeSetter) {
    nativeSetter.call(el, value)
  } else {
    el.value = value
  }
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

// Set a <select> element by matching option text or value
function setSelect(el, value) {
  if (!el || value == null || value === '') return
  const str = String(value)
  const lower = str.toLowerCase()
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

// Find the first input/textarea/select associated with a label whose text contains labelText
function findByLabel(labelText) {
  const lower = labelText.toLowerCase()
  for (const label of document.querySelectorAll('label')) {
    if (!label.textContent?.toLowerCase().includes(lower)) continue
    const forId = label.getAttribute('for')
    if (forId) {
      const el = document.getElementById(forId)
      if (el) return el
    }
    const el = label.querySelector('input, textarea, select')
      ?? label.closest('div, li, fieldset')?.querySelector('input, textarea, select')
    if (el) return el
  }
  return null
}

// Set a field (input, textarea, or select) found by label text
function setByLabel(labelText, value) {
  if (value == null || value === '') return
  const el = findByLabel(labelText)
  if (!el) return
  if (el.tagName === 'SELECT') setSelect(el, String(value))
  else setField(el, String(value))
}

function boolToYesNo(val) {
  if (val === true) return 'Yes'
  if (val === false) return 'No'
  return null
}

function fillGreenhouse(fd) {
  // Standard Greenhouse field IDs
  setField('#first_name', fd.first_name)
  setField('#last_name', fd.last_name)
  setField('#email', fd.email)
  setField('#phone', fd.phone)
  setField('#job_application_location', fd.location)

  // Rails-style name attributes (some Greenhouse embeds)
  setField('input[name="job_application[first_name]"]', fd.first_name)
  setField('input[name="job_application[last_name]"]', fd.last_name)
  setField('input[name="job_application[email]"]', fd.email)
  setField('input[name="job_application[phone]"]', fd.phone)

  // Standard fields by label
  setByLabel('linkedin', fd.linkedin_url)
  setByLabel('website', fd.website_url)
  setByLabel('portfolio', fd.website_url)
  setByLabel('work authorization', fd.work_authorization)
  setByLabel('authorized to work', fd.work_authorization)
  setByLabel('name pronunciation', fd.name_pronunciation)
  setByLabel('start date', fd.start_date)
  setByLabel('timeline', fd.timeline_notes)
  setByLabel('work location', fd.location)
  setByLabel('cover letter', fd.cover_letter_template)
  setByLabel('additional information', fd.cover_letter_template)

  // Visa / sponsorship (select dropdowns)
  setByLabel('visa sponsorship', boolToYesNo(fd.requires_visa_sponsorship))
  setByLabel('sponsorship required', boolToYesNo(fd.requires_visa_sponsorship))
  setByLabel('future visa', boolToYesNo(fd.requires_future_visa_sponsorship))
  setByLabel('future sponsorship', boolToYesNo(fd.requires_future_visa_sponsorship))

  // Location / office
  setByLabel('relocation', boolToYesNo(fd.willing_to_relocate))
  setByLabel('in-person', fd.office_availability)
  setByLabel('office availability', fd.office_availability)
  setByLabel('on-site', fd.office_availability)

  // EEOC
  setByLabel('gender', fd.eeoc_gender)
  setByLabel('race', fd.eeoc_race)
  setByLabel('ethnicity', fd.eeoc_race)
  setByLabel('veteran', fd.eeoc_veteran_status)
  setByLabel('disability', fd.eeoc_disability_status)

  // Custom Q&A — match by label substring
  for (const [labelKey, answer] of Object.entries(fd.custom_answers ?? {})) {
    setByLabel(labelKey, answer)
  }
}

function fillLever(fd) {
  setField('input[name="name"]', fd.full_name)
  setField('input[name="email"]', fd.email)
  setField('input[name="phone"]', fd.phone)
  setField('input[name="urls[LinkedIn]"]', fd.linkedin_url)
  setField('input[name="urls[Portfolio]"]', fd.website_url)

  setByLabel('name pronunciation', fd.name_pronunciation)
  setByLabel('start date', fd.start_date)
  setByLabel('timeline', fd.timeline_notes)
  setByLabel('visa', boolToYesNo(fd.requires_visa_sponsorship))
  setByLabel('relocation', boolToYesNo(fd.willing_to_relocate))

  for (const [labelKey, answer] of Object.entries(fd.custom_answers ?? {})) {
    setByLabel(labelKey, answer)
  }
}

// Standard field IDs / name-prefixes that belong to the profile, not employer Q&A
const STANDARD_IDS = new Set(['first_name', 'last_name', 'email', 'phone', 'job_application_location'])
const STANDARD_NAME_PREFIXES = [
  'job_application[first_name]', 'job_application[last_name]',
  'job_application[email]', 'job_application[phone]',
]

// Read all non-standard labeled fields currently filled in the Greenhouse form
function readGreenhouseAnswers() {
  const answers = {}
  for (const label of document.querySelectorAll('label')) {
    const rawText = label.textContent?.trim()
    if (!rawText) continue

    const forId = label.getAttribute('for')
    if (forId && STANDARD_IDS.has(forId)) continue

    let el = forId
      ? document.getElementById(forId)
      : label.querySelector('input, textarea, select')
        ?? label.closest('div, li')?.querySelector('input, textarea, select')
    if (!el) continue

    const name = el.getAttribute('name') ?? ''
    if (STANDARD_NAME_PREFIXES.some(p => name.startsWith(p))) continue

    let value = ''
    if (el.tagName === 'SELECT') {
      const opt = el.options[el.selectedIndex]
      value = opt?.text?.trim() ?? ''
      if (!value || value.toLowerCase().startsWith('select')) continue
    } else {
      value = el.value?.trim() ?? ''
    }

    if (value) {
      // Normalize label: strip asterisks / required markers, collapse whitespace, lowercase
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
      : label.querySelector('input, textarea, select')
        ?? label.closest('div')?.querySelector('input, textarea, select')
    if (!el) continue
    if (SKIP_NAMES.has(el.getAttribute('name') ?? '')) continue
    let value = ''
    if (el.tagName === 'SELECT') {
      const opt = el.options[el.selectedIndex]
      value = opt?.text?.trim() ?? ''
      if (!value || value.toLowerCase().startsWith('select')) continue
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

// Intercept fetch to detect a successful form submission
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
      chrome.runtime.sendMessage({
        type: 'APPLICATION_SUBMITTED',
        jobInfo: extractJobInfo(),
      })
    }
  }
  return response
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'FILL_FORM') {
    if (PLATFORM === 'greenhouse') fillGreenhouse(msg.fillData)
    else if (PLATFORM === 'lever') fillLever(msg.fillData)
    sendResponse({ ok: true, platform: PLATFORM })
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
