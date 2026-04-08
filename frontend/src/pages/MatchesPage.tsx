import { useEffect, useRef, useState } from 'react'
import { jobsApi, profileApi, scanApi, type Profile, type ScanResult } from '../api/client'

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

export function MatchesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [results, setResults] = useState<ScanResult[]>([])
  const [scanning, setScanning] = useState(false)
  const [scanStatus, setScanStatus] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentProfile = profiles[0]

  useEffect(() => {
    profileApi.list().then(setProfiles)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const loadResults = async (profileId: number) => {
    const r = await jobsApi.results(profileId)
    setResults(r)
  }

  useEffect(() => {
    if (currentProfile) loadResults(currentProfile.id)
  }, [currentProfile?.id])

  const startScan = async () => {
    if (!currentProfile) return
    setScanning(true)
    setScanStatus('Starting scan…')
    try {
      const { scan_id } = await scanApi.trigger(currentProfile.id)
      pollRef.current = setInterval(async () => {
        const state = await scanApi.status(scan_id)
        if (state.status === 'complete') {
          clearInterval(pollRef.current!)
          setScanStatus(`Done — ${state.jobs_found ?? 0} jobs found`)
          setScanning(false)
          await loadResults(currentProfile.id)
        } else if (state.status === 'error') {
          clearInterval(pollRef.current!)
          setScanStatus('Scan failed. Check the server logs.')
          setScanning(false)
        } else {
          setScanStatus('Scanning job boards…')
        }
      }, 2000)
    } catch {
      setScanStatus('Failed to start scan.')
      setScanning(false)
    }
  }

  if (!currentProfile) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center text-gray-500">
        No profile found. <a href="/profile" className="text-indigo-600 underline">Create one first.</a>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Matches</h1>
        <div className="flex items-center gap-3">
          {scanStatus && <span className="text-sm text-gray-500">{scanStatus}</span>}
          <button
            onClick={startScan}
            disabled={scanning}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {scanning ? 'Scanning…' : 'Run Scan'}
          </button>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No results yet. Run a scan to find matching jobs.
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((r) => (
            <ResultCard
              key={r.id}
              result={r}
              onStatusChange={() => loadResults(currentProfile.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
