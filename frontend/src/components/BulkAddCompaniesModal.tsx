import { useEffect, useMemo, useRef, useState } from 'react'
import { companiesApi, type CompanyInfo } from '../api/client'

interface Props {
  existing: string[]
  onConfirm: (companies: string[]) => void
  onClose: () => void
}

export function BulkAddCompaniesModal({ existing, onConfirm, onClose }: Props) {
  const [companies, setCompanies] = useState<CompanyInfo[]>([])
  const [search, setSearch] = useState('')
  const [checked, setChecked] = useState<Set<string>>(new Set(existing))
  const [pasteText, setPasteText] = useState('')
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    companiesApi.list().then(setCompanies)
  }, [])

  // Once the registry loads, move manually-typed companies (those in `existing`
  // but not in the known registry) into the paste textarea so the user can see
  // and edit them. Remove them from `checked` to avoid double-counting.
  useEffect(() => {
    if (companies.length === 0) return
    const knownNames = new Set(companies.map(c => c.name))
    const manual = existing.filter(name => !knownNames.has(name))
    if (manual.length > 0) {
      setPasteText(manual.join('\n'))
      setChecked(prev => {
        const next = new Set(prev)
        manual.forEach(name => next.delete(name))
        return next
      })
    }
  }, [companies]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Group companies by category, preserving registry order within each group
  const categorized = useMemo(() => {
    const q = search.trim().toLowerCase()
    const result: Record<string, CompanyInfo[]> = {}
    for (const company of companies) {
      if (q && !company.name.toLowerCase().includes(q)) continue
      const cat = company.category ?? 'Other'
      if (!result[cat]) result[cat] = []
      result[cat].push(company)
    }
    return result
  }, [companies, search])

  const toggle = (name: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const toggleCategory = (names: string[]) => {
    const allOn = names.every(n => checked.has(n))
    setChecked(prev => {
      const next = new Set(prev)
      if (allOn) names.forEach(n => next.delete(n))
      else names.forEach(n => next.add(n))
      return next
    })
  }

  const handleConfirm = () => {
    const fromPaste = pasteText
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean)
    const merged = Array.from(new Set([...Array.from(checked), ...fromPaste]))
    onConfirm(merged)
  }

  const pasteNames = pasteText.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
  const selectedCount = checked.size + pasteNames.length

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Bulk Add Target Companies</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Search */}
          <input
            type="text"
            autoFocus
            placeholder="Search companies..."
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {/* Categorized list */}
          <div className="space-y-4">
            {Object.entries(categorized).map(([category, entries]) => {
              const names = entries.map(e => e.name)
              const allOn = names.every(n => checked.has(n))
              const someOn = names.some(n => checked.has(n))
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <button
                      type="button"
                      onClick={() => toggleCategory(names)}
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                        allOn ? 'bg-indigo-600 border-indigo-600' : someOn ? 'bg-indigo-200 border-indigo-400' : 'border-gray-300 hover:border-indigo-400'
                      }`}
                    >
                      {(allOn || someOn) && (
                        <span className="text-white text-xs leading-none">{allOn ? '✓' : '–'}</span>
                      )}
                    </button>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{category}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-6">
                    {entries.map(({ name, has_scraper }) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => toggle(name)}
                        title={has_scraper ? 'Direct scraper available' : undefined}
                        className={`px-2.5 py-1 rounded-full text-sm border transition-colors ${
                          checked.has(name)
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:text-indigo-700'
                        }`}
                      >
                        {name}{has_scraper && <span className={`ml-1 text-xs ${checked.has(name) ? 'text-indigo-200' : 'text-indigo-400'}`}>·</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
            {Object.keys(categorized).length === 0 && (
              <p className="text-sm text-gray-400">No companies match "{search}"</p>
            )}
          </div>

          {/* Paste area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paste / type additional companies
              <span className="ml-1 text-gray-400 font-normal">(one per line or comma-separated)</span>
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              rows={4}
              placeholder={"Stripe\nVercel\nLinear, Notion"}
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <span className="text-sm text-gray-500">
            {selectedCount} {selectedCount === 1 ? 'company' : 'companies'} selected
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-2 rounded-md text-sm bg-indigo-600 text-white font-medium hover:bg-indigo-700"
            >
              Add to Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
