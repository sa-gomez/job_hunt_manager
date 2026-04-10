const API_BASE = 'http://localhost:8000/api'

let profileCache = null
const fillDataCache = {} // keyed by employerSlug ('' for no slug)

async function getProfile() {
  if (profileCache) return profileCache
  const res = await fetch(`${API_BASE}/profile`)
  if (!res.ok) throw new Error(`API returned ${res.status}`)
  const profiles = await res.json()
  profileCache = profiles[0] ?? null
  return profileCache
}

async function getFillData(employerSlug) {
  const key = employerSlug ?? ''
  if (fillDataCache[key]) return fillDataCache[key]
  const profile = await getProfile()
  if (!profile) return null
  const params = employerSlug ? `?employer_slug=${encodeURIComponent(employerSlug)}` : ''
  const res = await fetch(`${API_BASE}/autofill/fill-data/${profile.id}${params}`)
  if (!res.ok) throw new Error(`API returned ${res.status}`)
  fillDataCache[key] = await res.json()
  return fillDataCache[key]
}

async function saveEmployerAnswers(slug, answers) {
  const profile = await getProfile()
  if (!profile) throw new Error('No profile found')
  const pairs = Object.entries(answers).map(([question_label, answer]) => ({ question_label, answer }))
  const res = await fetch(`${API_BASE}/employer-answers/${profile.id}/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pairs),
  })
  if (!res.ok) throw new Error(`API returned ${res.status}`)
  // Invalidate cached fill data for this slug so next fill picks up new answers
  delete fillDataCache[slug]
  return res.json()
}

async function markApplied(jobInfo) {
  const profile = await getProfile()
  if (!profile) throw new Error('No profile found')
  const res = await fetch(`${API_BASE}/autofill/applied`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: profile.id, ...jobInfo }),
  })
  if (!res.ok) throw new Error(`API returned ${res.status}`)
  return res.json()
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_PROFILE') {
    getProfile()
      .then(profile => sendResponse({ profile }))
      .catch(err => sendResponse({ error: err.message }))
    return true
  }

  if (msg.type === 'GET_FILL_DATA') {
    getFillData(msg.employerSlug ?? null)
      .then(fillData => sendResponse({ fillData }))
      .catch(err => sendResponse({ error: err.message }))
    return true
  }

  if (msg.type === 'SAVE_EMPLOYER_ANSWERS') {
    saveEmployerAnswers(msg.slug, msg.answers)
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ error: err.message }))
    return true
  }

  if (msg.type === 'APPLICATION_SUBMITTED') {
    markApplied(msg.jobInfo).catch(err => console.error('Failed to mark applied:', err))
  }

  if (msg.type === 'MARK_APPLIED_MANUAL') {
    markApplied(msg.jobInfo)
      .then(data => sendResponse(data))
      .catch(err => sendResponse({ error: err.message }))
    return true
  }
})
