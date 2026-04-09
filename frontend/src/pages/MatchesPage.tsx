import { useEffect, useRef, useState } from 'react'
import { jobsApi, profileApi, scanApi, type Profile, type ScanResult, type ScanResultPage } from '../api/client'

function ScoreBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-gray-500 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full bg-indigo-500"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
      <span className="w-8 text-right text-gray-600">{Math.round(value * 100)}%</span>
    </div>
  )
}

function ResultCard({ result, onStatusChange }: { result: ScanResult; onStatusChange: () => void }) {
  const [updating, setUpdating] = useState(false)

  const update = async (status: string) => {
    setUpdating(true)
    try {
      await jobsApi.updateStatus(result.id, status)
      onStatusChange()
    } finally {
      setUpdating(false)
    }
  }

  const scoreColor =
    result.score >= 0.7
      ? 'text-green-700 bg-green-50 border-green-200'
      : result.score >= 0.4
      ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
      : 'text-red-700 bg-red-50 border-red-200'

  const statusColors: Record<string, string> = {
    new: 'bg-gray-100 text-gray-700',
    saved: 'bg-blue-100 text-blue-700',
    applied: 'bg-indigo-100 text-indigo-700',
    archived: 'bg-gray-200 text-gray-500',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">{result.job.title}</h3>
            <span
              className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${scoreColor}`}
            >
              {Math.round(result.score * 100)}%
            </span>
          </div>
          <div className="text-sm text-gray-600 mb-2">
            {result.job.company && <span>{result.job.company}</span>}
            {result.job.location && <span className="ml-2 text-gray-400">· {result.job.location}</span>}
            <span className="ml-2 text-gray-400 capitalize">· {result.job.source}</span>
          </div>
          <div className="space-y-1">
            <ScoreBar value={result.score_breakdown.skill_score} label="Skills" />
            <ScoreBar value={result.score_breakdown.role_score} label="Role" />
            <ScoreBar value={result.score_breakdown.location_score} label="Location" />
            <ScoreBar value={result.score_breakdown.salary_score} label="Salary" />
          </div>
        </div>
        <div className="shrink-0 flex flex-col gap-2 items-end">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[result.status] ?? statusColors.new}`}>
            {result.status}
          </span>
          {result.job.url && (
            <a
              href={result.job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-600 hover:underline"
            >
              View →
            </a>
          )}
          <select
            disabled={updating}
            value={result.status}
            onChange={(e) => update(e.target.value)}
            className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white"
          >
            <option value="new">New</option>
            <option value="saved">Saved</option>
            <option value="applied">Applied</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>
    </div>
  )
}

interface LogEntry {
  message: string
  startedAt: number
  endedAt: number | null
}

const ALL_SOURCES = [
  { id: 'greenhouse', label: 'Greenhouse' },
  { id: 'lever', label: 'Lever' },
  { id: 'google_jobs', label: 'Google Jobs' },
  { id: 'linkedin', label: 'LinkedIn' },
]

// Returns an array of page numbers and '…' strings for the pagination bar.
// e.g. [1, '…', 5, 6, 7, 8, 9, '…', 20]
function pageItems(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const delta = 2
  const left = Math.max(2, current - delta)
  const right = Math.min(total - 1, current + delta)
  const items: (number | '…')[] = [1]
  if (left > 2) items.push('…')
  for (let i = left; i <= right; i++) items.push(i)
  if (right < total - 1) items.push('…')
  items.push(total)
  return items
}

const TIMED_PREFIXES = ['Scraping ', 'Saving ', 'Scoring ']

function isTimed(msg: string) {
  return TIMED_PREFIXES.some(p => msg.startsWith(p))
}

export function MatchesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [resultPage, setResultPage] = useState<ScanResultPage | null>(null)
  const [page, setPage] = useState(1)
  const [scanning, setScanning] = useState(false)
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set(ALL_SOURCES.map(s => s.id)))
  const [optionsOpen, setOptionsOpen] = useState(false)
  const optionsRef = useRef<HTMLDivElement | null>(null)
  const [scanStatus, setScanStatus] = useState<string | null>(null)
  const [progressLog, setProgressLog] = useState<LogEntry[]>([])
  const [tick, setTick] = useState(0)
  const [logExpanded, setLogExpanded] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const logContainerRef = useRef<HTMLDivElement | null>(null)
  const seenMessages = useRef<Set<string>>(new Set())

  const currentProfile = profiles[0]

  useEffect(() => {
    profileApi.list().then(setProfiles)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  // Drive live timers while scanning
  useEffect(() => {
    if (!scanning) return
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [scanning])

  const loadResults = async (profileId: number, p = page) => {
    const r = await jobsApi.results(profileId, p)
    setResultPage(r)
  }

  useEffect(() => {
    if (currentProfile) loadResults(currentProfile.id, page)
  }, [currentProfile?.id, page])

  useEffect(() => {
    if (logExpanded && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [progressLog, logExpanded])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setOptionsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const appendLog = (msg: string) => {
    if (seenMessages.current.has(msg)) return
    seenMessages.current.add(msg)
    const now = Date.now()
    setProgressLog(prev => {
      // Finalize the previous entry if it's still running
      const finalized = prev.length > 0 && prev[prev.length - 1].endedAt === null
        ? [...prev.slice(0, -1), { ...prev[prev.length - 1], endedAt: now }]
        : [...prev]
      return [...finalized, { message: msg, startedAt: now, endedAt: null }]
    })
  }

  const startScan = async () => {
    if (!currentProfile) return
    setScanning(true)
    setLogExpanded(true)
    setProgressLog([])
    seenMessages.current = new Set()
    setScanStatus(null)
    appendLog('Starting scan…')
    try {
      const sources = selectedSources.size === ALL_SOURCES.length ? undefined : [...selectedSources]
      const { scan_id } = await scanApi.trigger(currentProfile.id, sources)
      pollRef.current = setInterval(async () => {
        const state = await scanApi.status(scan_id)
        if (state.message) appendLog(state.message)
        if (state.status === 'complete') {
          clearInterval(pollRef.current!)
          setScanStatus(state.message ?? `Done — ${state.jobs_found ?? 0} jobs found`)
          setScanning(false)
          setLogExpanded(false)
          setPage(1)
          await loadResults(currentProfile.id, 1)
        } else if (state.status === 'error') {
          clearInterval(pollRef.current!)
          const errMsg = state.error ?? 'Scan failed. Check the server logs.'
          appendLog(errMsg)
          setScanStatus(errMsg)
          setScanning(false)
        }
      }, 2000)
    } catch {
      appendLog('Failed to start scan.')
      setScanStatus('Failed to start scan.')
      setScanning(false)
    }
  }

  const totalPages = resultPage ? Math.ceil(resultPage.total / resultPage.page_size) : 0
  const btnBase = 'min-w-[2rem] px-2 py-1 rounded border text-sm transition-colors'
  const btnIdle = `${btnBase} border-gray-200 hover:bg-gray-50 disabled:opacity-30`
  const btnActive = `${btnBase} border-indigo-200 bg-indigo-50 text-indigo-700 font-semibold`

  if (!currentProfile) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center text-gray-500">
        No profile found. <a href="/profile" className="text-indigo-600 underline">Create one first.</a>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Matches</h1>
          <p className="mt-1 text-xs text-gray-400">
            Scanning as: <span className="text-gray-600">{currentProfile.location || <span className="italic">no location saved</span>}</span>
            {currentProfile.target_roles?.length > 0 && (
              <> · {currentProfile.target_roles.join(', ')}</>
            )}
            {' · '}<a href="/profile" className="text-indigo-500 hover:underline">edit profile</a>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {scanStatus && <span className="text-sm text-gray-500">{scanStatus}</span>}
          {/* Split button: Run Scan + options chevron */}
          <div ref={optionsRef} className="relative flex">
            <button
              onClick={startScan}
              disabled={scanning || selectedSources.size === 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded-l-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {scanning ? 'Scanning…' : 'Run Scan'}
            </button>
            <button
              onClick={() => setOptionsOpen(v => !v)}
              disabled={scanning}
              aria-label="Scan options"
              className="px-2 py-2 bg-indigo-600 text-white rounded-r-md border-l border-indigo-500 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <svg className={`w-3.5 h-3.5 transition-transform ${optionsOpen ? 'rotate-180' : ''}`} viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1 1l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {optionsOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-2">
                <p className="px-3 pb-1.5 pt-0.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Sources</p>
                {ALL_SOURCES.map(({ id, label }) => (
                  <label key={id} className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedSources.has(id)}
                      onChange={() => {
                        setSelectedSources(prev => {
                          const next = new Set(prev)
                          next.has(id) ? next.delete(id) : next.add(id)
                          return next
                        })
                      }}
                      className="accent-indigo-600"
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {progressLog.length > 0 && (
        <div className="mb-6 border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setLogExpanded(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <span>Scan log</span>
            <span className="text-gray-400 text-xs">{logExpanded ? '▲ collapse' : '▼ expand'}</span>
          </button>
          {logExpanded && (
            <div ref={logContainerRef} className="px-4 py-3 bg-white font-mono text-xs text-gray-600 space-y-1 max-h-48 overflow-y-auto">
              {progressLog.map((entry, i) => {
                const elapsed = isTimed(entry.message)
                  ? Math.floor(((entry.endedAt ?? Date.now()) - entry.startedAt) / 1000)
                  : null
                // tick is read here so React re-renders this row every second while active
                void tick
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-gray-300 select-none">{String(i + 1).padStart(2, '0')}</span>
                    <span className="flex-1">{entry.message}</span>
                    {elapsed !== null && (
                      <span className={entry.endedAt ? 'text-gray-400' : 'text-indigo-400'}>
                        {elapsed}s
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {!resultPage || resultPage.total === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No results yet. Run a scan to find matching jobs.
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {resultPage.items.map((r) => (
              <ResultCard
                key={r.id}
                result={r}
                onStatusChange={() => loadResults(currentProfile.id)}
              />
            ))}
          </div>

          {resultPage.total > resultPage.page_size && (
            <div className="flex items-center justify-between mt-6 text-sm text-gray-600">
              <span className="tabular-nums">
                {((page - 1) * resultPage.page_size) + 1}–{Math.min(page * resultPage.page_size, resultPage.total)} of {resultPage.total.toLocaleString()}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className={btnIdle}>‹</button>
                {pageItems(page, totalPages).map((item, i) =>
                  item === '…'
                    ? <span key={`ellipsis-${i}`} className="px-1 text-gray-400 select-none">…</span>
                    : <button key={item} onClick={() => setPage(item)} className={item === page ? btnActive : btnIdle}>{item}</button>
                )}
                <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className={btnIdle}>›</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
