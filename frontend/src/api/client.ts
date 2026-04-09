import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export interface Profile {
  id: number
  full_name: string
  email: string | null
  location: string | null
  remote_ok: boolean
  skills: string[]
  experience_years: number | null
  experience_notes: string | null
  target_roles: string[]
  target_companies: string[]
  salary_min: number | null
  salary_max: number | null
  created_at: string
  updated_at: string
}

export interface ProfileCreate {
  full_name: string
  email?: string
  location?: string
  remote_ok?: boolean
  skills?: string[]
  experience_years?: number
  experience_notes?: string
  target_roles?: string[]
  target_companies?: string[]
  salary_min?: number
  salary_max?: number
}

export interface CredentialCreate {
  profile_id: number
  service: string
  username?: string
  password?: string
}

export interface CredentialInfo {
  id: number
  service: string
  profile_id: number
  has_credentials: boolean
  updated_at: string
}

export interface Job {
  id: number
  source: string
  title: string
  company: string | null
  location: string | null
  remote_flag: boolean | null
  url: string | null
  description: string | null
  salary_min: number | null
  salary_max: number | null
  discovered_at: string
}

export interface ScanResult {
  id: number
  profile_id: number
  job_id: number
  score: number
  score_breakdown: {
    skill_score: number
    role_score: number
    location_score: number
    salary_score: number
  }
  status: string
  scanned_at: string
  job: Job
}

export interface ScanResponse {
  scan_id: string
  status: string
  message: string
}

export const profileApi = {
  list: () => api.get<Profile[]>('/profile').then(r => r.data),
  create: (data: ProfileCreate) => api.post<Profile>('/profile', data).then(r => r.data),
  update: (id: number, data: Partial<ProfileCreate>) =>
    api.patch<Profile>(`/profile/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/profile/${id}`),
}

export const credentialsApi = {
  list: (profileId: number) =>
    api.get<CredentialInfo[]>('/credentials', { params: { profile_id: profileId } }).then(r => r.data),
  store: (data: CredentialCreate) =>
    api.post<CredentialInfo>('/credentials', data).then(r => r.data),
  delete: (service: string, profileId: number) =>
    api.delete(`/credentials/${service}`, { params: { profile_id: profileId } }),
}

export const scanApi = {
  trigger: (profileId: number, sources?: string[]) =>
    api.post<ScanResponse>('/scan', { profile_id: profileId, sources: sources ?? null }).then(r => r.data),
  status: (scanId: string) =>
    api.get<{ scan_id: string; status: string; message?: string; error?: string; jobs_found?: number }>(`/scan/${scanId}`).then(r => r.data),
  cancel: (scanId: string) =>
    api.delete(`/scan/${scanId}`),
}

export interface ScanResultPage {
  items: ScanResult[]
  total: number
  page: number
  page_size: number
}

export const jobsApi = {
  results: (profileId: number, page = 1, status?: string) =>
    api.get<ScanResultPage>('/results', { params: { profile_id: profileId, page, status } }).then(r => r.data),
  pendingResults: (profileId: number) =>
    api.get<ScanResultPage>('/results/pending', { params: { profile_id: profileId } }).then(r => r.data),
  commitResults: (profileId: number) =>
    api.post('/results/commit', { profile_id: profileId }),
  discardResults: (profileId: number) =>
    api.post('/results/discard', { profile_id: profileId }),
  updateStatus: (resultId: number, status: string) =>
    api.patch<ScanResult>(`/results/${resultId}`, { status }).then(r => r.data),
  deleteResult: (resultId: number) =>
    api.delete(`/results/${resultId}`),
  bulkDelete: (ids: number[]) =>
    api.post('/results/bulk-delete', { ids }),
}
