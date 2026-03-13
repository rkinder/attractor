import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PipelineListView from './pages/PipelineListView'
import PipelineDetailPage from './pages/PipelineDetailPage'
import './index.css'
import './App.css'

function AppWithRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/pipelines" element={<PipelineListView />} />
        
        <Route
          path="/pipelines/:pipelineId"
          element={
            <PipelineDetailPage
              pipelineId={window.location.pathname.split('/').pop()}
            />
          }
        />
        
        <Route path="/" element={<Navigate to="/pipelines" replace />} />
        
        <Route path="*" element={<Navigate to="/pipelines" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function App() {
  return (
    <div className="app-container">
      <AppWithRoutes />
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
