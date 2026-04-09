import { useEffect, useMemo, useRef, useState } from 'react'

const COMPANY_CATEGORIES: Record<string, string[]> = {
  'Big Tech': [
    'Adobe', 'Amazon', 'Apple', 'Cisco', 'Google', 'IBM', 'Intel', 'Meta',
    'Microsoft', 'Netflix', 'Oracle', 'Salesforce', 'SAP', 'ServiceNow',
    'VMware', 'Workday',
  ],
  'Fintech & Payments': [
    'Affirm', 'Block', 'Brex', 'Chime', 'Coinbase', 'Marqeta', 'PayPal',
    'Plaid', 'Robinhood', 'Stripe',
  ],
  'Cloud & Infrastructure': [
    'Akamai', 'Cloudflare', 'Databricks', 'Datadog', 'DigitalOcean', 'Elastic',
    'Fastly', 'HashiCorp', 'MongoDB', 'New Relic', 'PagerDuty', 'Snowflake',
    'Splunk', 'Supabase', 'Twilio', 'Vercel',
  ],
  'Security': [
    'Auth0 (Okta)', 'CrowdStrike', 'Okta', 'Palo Alto Networks', 'SentinelOne',
    'Wiz', 'Zscaler',
  ],
  'Developer Tools & Productivity': [
    'Airtable', 'Asana', 'Atlassian', 'Figma', 'GitHub', 'GitLab', 'Linear',
    'Notion', 'Slack', 'Zoom',
  ],
  'Consumer & Social': [
    'Airbnb', 'DoorDash', 'Dropbox', 'Instacart', 'Lyft', 'Pinterest',
    'Reddit', 'Shopify', 'Snap', 'Spotify', 'TikTok', 'Uber', 'X (Twitter)',
  ],
  'Enterprise Software': [
    'Box', 'Confluent', 'Coupa', 'Dynatrace', 'Freshworks', 'HubSpot',
    'Marketo', 'MuleSoft', 'Qualtrics', 'Zendesk',
  ],
  'AI & ML': [
    'Anthropic', 'Cohere', 'DeepMind', 'Hugging Face', 'Mistral AI', 'OpenAI',
    'Perplexity', 'Scale AI', 'Stability AI',
  ],
  'Hardware & Semiconductors': [
    'AMD', 'Arm', 'ASML', 'Broadcom', 'Marvell', 'NVIDIA', 'Qualcomm', 'Texas Instruments',
  ],
}

interface Props {
  existing: string[]
  onConfirm: (companies: string[]) => void
  onClose: () => void
}

export function BulkAddCompaniesModal({ existing, onConfirm, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [checked, setChecked] = useState<Set<string>>(new Set(existing))
  const [pasteText, setPasteText] = useState('')
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return COMPANY_CATEGORIES
    const q = search.toLowerCase()
    const result: Record<string, string[]> = {}
    for (const [cat, companies] of Object.entries(COMPANY_CATEGORIES)) {
      const matched = companies.filter(c => c.toLowerCase().includes(q))
      if (matched.length > 0) result[cat] = matched
    }
    return result
  }, [search])

  const toggle = (company: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(company)) next.delete(company)
      else next.add(company)
      return next
    })
  }

  const toggleCategory = (companies: string[]) => {
    const allOn = companies.every(c => checked.has(c))
    setChecked(prev => {
      const next = new Set(prev)
      if (allOn) companies.forEach(c => next.delete(c))
      else companies.forEach(c => next.add(c))
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

  const selectedCount = checked.size + pasteText.split(/[\n,]+/).map(s => s.trim()).filter(Boolean).length

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

          {/* Pre-populated list */}
          <div className="space-y-4">
            {Object.entries(filteredCategories).map(([category, companies]) => {
              const allOn = companies.every(c => checked.has(c))
              const someOn = companies.some(c => checked.has(c))
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <button
                      type="button"
                      onClick={() => toggleCategory(companies)}
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
                    {companies.map(company => (
                      <button
                        key={company}
                        type="button"
                        onClick={() => toggle(company)}
                        className={`px-2.5 py-1 rounded-full text-sm border transition-colors ${
                          checked.has(company)
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:text-indigo-700'
                        }`}
                      >
                        {company}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
            {Object.keys(filteredCategories).length === 0 && (
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
