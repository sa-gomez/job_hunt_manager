const API_BASE = 'http://localhost:8000/api'

// Cache profile for the session to avoid repeated fetches
let profileCache = null

async function getProfile() {
  if (profileCache) return profileCache
  const res = await fetch(`${API_BASE}/profile`)
  if (!res.ok) throw new Error(`API returned ${res.status}`)
  const profiles = await res.json()
  profileCache = profiles[0] ?? null
  return profileCache
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
    return true // keep message channel open for async response
  }

  if (msg.type === 'APPLICATION_SUBMITTED') {
    // Fire and forget — content script detected a successful submission
    markApplied(msg.jobInfo).catch(err => console.error('Failed to mark applied:', err))
  }

  if (msg.type === 'MARK_APPLIED_MANUAL') {
    markApplied(msg.jobInfo)
      .then(data => sendResponse(data))
      .catch(err => sendResponse({ error: err.message }))
    return true
  }
})
