import { useEffect, useState } from 'react'
import type {
  ResumeData,
  ResumeEducation,
  ResumeWorkExperience,
} from '../api/client'
import { resumeBuilderApi } from '../api/client'

const emptyJob = (): ResumeWorkExperience => ({
  company: '',
  title: '',
  start_date: '',
  end_date: '',
  location: '',
  bullets: [''],
})

const emptyEdu = (): ResumeEducation => ({
  institution: '',
  degree: '',
  field: '',
  graduation_year: '',
  gpa: '',
})

const STORAGE_KEY = 'resume_builder_draft'

function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function ResumeToolsPage() {
  const draft = loadDraft()

  const [contact, setContact] = useState<ResumeData['contact']>(
    draft?.contact ?? {
      name: '',
      email: '',
      phone: '',
      location: '',
      linkedin_url: '',
      website_url: '',
    },
  )
  const [summary, setSummary] = useState<string>(draft?.summary ?? '')
  const [jobs, setJobs] = useState<ResumeWorkExperience[]>(draft?.jobs ?? [emptyJob()])
  const [education, setEducation] = useState<ResumeEducation[]>(draft?.education ?? [emptyEdu()])
  const [skills, setSkills] = useState<string>(draft?.skills ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ contact, summary, jobs, education, skills }))
  }, [contact, summary, jobs, education, skills])

  // --- Contact helpers ---
  const updateContact = (field: keyof ResumeData['contact'], value: string) =>
    setContact(prev => ({ ...prev, [field]: value }))

  // --- Job helpers ---
  const updateJob = (idx: number, field: keyof ResumeWorkExperience, value: string) =>
    setJobs(prev => prev.map((j, i) => (i === idx ? { ...j, [field]: value } : j)))

  const updateBullet = (jobIdx: number, bulletIdx: number, value: string) =>
    setJobs(prev =>
      prev.map((j, i) =>
        i === jobIdx
          ? { ...j, bullets: j.bullets.map((b, bi) => (bi === bulletIdx ? value : b)) }
          : j,
      ),
    )

  const addBullet = (jobIdx: number) =>
    setJobs(prev =>
      prev.map((j, i) => (i === jobIdx ? { ...j, bullets: [...j.bullets, ''] } : j)),
    )

  const removeBullet = (jobIdx: number, bulletIdx: number) =>
    setJobs(prev =>
      prev.map((j, i) =>
        i === jobIdx
          ? { ...j, bullets: j.bullets.filter((_, bi) => bi !== bulletIdx) }
          : j,
      ),
    )

  const addJob = () => setJobs(prev => [...prev, emptyJob()])

  const removeJob = (idx: number) => setJobs(prev => prev.filter((_, i) => i !== idx))

  const moveJob = (idx: number, dir: -1 | 1) => {
    const next = idx + dir
    if (next < 0 || next >= jobs.length) return
    setJobs(prev => {
      const arr = [...prev]
      ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
      return arr
    })
  }

  // --- Education helpers ---
  const updateEdu = (idx: number, field: keyof ResumeEducation, value: string) =>
    setEducation(prev => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)))

  const addEdu = () => setEducation(prev => [...prev, emptyEdu()])

  const removeEdu = (idx: number) => setEducation(prev => prev.filter((_, i) => i !== idx))

  // --- Generate ---
  const handleGenerate = async () => {
    if (!contact.name.trim()) {
      setError('Name is required')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const payload: ResumeData = {
        contact,
        summary: summary.trim() || undefined,
        work_experience: jobs
          .filter(j => j.company.trim() || j.title.trim())
          .map(j => ({ ...j, bullets: j.bullets.filter(b => b.trim()) })),
        education: education.filter(e => e.institution.trim()),
        skills: skills
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
      }
      const blob = await resumeBuilderApi.generate(payload)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${contact.name.replace(/\s+/g, '_')}_resume.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError('Failed to generate resume. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Resume Builder</h1>

      {/* Contact Info */}
      <Section title="Contact Information">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full Name *">
            <input
              className={inputCls}
              value={contact.name}
              onChange={e => updateContact('name', e.target.value)}
              placeholder="Jane Doe"
            />
          </Field>
          <Field label="Email">
            <input
              className={inputCls}
              type="email"
              value={contact.email}
              onChange={e => updateContact('email', e.target.value)}
              placeholder="jane@example.com"
            />
          </Field>
          <Field label="Phone">
            <input
              className={inputCls}
              value={contact.phone}
              onChange={e => updateContact('phone', e.target.value)}
              placeholder="(555) 123-4567"
            />
          </Field>
          <Field label="Location">
            <input
              className={inputCls}
              value={contact.location}
              onChange={e => updateContact('location', e.target.value)}
              placeholder="San Francisco, CA"
            />
          </Field>
          <Field label="LinkedIn URL">
            <input
              className={inputCls}
              value={contact.linkedin_url}
              onChange={e => updateContact('linkedin_url', e.target.value)}
              placeholder="linkedin.com/in/janedoe"
            />
          </Field>
          <Field label="Website">
            <input
              className={inputCls}
              value={contact.website_url}
              onChange={e => updateContact('website_url', e.target.value)}
              placeholder="janedoe.com"
            />
          </Field>
        </div>
      </Section>

      {/* Summary */}
      <Section title="Summary (optional)">
        <textarea
          className={`${inputCls} h-20 resize-none`}
          value={summary}
          onChange={e => setSummary(e.target.value)}
          placeholder="Brief professional summary…"
        />
      </Section>

      {/* Work Experience */}
      <Section title="Work Experience">
        <div className="space-y-6">
          {jobs.map((job, jobIdx) => (
            <div key={jobIdx} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Position {jobIdx + 1}</span>
                <div className="flex items-center gap-1">
                  <IconBtn
                    title="Move up"
                    disabled={jobIdx === 0}
                    onClick={() => moveJob(jobIdx, -1)}
                  >
                    ↑
                  </IconBtn>
                  <IconBtn
                    title="Move down"
                    disabled={jobIdx === jobs.length - 1}
                    onClick={() => moveJob(jobIdx, 1)}
                  >
                    ↓
                  </IconBtn>
                  {jobs.length > 1 && (
                    <IconBtn title="Remove position" onClick={() => removeJob(jobIdx)} danger>
                      ✕
                    </IconBtn>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Job Title">
                  <input
                    className={inputCls}
                    value={job.title}
                    onChange={e => updateJob(jobIdx, 'title', e.target.value)}
                    placeholder="Software Engineer"
                  />
                </Field>
                <Field label="Company">
                  <input
                    className={inputCls}
                    value={job.company}
                    onChange={e => updateJob(jobIdx, 'company', e.target.value)}
                    placeholder="Acme Corp"
                  />
                </Field>
                <Field label="Start Date">
                  <input
                    className={inputCls}
                    value={job.start_date}
                    onChange={e => updateJob(jobIdx, 'start_date', e.target.value)}
                    placeholder="Jan 2022"
                  />
                </Field>
                <Field label="End Date">
                  <input
                    className={inputCls}
                    value={job.end_date}
                    onChange={e => updateJob(jobIdx, 'end_date', e.target.value)}
                    placeholder="Present"
                  />
                </Field>
                <Field label="Location" className="col-span-2">
                  <input
                    className={inputCls}
                    value={job.location}
                    onChange={e => updateJob(jobIdx, 'location', e.target.value)}
                    placeholder="San Francisco, CA (Remote)"
                  />
                </Field>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Bullet Points
                </label>
                {job.bullets.map((bullet, bulletIdx) => (
                  <div key={bulletIdx} className="flex gap-2 items-start">
                    <span className="mt-2 text-gray-400 text-sm select-none">•</span>
                    <textarea
                      className={`${inputCls} flex-1 resize-none h-14`}
                      value={bullet}
                      onChange={e => updateBullet(jobIdx, bulletIdx, e.target.value)}
                      placeholder="Describe an achievement or responsibility…"
                    />
                    {job.bullets.length > 1 && (
                      <button
                        onClick={() => removeBullet(jobIdx, bulletIdx)}
                        className="mt-2 text-gray-400 hover:text-red-500 text-sm"
                        title="Remove bullet"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => addBullet(jobIdx)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  + Add bullet
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={addJob}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
          >
            + Add position
          </button>
        </div>
      </Section>

      {/* Education */}
      <Section title="Education">
        <div className="space-y-4">
          {education.map((edu, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700">Entry {idx + 1}</span>
                {education.length > 1 && (
                  <IconBtn onClick={() => removeEdu(idx)} danger title="Remove">
                    ✕
                  </IconBtn>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Institution" className="col-span-2">
                  <input
                    className={inputCls}
                    value={edu.institution}
                    onChange={e => updateEdu(idx, 'institution', e.target.value)}
                    placeholder="University of California, Berkeley"
                  />
                </Field>
                <Field label="Degree">
                  <input
                    className={inputCls}
                    value={edu.degree}
                    onChange={e => updateEdu(idx, 'degree', e.target.value)}
                    placeholder="B.S."
                  />
                </Field>
                <Field label="Field of Study">
                  <input
                    className={inputCls}
                    value={edu.field}
                    onChange={e => updateEdu(idx, 'field', e.target.value)}
                    placeholder="Computer Science"
                  />
                </Field>
                <Field label="Graduation Year">
                  <input
                    className={inputCls}
                    value={edu.graduation_year}
                    onChange={e => updateEdu(idx, 'graduation_year', e.target.value)}
                    placeholder="2020"
                  />
                </Field>
                <Field label="GPA (optional)">
                  <input
                    className={inputCls}
                    value={edu.gpa}
                    onChange={e => updateEdu(idx, 'gpa', e.target.value)}
                    placeholder="3.8"
                  />
                </Field>
              </div>
            </div>
          ))}
          <button
            onClick={addEdu}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
          >
            + Add education
          </button>
        </div>
      </Section>

      {/* Skills */}
      <Section title="Skills">
        <Field label="Comma-separated list">
          <input
            className={inputCls}
            value={skills}
            onChange={e => setSkills(e.target.value)}
            placeholder="TypeScript, React, Python, PostgreSQL, Docker…"
          />
        </Field>
      </Section>

      {/* Generate */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Generating…' : 'Download Resume PDF'}
      </button>
    </div>
  )
}

// --- Small shared components ---

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-5 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

function IconBtn({
  children,
  onClick,
  disabled,
  danger,
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-7 h-7 rounded text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed
        ${danger ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
    >
      {children}
    </button>
  )
}

const inputCls =
  'w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white'
