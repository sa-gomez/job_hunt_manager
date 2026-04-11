import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  type ApplicationRecord,
  STAGE_LABELS,
  STAGES,
  type Stage,
  applicationsApi,
  googleAuthApi,
  profileApi,
  type Profile,
} from '../api/client'

// ---------------------------------------------------------------------------
// Add / Edit modal
// ---------------------------------------------------------------------------
interface FormState {
  company: string
  job_title: string
  job_url: string
  stage: Stage
  notes: string
  recruiter_name: string
  applied_at: string
}

const EMPTY_FORM: FormState = {
  company: '',
  job_title: '',
  job_url: '',
  stage: 'applied',
  notes: '',
  recruiter_name: '',
  applied_at: '',
}

function ApplicationModal({
  profileId,
  initial,
  onClose,
  onSaved,
}: {
  profileId: number
  initial?: ApplicationRecord
  onClose: () => void
  onSaved: (app: ApplicationRecord) => void
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          company: initial.company,
          job_title: initial.job_title,
          job_url: initial.job_url ?? '',
          stage: initial.stage,
          notes: initial.notes ?? '',
          recruiter_name: initial.recruiter_name ?? '',
          applied_at: initial.applied_at ? initial.applied_at.slice(0, 10) : '',
        }
      : EMPTY_FORM
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof FormState, value: string) =>
    setForm(f => ({ ...f, [field]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        company: form.company.trim(),
        job_title: form.job_title.trim(),
        job_url: form.job_url.trim() || undefined,
        stage: form.stage,
        notes: form.notes.trim() || undefined,
        recruiter_name: form.recruiter_name.trim() || undefined,
        applied_at: form.applied_at || undefined,
      }
      const saved = initial
        ? await applicationsApi.update(initial.id, payload)
        : await applicationsApi.create({ profile_id: profileId, ...payload })
      onSaved(saved)
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
        <h2 className="text-lg font-semibold mb-4">
          {initial ? 'Edit Application' : 'Add Application'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Company *</label>
              <input
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                value={form.company}
                onChange={e => set('company', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Job Title *</label>
              <input
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                value={form.job_title}
                onChange={e => set('job_title', e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Job URL</label>
            <input
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
              type="url"
              value={form.job_url}
              onChange={e => set('job_url', e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Stage</label>
              <select
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                value={form.stage}
                onChange={e => set('stage', e.target.value as Stage)}
              >
                {STAGES.map(s => (
                  <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Applied Date</label>
              <input
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                type="date"
                value={form.applied_at}
                onChange={e => set('applied_at', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Recruiter Name</label>
            <input
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
              value={form.recruiter_name}
              onChange={e => set('recruiter_name', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
              rows={3}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stage badge colors
// ---------------------------------------------------------------------------
const STAGE_COLORS: Record<Stage, string> = {
  applied: 'bg-blue-100 text-blue-800',
  recruiter_screen: 'bg-purple-100 text-purple-800',
  technical: 'bg-yellow-100 text-yellow-800',
  interview_rounds: 'bg-orange-100 text-orange-800',
  offer_negotiating: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-600',
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export function ApplicationsPage() {
  const [searchParams] = useSearchParams()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [profileId, setProfileId] = useState<number | null>(null)
  const [apps, setApps] = useState<ApplicationRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<ApplicationRecord | null>(null)
  const [sheetsConnected, setSheetsConnected] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  // Check for OAuth redirect success
  const connectedParam = searchParams.get('connected')

  useEffect(() => {
    profileApi.list().then(ps => {
      setProfiles(ps)
      const paramId = searchParams.get('profile_id')
      const first = paramId ? parseInt(paramId) : ps[0]?.id ?? null
      setProfileId(first)
    })
  }, [])

  useEffect(() => {
    if (!profileId) return
    setLoading(true)
    Promise.all([
      applicationsApi.list(profileId),
      googleAuthApi.status(profileId),
    ]).then(([appsData, statusData]) => {
      setApps(appsData)
      setSheetsConnected(statusData.connected)
      if (connectedParam === 'true') {
        setSyncMessage('Google Sheets connected!')
        setTimeout(() => setSyncMessage(null), 4000)
      }
    }).finally(() => setLoading(false))
  }, [profileId])

  async function handleStageChange(app: ApplicationRecord, stage: Stage) {
    const updated = await applicationsApi.update(app.id, { stage })
    setApps(prev => prev.map(a => (a.id === updated.id ? updated : a)))
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this application?')) return
    await applicationsApi.remove(id)
    setApps(prev => prev.filter(a => a.id !== id))
  }

  async function handleSync() {
    if (!profileId) return
    setSyncing(true)
    setSyncMessage(null)
    try {
      const res = await applicationsApi.sync(profileId)
      setSyncMessage(res.message)
      // Re-fetch to pick up any changes pulled from the sheet
      const fresh = await applicationsApi.list(profileId)
      setApps(fresh)
    } catch {
      setSyncMessage('Sync failed. Check server logs.')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMessage(null), 5000)
    }
  }

  async function handleConnectSheets() {
    if (!profileId) return
    const { auth_url } = await googleAuthApi.getAuthUrl(profileId)
    window.location.href = auth_url
  }

  function handleSaved(saved: ApplicationRecord) {
    setApps(prev => {
      const idx = prev.findIndex(a => a.id === saved.id)
      return idx >= 0
        ? prev.map(a => (a.id === saved.id ? saved : a))
        : [saved, ...prev]
    })
    setShowModal(false)
    setEditing(null)
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Applications</h1>
          {profiles.length > 1 && (
            <select
              className="border border-gray-300 rounded px-2 py-1 text-sm"
              value={profileId ?? ''}
              onChange={e => setProfileId(parseInt(e.target.value))}
            >
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          {syncMessage && (
            <span className="text-sm text-gray-600 italic">{syncMessage}</span>
          )}
          {sheetsConnected ? (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border border-green-600 text-green-700 hover:bg-green-50 disabled:opacity-50"
            >
              {syncing ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Syncing…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sync with Sheets
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleConnectSheets}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.7 3H4.3C3.58 3 3 3.58 3 4.3v15.4c0 .72.58 1.3 1.3 1.3h15.4c.72 0 1.3-.58 1.3-1.3V4.3C21 3.58 20.42 3 19.7 3zm-7 13H8v-1.5h4.7V16zm3-3H8v-1.5h7.7V13zm0-3H8V8.5h7.7V10z" />
              </svg>
              Connect Google Sheets
            </button>
          )}
          <button
            onClick={() => { setEditing(null); setShowModal(true) }}
            className="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700"
          >
            + Add Application
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : apps.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No applications yet</p>
          <p className="text-sm mt-1">Click "Add Application" to get started</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Stage</th>
                <th className="px-4 py-3 text-left">Applied</th>
                <th className="px-4 py-3 text-left">Recruiter</th>
                <th className="px-4 py-3 text-left">Notes</th>
                <th className="px-4 py-3 text-left">Link</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {apps.map(app => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{app.company}</td>
                  <td className="px-4 py-3 text-gray-700">{app.job_title}</td>
                  <td className="px-4 py-3">
                    <select
                      value={app.stage}
                      onChange={e => handleStageChange(app, e.target.value as Stage)}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${STAGE_COLORS[app.stage]}`}
                    >
                      {STAGES.map(s => (
                        <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {app.applied_at ? app.applied_at.slice(0, 10) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{app.recruiter_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={app.notes ?? ''}>
                    {app.notes ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {app.job_url ? (
                      <a
                        href={app.job_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:underline"
                      >
                        Link
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditing(app); setShowModal(true) }}
                        className="text-gray-400 hover:text-gray-700"
                        title="Edit"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(app.id)}
                        className="text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && profileId && (
        <ApplicationModal
          profileId={profileId}
          initial={editing ?? undefined}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
