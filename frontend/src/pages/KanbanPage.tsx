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
              <span className="text-xs text-gray-400 bg-white rounded-full px-2 py-0.5 border">
                {byStatus(col.key).length}
              </span>
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
