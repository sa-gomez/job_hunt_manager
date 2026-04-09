function isSupported(url) {
  return (
    url?.includes('boards.greenhouse.io') ||
    url?.includes('job-boards.greenhouse.io') ||
    url?.includes('jobs.lever.co')
  )
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

  root.innerHTML = `
    <p class="profile-name">Profile: <strong>${profile.full_name}</strong></p>
    <button class="primary" id="fill-btn">Fill Form</button>
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
      const res = await chrome.tabs.sendMessage(tab.id, { type: 'FILL_FORM', profile })
      if (res?.ok) {
        setStatus(`Filled ${res.platform} form`, 'success')
      } else {
        setStatus('Could not fill — is the form loaded?', 'error')
      }
    } catch {
      setStatus('Could not reach the page. Reload and try again.', 'error')
    }
  })

  document.getElementById('applied-btn').addEventListener('click', async () => {
    const btn = document.getElementById('applied-btn')
    btn.disabled = true
    setStatus('Saving…')
    try {
      const { jobInfo } = await chrome.tabs.sendMessage(tab.id, { type: 'GET_JOB_INFO' })
      if (!jobInfo) {
        setStatus('Could not read job info from page.', 'error')
        btn.disabled = false
        return
      }
      const res = await chrome.runtime.sendMessage({ type: 'MARK_APPLIED_MANUAL', jobInfo })
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
