import React, { useState, useEffect } from 'react'
import { getPipelines } from '../services/api'
import PageLayout from '../components/PageLayout'
/**
 * PipelineListView Page
 * Displays list of all pipelines with search and filter
 */
function PipelineListView() {
  const [pipelines, setPipelines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  // Fetch pipelines
  useEffect(() => {
    fetchPipelines()
  }, [])

  const fetchPipelines = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getPipelines()
      setPipelines(data)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch pipelines')
    } finally {
      setLoading(false)
    }
  }

  // Filter pipelines
  const filteredPipelines = pipelines.filter(pipeline => {
    const matchesSearch = pipeline.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pipeline.id?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' || pipeline.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffc107',
      running: '#28a745',
      completed: '#28a745',
      failed: '#dc3545',
      cancelled: '#6c757d'
    }
    return colors[status.toLowerCase()] || '#6c757d'
  }

  // Navigate to pipeline detail
  const navigateToDetail = (pipelineId) => {
    console.log(`Navigating to pipeline: ${pipelineId}`)
    // In actual implementation, use router.push('/pipelines/${pipelineId}')
  }

  return (
    <PageLayout
      title="Pipeline List"
      subtitle="Manage and view all pipeline operations"
      onBack={() => console.log('Go back')}
    >
      {/* Page Content */}
      <div className="pipeline-list-view-container">
        {/* Header */}
        <div className="pipeline-list-header">
          <div className="search-filter-bar">
            <input
              type="text"
              placeholder="Search pipelines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <button className="create-pipeline-button">
            <span className="create-icon">+</span>
            Create New Pipeline
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner">
              <div className="spinner"></div>
              <span>Loading pipelines...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="error-state">
            <h3>Error</h3>
            <p>{error}</p>
            <button onClick={fetchPipelines} className="retry-button">
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredPipelines.length === 0 && (
          <div className="empty-state">
            <h3>No Pipelines Found</h3>
            <p>Try adjusting your search or filter criteria</p>
          </div>
        )}

        {/* Pipelines Table */}
        {!loading && !error && filteredPipelines.length > 0 && (
          <div className="pipelines-table-container">
            <table className="pipelines-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Progress</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPipelines.map((pipeline) => (
                  <tr key={pipeline.id}>
                    <td className="pipeline-id">#{pipeline.id}</td>
                    <td className="pipeline-name">
                      {pipeline.name || 'Untitled Pipeline'}
                    </td>
                    <td className="pipeline-status">
                      <span
                        className={`status-badge status-${pipeline.status}`}
                        style={{ backgroundColor: getStatusColor(pipeline.status) }}
                      >
                        {pipeline.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="pipeline-created">
                      {new Date(pipeline.created_at).toLocaleDateString()}
                    </td>
                    <td className="pipeline-progress">
                      <div className="progress-bar-container">
                        <div
                          className="progress-bar-fill"
                          style={{
                            width: `${pipeline.progress || 0}%`,
                            backgroundColor: getStatusColor(pipeline.status)
                          }}
                        ></div>
                      </div>
                      <span>{pipeline.progress || 0}%</span>
                    </td>
                    <td className="pipeline-actions">
                      <button
                        onClick={() => navigateToDetail(pipeline.id)}
                        className="action-button view-button"
                      >
                        View Details
                      </button>
                      <button
                        className="action-button action-button-secondary"
                        onClick={() => console.log(`View logs for ${pipeline.id}`)}
                      >
                        View Logs
                      </button>
                      <button
                        className="action-button action-button-danger"
                        onClick={() => console.log(`Delete ${pipeline.id}`)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageLayout>
  )
}

export default PipelineListView