function isSupported(url) {
  return (
    url?.includes('boards.greenhouse.io') ||
    url?.includes('job-boards.greenhouse.io') ||
    url?.includes('jobs.lever.co')
  )
}

function escHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab
}

async function render() {
  const root = document.getElementById('root')
  const tab = await getCurrentTab()

  if (!isSupported(tab?.url)) {
    root.innerHTML = '<p class="unsupported">Open a Greenhouse or Lever<br>job page to use autofill.</p>'
    return
  }

  const { profile, error: profileError } = await chrome.runtime.sendMessage({ type: 'GET_PROFILE' })

  if (profileError || !profile) {
    root.innerHTML = `
      <p class="status error">
        Could not reach the backend.<br>
        Make sure it's running on :8000.
      </p>`
    return
  }

  // Get job info to know the employer slug (best-effort — content script may not be ready yet)
  let jobInfo = null
  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'GET_JOB_INFO' })
    jobInfo = result?.jobInfo ?? null
  } catch {}

  const slug = jobInfo?.company ?? null

  root.innerHTML = `
    <p class="profile-name">Profile: <strong>${escHtml(profile.full_name)}</strong></p>
    ${slug ? `<p class="profile-name">Employer: <strong>${escHtml(slug)}</strong></p>` : ''}
    <button class="primary" id="fill-btn">Fill Form</button>
    ${slug ? `<button class="secondary" id="save-btn">Save Answers for ${escHtml(slug)}</button>` : ''}
    <button class="secondary" id="applied-btn">Mark as Applied</button>
    <p class="status" id="status"></p>
  `

  const status = document.getElementById('status')

  function setStatus(msg, type = '') {
    status.textContent = msg
    status.className = `status ${type}`
  }

  document.getElementById('fill-btn').addEventListener('click', async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_FILL_DATA', employerSlug: slug })
      const { fillData, error: fdError } = response ?? {}
      if (fdError || !fillData) {
        setStatus('Could not load fill data.', 'error')
        return
      }
      const res = await chrome.tabs.sendMessage(tab.id, { type: 'FILL_FORM', fillData })
      if (res?.ok) {
        setStatus(`Filled ${res.platform} form`, 'success')
      } else {
        setStatus('Could not fill — is the form loaded?', 'error')
      }
    } catch {
      setStatus('Could not reach the page. Reload and try again.', 'error')
    }
  })

  if (slug) {
    document.getElementById('save-btn').addEventListener('click', async () => {
      const btn = document.getElementById('save-btn')
      btn.disabled = true
      setStatus('Reading form…')
      try {
        const { answers } = await chrome.tabs.sendMessage(tab.id, { type: 'READ_FORM_ANSWERS' })
        if (!answers || Object.keys(answers).length === 0) {
          setStatus('No filled answers found to save.', 'error')
          btn.disabled = false
          return
        }
        const res = await chrome.runtime.sendMessage({ type: 'SAVE_EMPLOYER_ANSWERS', slug, answers })
        if (res?.ok) {
          const count = Object.keys(answers).length
          setStatus(`Saved ${count} answer${count !== 1 ? 's' : ''} for ${slug}`, 'success')
        } else {
          setStatus(res?.error || 'Failed to save.', 'error')
        }
      } catch (err) {
        setStatus(err.message || 'Something went wrong.', 'error')
      }
      btn.disabled = false
    })
  }

  document.getElementById('applied-btn').addEventListener('click', async () => {
    const btn = document.getElementById('applied-btn')
    btn.disabled = true
    setStatus('Saving…')
    try {
      const { jobInfo: ji } = await chrome.tabs.sendMessage(tab.id, { type: 'GET_JOB_INFO' })
      if (!ji) {
        setStatus('Could not read job info from page.', 'error')
        btn.disabled = false
        return
      }
      const res = await chrome.runtime.sendMessage({ type: 'MARK_APPLIED_MANUAL', jobInfo: ji })
      if (res?.ok) {
        setStatus('Marked as applied!', 'success')
      } else {
        setStatus(res?.error || 'Failed.', 'error')
      }
    } catch (err) {
      setStatus(err.message || 'Something went wrong.', 'error')
    }
    btn.disabled = false
  })
}

render()
