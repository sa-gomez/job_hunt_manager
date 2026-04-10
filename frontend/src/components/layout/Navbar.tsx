import { NavLink } from 'react-router-dom'

export function Navbar() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-indigo-600 text-white'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`

  return (
    <nav className="border-b border-gray-200 bg-white px-6 py-3 flex items-center gap-2">
      <span className="font-semibold text-gray-900 mr-4">Job Hunt Manager</span>
      <NavLink to="/profile" className={linkClass}>Profile</NavLink>
      <NavLink to="/matches" className={linkClass}>Matches</NavLink>
      <NavLink to="/board" className={linkClass}>Board</NavLink>
      <NavLink to="/resume" className={linkClass}>Resume</NavLink>
      <NavLink to="/applications" className={linkClass}>Applications</NavLink>
    </nav>
  )
}
