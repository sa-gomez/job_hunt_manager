import { useEffect, useRef, useState } from 'react'
import { jobsApi, profileApi, scanApi, type Profile, type ScanResult, type ScanResultPage } from '../api/client'

function SourceIcon({ source }: { source: string }) {
  switch (source) {
    case 'linkedin':
      return (
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="#0A66C2" aria-label="LinkedIn">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      )
    case 'google_jobs':
      return (
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" aria-label="Google Jobs">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      )
    case 'greenhouse':
      return (
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="#24B35A" aria-label="Greenhouse">
          <path d="M17 8C8 10 5.9 16.17 3.82 22H5.71C6.77 19.13 8 16.5 10 14c2.31 2.49 3.78 5.72 3.94 9H16c-.06-3.42-1.44-6.78-4-9.22C14.61 12.48 16.5 11 21 10c0 0-1.67-4-4-2z" />
        </svg>
      )
    case 'lever':
      return (
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" aria-label="Lever">
          <rect x="2" y="2" width="20" height="20" rx="4" fill="#344563" />
          <path d="M8 7h2v10H8V7zm2 8h5v2h-5v-2z" fill="white" />
        </svg>
      )
    default:
      return null
  }
}

function ScoreBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-12 text-gray-500 truncate">{label}</span>
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

function ResultCard({ result, onStatusChange, onDelete, selected, onSelect }: {
  result: ScanResult
  onStatusChange: () => void
  onDelete?: () => void
  selected?: boolean
  onSelect?: (id: number) => void
}) {
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

  const remove = async () => {
    setUpdating(true)
    try {
      await jobsApi.deleteResult(result.id)
      onDelete?.()
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
    <div className={`bg-white rounded-xl border p-5 hover:shadow-sm transition-shadow ${selected ? 'border-indigo-300 bg-indigo-50/30' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-4">
        {onSelect && (
          <input
            type="checkbox"
            checked={selected ?? false}
            onChange={() => onSelect(result.id)}
            className="mt-1 shrink-0 accent-indigo-600 cursor-pointer"
          />
        )}
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
            <span className="ml-2 inline-flex items-center gap-1 text-gray-400">
              · <SourceIcon source={result.job.source} />
              <span className="capitalize">{result.job.source.replace('_', ' ')}</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <ScoreBar value={result.score_breakdown.skill_score} label="Skills" />
            <ScoreBar value={result.score_breakdown.location_score} label="Location" />
            <ScoreBar value={result.score_breakdown.role_score} label="Role" />
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
          {onDelete && (
            <button
              disabled={updating}
              onClick={remove}
              title="Delete match"
              className="text-gray-300 hover:text-red-400 disabled:opacity-30 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6 2a1 1 0 0 0-1 1H3a1 1 0 0 0 0 2h10a1 1 0 0 0 0-2h-2a1 1 0 0 0-1-1H6zM4 7a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V8a1 1 0 1 1 2 0v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a1 1 0 0 1 1-1z"/>
              </svg>
            </button>
          )}

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
  const [pendingPage, setPendingPage] = useState<ScanResultPage | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [page, setPage] = useState(1)
  const [scanning, setScanning] = useState(false)
  const [activeScanId, setActiveScanId] = useState<string | null>(null)
  const [selectedSources, setSelectedSources] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('scan_sources')
      if (saved) {
        const parsed = JSON.parse(saved) as string[]
        const valid = parsed.filter(id => ALL_SOURCES.some(s => s.id === id))
        if (valid.length > 0) return new Set(valid)
      }
    } catch {}
    return new Set(ALL_SOURCES.map(s => s.id))
  })
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
    setSelectedIds(new Set())
  }

  const keepAll = async () => {
    if (!currentProfile) return
    await jobsApi.commitResults(currentProfile.id)
    setPendingPage(null)
    setPage(1)
    await loadResults(currentProfile.id, 1)
  }

  const discardAll = async () => {
    if (!currentProfile) return
    await jobsApi.discardResults(currentProfile.id)
    setPendingPage(null)
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (!resultPage) return
    const allIds = resultPage.items.map(r => r.id)
    const allSelected = allIds.every(id => selectedIds.has(id))
    setSelectedIds(allSelected ? new Set() : new Set(allIds))
  }

  const deleteSelected = async () => {
    if (!currentProfile || selectedIds.size === 0) return
    await jobsApi.bulkDelete([...selectedIds])
    await loadResults(currentProfile.id, page)
  }

  const deleteAll = async () => {
    if (!currentProfile) return
    if (!confirm(`Delete all ${resultPage?.total ?? ''} matches? This cannot be undone.`)) return
    await jobsApi.deleteAll(currentProfile.id)
    setPage(1)
    await loadResults(currentProfile.id, 1)
  }

  useEffect(() => {
    if (!currentProfile) return
    loadResults(currentProfile.id, page)
    jobsApi.pendingResults(currentProfile.id).then(p => {
      if (p.total > 0) setPendingPage(p)
    })
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
      setActiveScanId(scan_id)
      pollRef.current = setInterval(async () => {
        const state = await scanApi.status(scan_id)
        if (state.message) appendLog(state.message)
        if (state.status === 'complete' || state.status === 'cancelled') {
          clearInterval(pollRef.current!)
          setActiveScanId(null)
          setScanStatus(state.message ?? `Done — ${state.jobs_found ?? 0} jobs found`)
          setScanning(false)
          setLogExpanded(false)
          const pending = await jobsApi.pendingResults(currentProfile.id)
          if (pending.total > 0) {
            setPendingPage(pending)
          } else {
            setPage(1)
            await loadResults(currentProfile.id, 1)
          }
        } else if (state.status === 'error') {
          clearInterval(pollRef.current!)
          setActiveScanId(null)
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
          {scanning && activeScanId && (
            <button
              onClick={() => { scanApi.cancel(activeScanId); appendLog('Stopping scan…') }}
              className="px-3 py-2 border border-red-300 text-red-600 rounded-md text-sm font-medium hover:bg-red-50 transition-colors"
            >
              Stop
            </button>
          )}
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
                          localStorage.setItem('scan_sources', JSON.stringify([...next]))
                          return next
                        })
                      }}
                      className="accent-indigo-600"
                    />
                    <SourceIcon source={id} />
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

      {pendingPage && (
        <div className="mb-6 border border-indigo-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-indigo-50">
            <span className="text-sm font-semibold text-indigo-800">
              {pendingPage.total} new {pendingPage.total === 1 ? 'match' : 'matches'} found — keep or discard?
            </span>
            <div className="flex gap-2">
              <button
                onClick={discardAll}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition-colors"
              >
                Discard All
              </button>
              <button
                onClick={keepAll}
                className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Keep All
              </button>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {pendingPage.items.map((r) => (
              <ResultCard key={r.id} result={r} onStatusChange={() => {}} />
            ))}
          </div>
        </div>
      )}

      {!resultPage || resultPage.total === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No results yet. Run a scan to find matching jobs.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-3">
            <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={resultPage.items.length > 0 && resultPage.items.every(r => selectedIds.has(r.id))}
                onChange={toggleSelectAll}
                className="accent-indigo-600"
              />
              Select all
            </label>
            {selectedIds.size > 0 && (
              <button
                onClick={deleteSelected}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Delete {selectedIds.size} selected
              </button>
            )}
            <button
              onClick={deleteAll}
              className="ml-auto text-sm text-red-400 hover:text-red-600 font-medium"
            >
              Delete all {resultPage?.total ?? ''}
            </button>
          </div>
          <div className="space-y-3">
            {resultPage.items.map((r) => (
              <ResultCard
                key={r.id}
                result={r}
                onStatusChange={() => loadResults(currentProfile.id)}
                onDelete={() => loadResults(currentProfile.id)}
                selected={selectedIds.has(r.id)}
                onSelect={toggleSelect}
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
