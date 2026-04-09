import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { credentialsApi, profileApi, type CredentialInfo, type Profile, type ProfileCreate } from '../api/client'
import { BulkAddCompaniesModal } from '../components/BulkAddCompaniesModal'

// Companies with known scraper slugs (Greenhouse + Lever)
const KNOWN_COMPANIES = [
  'Airbnb', 'Airtable', 'Anthropic', 'Asana', 'Brex', 'Carta', 'Checkr',
  'Cloudflare', 'Coinbase', 'Confluent', 'Databricks', 'Discord', 'Elastic',
  'Figma', 'GitHub', 'GitLab', 'Gusto', 'HashiCorp', 'HubSpot', 'Lattice',
  'Lever', 'Linear', 'Loom', 'Mercury', 'Modal', 'MongoDB', 'Netflix',
  'Notion', 'OpenAI', 'PagerDuty', 'Plaid', 'Replit', 'Retool', 'Rippling',
  'Scale AI', 'Shopify', 'Snowflake', 'Squarespace', 'Stripe', 'Together',
  'Twilio', 'Vercel', 'Zendesk',
]

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
}: {
  value: string[]
  onChange: (v: string[]) => void
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
    ? KNOWN_COMPANIES.filter(
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

export function ProfilePage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [form, setForm] = useState<ProfileCreate>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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
    </div>
  )
}
