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

function buildFillPreview(fd) {
  if (!fd) {
    return `<div class="fill-preview"><p class="status error">Could not load fill data.</p></div>`
  }

  function boolDisplay(val) {
    if (val === true) return 'Yes'
    if (val === false) return 'No'
    return null
  }

  const fields = [
    ['first name',      fd.first_name],
    ['last name',       fd.last_name],
    ['email',           fd.email],
    ['phone',           fd.phone],
    ['location',        fd.location],
    ['linkedin',        fd.linkedin_url],
    ['website',         fd.website_url],
    ['work auth',       fd.work_authorization],
    ['start date',      fd.start_date],
    ['timeline',        fd.timeline_notes],
    ['office avail',    fd.office_availability],
    ['country',         fd.country],
    ['visa sponsor',    boolDisplay(fd.requires_visa_sponsorship)],
    ['future visa',     boolDisplay(fd.requires_future_visa_sponsorship)],
    ['relocate',        boolDisplay(fd.willing_to_relocate)],
    ['cover letter',    fd.cover_letter_template ? '(set)' : null],
    ['resume',          fd.resume_text ? '(set)' : null],
    ['eeoc gender',     fd.eeoc_gender],
    ['eeoc ethnicity',  fd.eeoc_ethnicity],
    ['eeoc race',       fd.eeoc_race],
    ['eeoc veteran',    fd.eeoc_veteran_status],
    ['eeoc disability', fd.eeoc_disability_status],
  ]

  const customEntries = Object.entries(fd.custom_answers ?? {})
  const filledCount = fields.filter(([, v]) => v != null && v !== '').length + customEntries.length
  const totalCount = fields.length + customEntries.length

  const rows = fields.map(([key, val]) => {
    const isEmpty = val == null || val === ''
    return `<div class="fill-row">
      <span class="fill-key">${escHtml(key)}</span>
      <span class="fill-val${isEmpty ? ' empty' : ''}">${isEmpty ? '—' : escHtml(String(val))}</span>
    </div>`
  }).join('')

  const customSection = customEntries.length > 0
    ? `<div class="fill-section">custom answers</div>` +
      customEntries.map(([k, v]) => `<div class="fill-row">
        <span class="fill-key">${escHtml(k)}</span>
        <span class="fill-val">${escHtml(String(v))}</span>
      </div>`).join('')
    : ''

  return `
    <div class="fill-preview">
      <div class="fill-summary" id="fill-toggle">
        <span>Fill data: <strong>${filledCount}/${totalCount}</strong> fields set</span>
        <span id="fill-arrow">▶</span>
      </div>
      <div class="fill-table" id="fill-table">
        ${rows}${customSection}
      </div>
    </div>
  `
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

  // Fetch fill data eagerly — used both for preview and for the fill action
  let fillData = null
  try {
    const r = await chrome.runtime.sendMessage({ type: 'GET_FILL_DATA', employerSlug: slug })
    fillData = r?.fillData ?? null
  } catch {}

  root.innerHTML = `
    <p class="profile-name">Profile: <strong>${escHtml(profile.full_name)}</strong></p>
    ${slug ? `<p class="profile-name">Employer: <strong>${escHtml(slug)}</strong></p>` : ''}
    <button class="primary" id="fill-btn">Fill Form</button>
    ${slug ? `<button class="secondary" id="save-btn">Save Answers for ${escHtml(slug)}</button>` : ''}
    <button class="secondary" id="applied-btn">Mark as Applied</button>
    <p class="status" id="status"></p>
    ${buildFillPreview(fillData)}
  `

  const status = document.getElementById('status')

  function setStatus(msg, type = '') {
    status.textContent = msg
    status.className = `status ${type}`
  }

  document.getElementById('fill-toggle')?.addEventListener('click', () => {
    const table = document.getElementById('fill-table')
    const arrow = document.getElementById('fill-arrow')
    const isOpen = table.classList.toggle('open')
    arrow.textContent = isOpen ? '▼' : '▶'
  })

  document.getElementById('fill-btn').addEventListener('click', async () => {
    try {
      // Reuse already-fetched data; refetch only if somehow missing
      const fd = fillData ?? (await chrome.runtime.sendMessage({ type: 'GET_FILL_DATA', employerSlug: slug }))?.fillData
      if (!fd) {
        setStatus('Could not load fill data.', 'error')
        return
      }
      const res = await chrome.tabs.sendMessage(tab.id, { type: 'FILL_FORM', fillData: fd })
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
          // Refresh fill data so preview reflects newly saved answers
          fillData = null
          const r = await chrome.runtime.sendMessage({ type: 'GET_FILL_DATA', employerSlug: slug })
          fillData = r?.fillData ?? null
          document.querySelector('.fill-preview')?.replaceWith(
            document.createRange().createContextualFragment(buildFillPreview(fillData))
          )
          document.getElementById('fill-toggle')?.addEventListener('click', () => {
            const table = document.getElementById('fill-table')
            const arrow = document.getElementById('fill-arrow')
            const isOpen = table.classList.toggle('open')
            arrow.textContent = isOpen ? '▼' : '▶'
          })
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
