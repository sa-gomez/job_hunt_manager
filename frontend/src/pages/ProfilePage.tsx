import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { applicationProfileApi, companiesApi, credentialsApi, employerAnswersApi, profileApi, type ApplicationProfileUpsert, type CompanyInfo, type CredentialInfo, type EmployerAnswerItem, type EmployerSlugSummary, type Profile, type ProfileCreate } from '../api/client'
import { BulkAddCompaniesModal } from '../components/BulkAddCompaniesModal'

const CITIES = [
  'Atlanta', 'Austin', 'Baltimore', 'Boston', 'Charlotte', 'Chicago',
  'Columbus', 'Dallas', 'Denver', 'Detroit', 'Houston', 'Indianapolis',
  'Jacksonville', 'Las Vegas', 'Los Angeles', 'Memphis', 'Miami',
  'Milwaukee', 'Minneapolis', 'Nashville', 'New Orleans', 'New York',
  'Oklahoma City', 'Philadelphia', 'Phoenix', 'Pittsburgh', 'Portland',
  'Raleigh', 'Sacramento', 'Salt Lake City', 'San Antonio', 'San Diego',
  'San Francisco', 'San Jose', 'Seattle', 'St. Louis', 'Tampa',
  'Washington DC',
  // International tech hubs
  'Amsterdam', 'Barcelona', 'Berlin', 'Dublin', 'London', 'Paris',
  'Singapore', 'Sydney', 'Tokyo', 'Toronto', 'Vancouver',
]

function LocationInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  const suggestions = value.length >= 2
    ? CITIES.filter(c => c.toLowerCase().includes(value.toLowerCase())).slice(0, 6)
    : []

  useEffect(() => {
    setActiveIndex(-1)
  }, [suggestions.length, value])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (city: string) => { onChange(city); setOpen(false); setActiveIndex(-1) }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      select(suggestions[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
      <input
        type="text"
        autoComplete="off"
        className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="e.g. San Francisco"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-md text-sm overflow-hidden">
          {suggestions.map((city, i) => (
            <li
              key={city}
              onMouseDown={() => select(city)}
              className={`px-3 py-2 cursor-pointer ${i === activeIndex ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-indigo-50 hover:text-indigo-700'}`}
            >
              {city}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const EMPTY: ProfileCreate = {
  full_name: '',
  email: '',
  location: '',
  remote_ok: true,
  skills: [],
  experience_years: undefined,
  experience_notes: '',
  target_roles: [],
  target_companies: [],
  salary_min: undefined,
  salary_max: undefined,
  phone: '',
  linkedin_url: '',
  website_url: '',
  work_authorization: '',
}

function TagInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string[]
  onChange: (v: string[]) => void
}) {
  const [input, setInput] = useState('')

  const add = () => {
    const trimmed = input.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInput('')
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex gap-2 mb-2 flex-wrap">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-sm"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="hover:text-indigo-600"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={`Add ${label.toLowerCase()} and press Enter`}
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
        >
          Add
        </button>
      </div>
    </div>
  )
}

function CompanyTagInput({
  value,
  onChange,
  knownCompanies = [],
}: {
  value: string[]
  onChange: (v: string[]) => void
  knownCompanies?: string[]
}) {
  const [input, setInput] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  // null = measuring phase (all tags rendered so we can read their positions)
  // number = how many tags to display; rest replaced by "+N more" pill
  const [visibleCount, setVisibleCount] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestions = input.trim().length >= 1
    ? knownCompanies.filter(
        c => c.toLowerCase().startsWith(input.trim().toLowerCase()) && !value.includes(c)
      )
    : []

  useEffect(() => { setActiveIndex(-1) }, [input])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const add = (name?: string) => {
    const trimmed = (name ?? input).trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInput('')
    setDropdownOpen(false)
    setActiveIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && suggestions.length > 0) {
      e.preventDefault()
      const target = activeIndex >= 0 ? suggestions[activeIndex] : suggestions[0]
      setInput(target)
      setDropdownOpen(true)
      return
    }
    if (e.key === 'ArrowDown' && dropdownOpen && suggestions.length > 0) {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1))
      return
    }
    if (e.key === 'ArrowUp' && dropdownOpen && suggestions.length > 0) {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Escape') { setDropdownOpen(false); return }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (dropdownOpen && activeIndex >= 0) {
        add(suggestions[activeIndex])
      } else {
        add()
      }
    }
  }

  // When value or expanded changes, reset to measuring phase so we re-measure.
  useLayoutEffect(() => {
    if (!expanded) setVisibleCount(null)
  }, [value, expanded])

  // Measure tag positions (only runs in measuring phase).
  // Both this and the reset above run before the browser paints, so the
  // "all tags" measuring render is never visible to the user.
  useLayoutEffect(() => {
    if (expanded || visibleCount !== null) return
    const container = containerRef.current
    if (!container || value.length === 0) { setVisibleCount(0); return }

    const tags = Array.from(container.querySelectorAll('[data-tag]')) as HTMLElement[]
    if (tags.length === 0) { setVisibleCount(0); return }

    const firstTop = tags[0].offsetTop
    const rowH = tags[0].offsetHeight
    const maxTop = firstTop + rowH + 8 + 4 // row height + gap (8px) + tolerance

    let fits = 0
    for (const tag of tags) {
      if (tag.offsetTop <= maxTop) fits++
      else break
    }

    // All fit — show everything with no pill.
    // Overflow — drop the last row-2 tag so the pill lands cleanly in its place.
    setVisibleCount(fits >= value.length ? value.length : Math.max(0, fits - 1))
  }, [visibleCount, value, expanded])

  // Re-measure when the container is resized (e.g. window resize).
  useLayoutEffect(() => {
    if (expanded || !containerRef.current) return
    const ro = new ResizeObserver(() => setVisibleCount(null))
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [expanded])

  const isMeasuring = !expanded && visibleCount === null
  const shown = expanded || isMeasuring ? value : value.slice(0, visibleCount!)
  const hiddenCount = !expanded && visibleCount !== null && visibleCount < value.length
    ? value.length - visibleCount
    : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700">Target Companies</label>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          + Bulk Add
        </button>
      </div>
      <div ref={containerRef} className="flex flex-wrap gap-2 mb-2">
        {shown.map((tag) => (
          <span
            key={tag}
            data-tag=""
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-sm"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="hover:text-indigo-600"
            >
              ×
            </button>
          </span>
        ))}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="px-2 py-0.5 rounded-full border border-gray-300 text-gray-500 text-sm hover:border-indigo-400 hover:text-indigo-700"
          >
            +{hiddenCount} more
          </button>
        )}
        {expanded && value.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="px-2 py-0.5 rounded-full border border-gray-300 text-gray-500 text-sm hover:border-indigo-400 hover:text-indigo-700"
          >
            Show less
          </button>
        )}
      </div>
      <div className="relative flex gap-2">
        <input
          ref={inputRef}
          className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={input}
          onChange={(e) => { setInput(e.target.value); setDropdownOpen(true) }}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setDropdownOpen(true)}
          placeholder="Add company and press Enter"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => add()}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
        >
          Add
        </button>
        {dropdownOpen && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-md shadow-md text-sm z-10 overflow-hidden"
            style={{ maxHeight: '12rem', overflowY: 'auto' }}
          >
            {suggestions.map((company, i) => (
              <div
                key={company}
                onMouseDown={() => add(company)}
                className={`flex items-center justify-between px-3 py-2 cursor-pointer ${i === activeIndex ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-indigo-50 hover:text-indigo-700'}`}
              >
                <span>{company}</span>
                {i === 0 && (
                  <span className="text-xs text-gray-300 ml-2 shrink-0">Tab to complete</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {showModal && (
        <BulkAddCompaniesModal
          existing={value}
          onConfirm={(companies) => { onChange(companies); setShowModal(false) }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

function CredentialsSection({ profileId }: { profileId: number }) {
  const [creds, setCreds] = useState<CredentialInfo[]>([])
  const [form, setForm] = useState({ service: 'linkedin', username: '', password: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      setCreds(await credentialsApi.list(profileId))
    } catch {}
  }

  useEffect(() => { load() }, [profileId])

  const save = async () => {
    setSaving(true)
    try {
      await credentialsApi.store({ profile_id: profileId, ...form })
      await load()
      setForm((f) => ({ ...f, username: '', password: '' }))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (service: string) => {
    await credentialsApi.delete(service, profileId)
    await load()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Site Credentials</h2>
      {creds.length > 0 && (
        <div className="mb-4 space-y-2">
          {creds.map((c) => (
            <div key={c.service} className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <span className="font-medium capitalize">{c.service}</span>
                <span className="ml-2 text-xs text-green-600">✓ configured</span>
              </div>
              <button
                onClick={() => remove(c.service)}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
          <select
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.service}
            onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))}
          >
            <option value="linkedin">LinkedIn</option>
            <option value="serpapi">SerpAPI (Google Jobs)</option>
          </select>
        </div>
        {form.service === 'linkedin' && (
          <>
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Email"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            />
            <input
              type="password"
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </>
        )}
        {form.service === 'serpapi' && (
          <input
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="SerpAPI Key"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
        )}
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Credentials'}
        </button>
      </div>
    </div>
  )
}

function EmployerQAEditor({
  answers,
  onChange,
}: {
  answers: EmployerAnswerItem[]
  onChange: (v: EmployerAnswerItem[]) => void
}) {
  const add = () => onChange([...answers, { question_label: '', answer: '' }])
  const update = (i: number, field: keyof EmployerAnswerItem, v: string) =>
    onChange(answers.map((a, idx) => (idx === i ? { ...a, [field]: v } : a)))
  const remove = (i: number) => onChange(answers.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-2">
      {answers.length === 0 && (
        <p className="text-xs text-gray-400">No answers yet. Add entries below.</p>
      )}
      {answers.map((a, i) => (
        <div key={i} className="flex gap-2 items-start">
          <input
            className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder='Question label (e.g. "have you built internal tools")'
            value={a.question_label}
            onChange={e => update(i, 'question_label', e.target.value)}
          />
          <input
            className="flex-[2] border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Answer"
            value={a.answer}
            onChange={e => update(i, 'answer', e.target.value)}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-gray-400 hover:text-red-500 text-lg leading-none px-1 pt-1"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
      >
        + Add answer
      </button>
    </div>
  )
}

function EmployerAnswersSection({ profileId }: { profileId: number }) {
  const [slugs, setSlugs] = useState<EmployerSlugSummary[]>([])
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [answers, setAnswers] = useState<EmployerAnswerItem[]>([])
  const [newSlugInput, setNewSlugInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadSlugs = () =>
    employerAnswersApi.listSlugs(profileId).then(setSlugs).catch(() => {})

  useEffect(() => { loadSlugs() }, [profileId])

  const selectSlug = async (slug: string) => {
    setSelectedSlug(slug)
    setSaved(false)
    try {
      const group = await employerAnswersApi.get(profileId, slug)
      setAnswers(group.answers)
    } catch {
      setAnswers([])
    }
  }

  const addNewSlug = () => {
    const slug = newSlugInput.trim().toLowerCase()
    if (!slug) return
    setNewSlugInput('')
    setSelectedSlug(slug)
    setAnswers([])
    setSaved(false)
  }

  const save = async () => {
    if (!selectedSlug) return
    setSaving(true)
    try {
      const group = await employerAnswersApi.upsert(profileId, selectedSlug, answers)
      setAnswers(group.answers)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      await loadSlugs()
    } finally {
      setSaving(false)
    }
  }

  const deleteSlug = async () => {
    if (!selectedSlug) return
    setDeleting(true)
    try {
      await employerAnswersApi.delete(profileId, selectedSlug)
      setSelectedSlug(null)
      setAnswers([])
      await loadSlugs()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Employer-Specific Q&amp;A</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Answers stored per company slug (e.g. <code className="bg-gray-100 px-1 rounded">anthropic</code>).
          The extension auto-fills these when you open that employer's job form, and saves new answers when you click "Save Answers" in the popup.
        </p>
      </div>

      {/* Slug pills */}
      {slugs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {slugs.map(s => (
            <button
              key={s.employer_slug}
              type="button"
              onClick={() => selectSlug(s.employer_slug)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                selectedSlug === s.employer_slug
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-gray-50 text-gray-700 border-gray-300 hover:border-indigo-400 hover:text-indigo-700'
              }`}
            >
              {s.employer_slug}
              <span className="ml-1.5 opacity-60 text-xs">{s.answer_count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Add new slug */}
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Add employer slug (e.g. anthropic)"
          value={newSlugInput}
          onChange={e => setNewSlugInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addNewSlug())}
        />
        <button
          type="button"
          onClick={addNewSlug}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
        >
          Open
        </button>
      </div>

      {/* Q&A editor for selected slug */}
      {selectedSlug && (
        <div className="border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">{selectedSlug}</h3>
            <button
              type="button"
              onClick={deleteSlug}
              disabled={deleting}
              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete all'}
            </button>
          </div>

          <EmployerQAEditor answers={answers} onChange={setAnswers} />

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="w-full py-1.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : `Save answers for ${selectedSlug}`}
          </button>
        </div>
      )}
    </div>
  )
}

const EMPTY_APP_PROFILE: ApplicationProfileUpsert = {
  resume_text: null,
  cover_letter_template: null,
  name_pronunciation: null,
  start_date: null,
  timeline_notes: null,
  requires_visa_sponsorship: null,
  requires_future_visa_sponsorship: null,
  willing_to_relocate: null,
  office_availability: null,
  country: null,
  eeoc_gender: null,
  eeoc_ethnicity: null,
  eeoc_race: null,
  eeoc_veteran_status: null,
  eeoc_disability_status: null,
  custom_answers: {},
}

type TriBool = 'true' | 'false' | ''

function triBoolToVal(s: TriBool): boolean | null {
  if (s === 'true') return true
  if (s === 'false') return false
  return null
}

function valToTriBool(v: boolean | null | undefined): TriBool {
  if (v === true) return 'true'
  if (v === false) return 'false'
  return ''
}

function TriBoolSelect({ label, value, onChange }: { label: string; value: TriBool; onChange: (v: TriBool) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        value={value}
        onChange={e => onChange(e.target.value as TriBool)}
      >
        <option value="">Not specified</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </div>
  )
}

function CustomAnswersEditor({
  value,
  onChange,
}: {
  value: Record<string, string>
  onChange: (v: Record<string, string>) => void
}) {
  const [pairs, setPairs] = useState<Array<{ key: string; val: string }>>(() =>
    Object.entries(value).map(([key, val]) => ({ key, val }))
  )

  const sync = (next: Array<{ key: string; val: string }>) => {
    setPairs(next)
    const obj: Record<string, string> = {}
    for (const { key, val } of next) {
      if (key.trim()) obj[key.trim()] = val
    }
    onChange(obj)
  }

  const add = () => sync([...pairs, { key: '', val: '' }])

  const update = (i: number, field: 'key' | 'val', v: string) => {
    const next = pairs.map((p, idx) => (idx === i ? { ...p, [field]: v } : p))
    sync(next)
  }

  const remove = (i: number) => sync(pairs.filter((_, idx) => idx !== i))

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          Custom Q&amp;A
          <span className="ml-1 text-xs text-gray-400 font-normal">(label substring → answer)</span>
        </label>
        <button
          type="button"
          onClick={add}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          + Add
        </button>
      </div>
      {pairs.length === 0 && (
        <p className="text-xs text-gray-400 mb-2">
          No custom answers yet. Add entries to auto-fill job-specific questions by matching their label text.
        </p>
      )}
      <div className="space-y-2">
        {pairs.map((p, i) => (
          <div key={i} className="flex gap-2 items-start">
            <input
              className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder='Label (e.g. "why anthropic")'
              value={p.key}
              onChange={e => update(i, 'key', e.target.value)}
            />
            <input
              className="flex-[2] border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Answer"
              value={p.val}
              onChange={e => update(i, 'val', e.target.value)}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-gray-400 hover:text-red-500 text-lg leading-none px-1"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function ApplicationProfileSection({ profileId }: { profileId: number }) {
  const [form, setForm] = useState<ApplicationProfileUpsert>(EMPTY_APP_PROFILE)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    applicationProfileApi.get(profileId).then(ap => {
      setForm({
        resume_text: ap.resume_text,
        cover_letter_template: ap.cover_letter_template,
        name_pronunciation: ap.name_pronunciation,
        start_date: ap.start_date,
        timeline_notes: ap.timeline_notes,
        requires_visa_sponsorship: ap.requires_visa_sponsorship,
        requires_future_visa_sponsorship: ap.requires_future_visa_sponsorship,
        willing_to_relocate: ap.willing_to_relocate,
        office_availability: ap.office_availability,
        country: ap.country,
        eeoc_gender: ap.eeoc_gender,
        eeoc_ethnicity: ap.eeoc_ethnicity,
        eeoc_race: ap.eeoc_race,
        eeoc_veteran_status: ap.eeoc_veteran_status,
        eeoc_disability_status: ap.eeoc_disability_status,
        custom_answers: ap.custom_answers,
      })
    }).catch(() => {
      // 404 is fine — no app profile yet
    }).finally(() => setLoaded(true))
  }, [profileId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await applicationProfileApi.upsert(profileId, form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const textField = (label: string, key: keyof ApplicationProfileUpsert, rows = 1) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {rows > 1 ? (
        <textarea
          className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={rows}
          value={(form[key] as string) ?? ''}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value || null }))}
        />
      ) : (
        <input
          type="text"
          className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={(form[key] as string) ?? ''}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value || null }))}
        />
      )}
    </div>
  )

  if (!loaded) return null

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <h2 className="text-lg font-semibold text-gray-900">Application Autofill</h2>
      <p className="text-xs text-gray-500 -mt-3">
        Stored separately from your profile — used by the browser extension to populate job application forms.
      </p>

      {textField('Resume (plain text)', 'resume_text', 8)}
      {textField('Cover Letter Template', 'cover_letter_template', 6)}

      <div className="grid grid-cols-2 gap-4">
        {textField('Name Pronunciation', 'name_pronunciation')}
        {textField('Available Start Date', 'start_date')}
      </div>

      {textField('Timeline / Scheduling Notes', 'timeline_notes')}

      <div className="border-t border-gray-100 pt-4 space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Work Authorization &amp; Location</h3>
        <div className="grid grid-cols-2 gap-4">
          <TriBoolSelect
            label="Requires Visa Sponsorship Now"
            value={valToTriBool(form.requires_visa_sponsorship)}
            onChange={v => setForm(f => ({ ...f, requires_visa_sponsorship: triBoolToVal(v) }))}
          />
          <TriBoolSelect
            label="Will Require Sponsorship in Future"
            value={valToTriBool(form.requires_future_visa_sponsorship)}
            onChange={v => setForm(f => ({ ...f, requires_future_visa_sponsorship: triBoolToVal(v) }))}
          />
          <TriBoolSelect
            label="Open to Relocation"
            value={valToTriBool(form.willing_to_relocate)}
            onChange={v => setForm(f => ({ ...f, willing_to_relocate: triBoolToVal(v) }))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            In-Person / Office Availability Answer
          </label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder='e.g. "Yes" or "Already in SF Bay or Seattle area"'
            value={form.office_availability ?? ''}
            onChange={e => setForm(f => ({ ...f, office_availability: e.target.value || null }))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder='e.g. "United States"'
            value={form.country ?? ''}
            onChange={e => setForm(f => ({ ...f, country: e.target.value || null }))}
          />
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4 space-y-3">
        <h3 className="text-sm font-medium text-gray-700">EEOC Self-Identification (optional)</h3>
        <div className="grid grid-cols-2 gap-4">
          {textField('Gender', 'eeoc_gender')}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hispanic / Latino</label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.eeoc_ethnicity ?? ''}
              onChange={e => setForm(f => ({ ...f, eeoc_ethnicity: e.target.value || null }))}
            >
              <option value="">Not specified</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="I don't wish to answer">I don't wish to answer</option>
            </select>
          </div>
          {textField('Race', 'eeoc_race')}
          {textField('Veteran Status', 'eeoc_veteran_status')}
          {textField('Disability Status', 'eeoc_disability_status')}
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <CustomAnswersEditor
          value={form.custom_answers}
          onChange={v => setForm(f => ({ ...f, custom_answers: v }))}
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Autofill Settings'}
      </button>
    </form>
  )
}

export function ProfilePage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [form, setForm] = useState<ProfileCreate>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [knownCompanies, setKnownCompanies] = useState<CompanyInfo[]>([])

  useEffect(() => {
    companiesApi.list().then(setKnownCompanies)
  }, [])

  useEffect(() => {
    profileApi.list().then((ps) => {
      setProfiles(ps)
      if (ps.length > 0) {
        const p = ps[0]
        setForm({
          full_name: p.full_name,
          email: p.email ?? '',
          location: p.location ?? '',
          remote_ok: p.remote_ok,
          skills: p.skills,
          experience_years: p.experience_years ?? undefined,
          experience_notes: p.experience_notes ?? '',
          target_roles: p.target_roles,
          target_companies: p.target_companies,
          salary_min: p.salary_min ?? undefined,
          salary_max: p.salary_max ?? undefined,
          phone: p.phone ?? '',
          linkedin_url: p.linkedin_url ?? '',
          website_url: p.website_url ?? '',
          work_authorization: p.work_authorization ?? '',
        })
      }
    })
  }, [])

  const current = profiles[0]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        email: form.email || undefined,
        experience_notes: form.experience_notes || undefined,
      }
      let updated: Profile
      if (current) {
        updated = await profileApi.update(current.id, payload)
        setProfiles([updated])
      } else {
        updated = await profileApi.create(payload)
        setProfiles([updated])
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const field = (label: string, key: keyof ProfileCreate, type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        value={(form[key] as string | number | undefined) ?? ''}
        onChange={(e) =>
          setForm((f) => ({
            ...f,
            [key]: type === 'number' ? (e.target.value ? Number(e.target.value) : undefined) : e.target.value,
          }))
        }
      />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {field('Full Name', 'full_name')}
        {field('Email', 'email', 'email')}
        {field('Phone', 'phone', 'tel')}
        {field('LinkedIn URL', 'linkedin_url')}
        {field('Website / Portfolio URL', 'website_url')}
        {field('Work Authorization', 'work_authorization')}
        <LocationInput value={form.location ?? ''} onChange={v => setForm(f => ({ ...f, location: v }))} />

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="remote_ok"
            checked={form.remote_ok ?? true}
            onChange={(e) => setForm((f) => ({ ...f, remote_ok: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600"
          />
          <label htmlFor="remote_ok" className="text-sm font-medium text-gray-700">Open to remote</label>
        </div>

        {field('Years of Experience', 'experience_years', 'number')}
        {field('Salary Min (USD)', 'salary_min', 'number')}
        {field('Salary Max (USD)', 'salary_max', 'number')}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Experience Notes</label>
          <textarea
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={3}
            value={form.experience_notes ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, experience_notes: e.target.value }))}
          />
        </div>

        <TagInput
          label="Skills"
          value={form.skills ?? []}
          onChange={(v) => setForm((f) => ({ ...f, skills: v }))}
        />
        <TagInput
          label="Target Roles"
          value={form.target_roles ?? []}
          onChange={(v) => setForm((f) => ({ ...f, target_roles: v }))}
        />
        <CompanyTagInput
          value={form.target_companies ?? []}
          onChange={(v) => setForm((f) => ({ ...f, target_companies: v }))}
          knownCompanies={knownCompanies.map(c => c.name)}
        />

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : current ? 'Update Profile' : 'Create Profile'}
        </button>
      </form>

      {current && <CredentialsSection profileId={current.id} />}
      {current && <EmployerAnswersSection profileId={current.id} />}
      {current && <ApplicationProfileSection profileId={current.id} />}
    </div>
  )
}
