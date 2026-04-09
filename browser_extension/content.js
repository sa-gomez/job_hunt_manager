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

// Set a form field value in a way that triggers React's synthetic events
function setField(selector, value) {
  if (!value) return
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

// Find an input by its associated label text (for custom questions)
function setFieldByLabel(labelText, value) {
  if (!value) return
  for (const label of document.querySelectorAll('label')) {
    if (label.textContent?.toLowerCase().includes(labelText.toLowerCase())) {
      const forId = label.getAttribute('for')
      const input = forId
        ? document.getElementById(forId)
        : label.querySelector('input, textarea')
      if (input) { setField(input, value); return }
    }
  }
}

function fillGreenhouse(profile) {
  const [first, ...rest] = (profile.full_name || '').split(' ')
  const last = rest.join(' ')

  // Standard Greenhouse field IDs
  setField('#first_name', first)
  setField('#last_name', last)
  setField('#email', profile.email)
  setField('#phone', profile.phone)
  setField('#job_application_location', profile.location)

  // Rails-style name attributes (some Greenhouse embeds)
  setField('input[name="job_application[first_name]"]', first)
  setField('input[name="job_application[last_name]"]', last)
  setField('input[name="job_application[email]"]', profile.email)
  setField('input[name="job_application[phone]"]', profile.phone)

  // Custom questions searched by label
  setFieldByLabel('linkedin', profile.linkedin_url)
  setFieldByLabel('website', profile.website_url)
  setFieldByLabel('portfolio', profile.website_url)
  setFieldByLabel('work authorization', profile.work_authorization)
  setFieldByLabel('authorized to work', profile.work_authorization)
}

function fillLever(profile) {
  setField('input[name="name"]', profile.full_name)
  setField('input[name="email"]', profile.email)
  setField('input[name="phone"]', profile.phone)
  setField('input[name="urls[LinkedIn]"]', profile.linkedin_url)
  setField('input[name="urls[Portfolio]"]', profile.website_url)
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
    if (PLATFORM === 'greenhouse') fillGreenhouse(msg.profile)
    else if (PLATFORM === 'lever') fillLever(msg.profile)
    sendResponse({ ok: true, platform: PLATFORM })
  }
  if (msg.type === 'GET_JOB_INFO') {
    sendResponse({ jobInfo: extractJobInfo(), platform: PLATFORM })
  }
})
