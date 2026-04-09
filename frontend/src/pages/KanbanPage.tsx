import { useEffect, useState } from 'react'
import { jobsApi, profileApi, type ScanResult } from '../api/client'

const COLUMNS = [
  { key: 'new', label: 'New Matches', color: 'bg-gray-50 border-gray-200' },
  { key: 'saved', label: 'Saved', color: 'bg-blue-50 border-blue-200' },
  { key: 'applied', label: 'Applied', color: 'bg-indigo-50 border-indigo-200' },
  { key: 'archived', label: 'Archived', color: 'bg-gray-100 border-gray-300' },
]

export function KanbanPage() {
  const [results, setResults] = useState<ScanResult[]>([])
  const [profileId, setProfileId] = useState<number | null>(null)

  useEffect(() => {
    profileApi.list().then((ps) => {
      if (ps.length > 0) {
        setProfileId(ps[0].id)
        jobsApi.results(ps[0].id).then((page) => setResults(page.items))
      }
    })
  }, [])

  const move = async (resultId: number, status: string) => {
    if (!profileId) return
    await jobsApi.updateStatus(resultId, status)
    setResults((prev) =>
      prev.map((r) => (r.id === resultId ? { ...r, status } : r))
    )
  }

  const remove = async (resultId: number) => {
    await jobsApi.deleteResult(resultId)
    setResults((prev) => prev.filter((r) => r.id !== resultId))
  }

  const clearColumn = async (status: string) => {
    const ids = results.filter(r => r.status === status).map(r => r.id)
    if (ids.length === 0) return
    await jobsApi.bulkDelete(ids)
    setResults((prev) => prev.filter((r) => r.status !== status))
  }

  const byStatus = (status: string) => results.filter((r) => r.status === status)

  return (
    <div className="py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Application Board</h1>
      <div className="grid grid-cols-4 gap-4 min-h-96">
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            className={`rounded-xl border p-4 ${col.color}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = Number(e.dataTransfer.getData('result_id'))
              if (id) move(id, col.key)
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">{col.label}</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 bg-white rounded-full px-2 py-0.5 border">
                  {byStatus(col.key).length}
                </span>
                {byStatus(col.key).length > 0 && (
                  <button
                    onClick={() => clearColumn(col.key)}
                    title="Clear column"
                    className="text-xs text-gray-400 hover:text-red-400 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {byStatus(col.key).map((r) => (
                <div
                  key={r.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('result_id', String(r.id))}
                  className="bg-white rounded-lg border border-gray-200 p-3 cursor-grab hover:shadow-sm transition-shadow"
                >
                  <p className="text-sm font-medium text-gray-900 leading-tight">{r.job.title}</p>
                  {r.job.company && (
                    <p className="text-xs text-gray-500 mt-0.5">{r.job.company}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-indigo-600 font-semibold">
                      {Math.round(r.score * 100)}% match
                    </span>
                    <div className="flex items-center gap-2">
                      {r.job.url && (
                        <a
                          href={r.job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-400 hover:text-indigo-600"
                          onClick={(e) => e.stopPropagation()}
                        >
                          →
                        </a>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); remove(r.id) }}
                        title="Delete match"
                        className="text-gray-300 hover:text-red-400 transition-colors"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M6 2a1 1 0 0 0-1 1H3a1 1 0 0 0 0 2h10a1 1 0 0 0 0-2h-2a1 1 0 0 0-1-1H6zM4 7a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V8a1 1 0 1 1 2 0v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a1 1 0 0 1 1-1z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
