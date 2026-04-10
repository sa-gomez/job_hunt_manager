import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { Navbar } from './components/layout/Navbar'
import { ApplicationsPage } from './pages/ApplicationsPage'
import { KanbanPage } from './pages/KanbanPage'
import { MatchesPage } from './pages/MatchesPage'
import { ProfilePage } from './pages/ProfilePage'
import { ResumeToolsPage } from './pages/ResumeToolsPage'

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/profile" replace />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/board" element={<KanbanPage />} />
          <Route path="/resume" element={<ResumeToolsPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
        </Routes>
      </div>
    </Router>
  )
}
