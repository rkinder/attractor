import React, { useState } from 'react'
import { Router, Outlet, Link, useNavigate, useParams } from 'react-router-dom'
import './App.css'
import PageLayout from './components/PageLayout'
import PipelineListView from './pages/PipelineListView'
import PipelineDetailPage from './pages/PipelineDetailPage'

/**
 * App Component
 * Main app container with routing
 */
function App() {
  const [activeRoute, setActiveRoute] = useState('/pipelines')

  // Handle navigation
  const navigate = useNavigate()

  // Navigate to pipeline detail
  const navigateToDetail = (pipelineId) => {
    navigate(`/pipelines/${pipelineId}`)
    setActiveRoute(`/pipelines/${pipelineId}`)
  }

  // Navigate back to list
  const navigateToList = () => {
    navigate('/pipelines')
    setActiveRoute('/pipelines')
  }

  return (
    <Router>
      {/* Navigation Sidebar */}
      <nav className="app-sidebar">
        <div className="sidebar-header">
          <h1 className="app-title">Pipeline Manager</h1>
        </div>
        <div className="sidebar-menu">
          <Link to="/pipelines" className="menu-item" onClick={() => setActiveRoute('/pipelines')}>
            <span className="menu-icon">📋</span>
            <span className="menu-text">Pipeline List</span>
          </Link>
          <Link to="/pipelines/new" className="menu-item">
            <span className="menu-icon">➕</span>
            <span className="menu-text">Create Pipeline</span>
          </Link>
          <Link to="/pipelines/history" className="menu-item">
            <span className="menu-icon">📅</span>
            <span className="menu-text">History</span>
          </Link>
          <Link to="/pipelines/settings" className="menu-item">
            <span className="menu-icon">⚙️</span>
            <span className="menu-text">Settings</span>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="app-main">
        <Outlet />
      </main>
    </Router>
  )
}

/**
 * Root App with routes
 */
function RootApp() {
  return (
    <div className="app-container">
      <App />
    </div>
  )
}

export default RootApp