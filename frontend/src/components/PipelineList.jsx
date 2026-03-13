import React, { useEffect, useState } from 'react'
import { getPipelines, getPipeline, getDecisions } from '../services/api'

/**
 * PipelineList Component
 * Displays a list of pipelines with basic actions
 */
function PipelineList() {
  // State
  const [pipelines, setPipelines] = useState([])
  const [selectedPipeline, setSelectedPipeline] = useState(null)
  const [decisions, setDecisions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [loadingDecisions, setLoadingDecisions] = useState(false)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState({ status: 'all', minDate: '', maxDate: '' })

  // Fetch pipelines on mount
  useEffect(() => {
    fetchPipelines()
  }, [filter])

  // Fetch pipelines
  const fetchPipelines = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        status: filter.status,
        minDate: filter.minDate,
        maxDate: filter.maxDate
      }
      const data = await getPipelines(params)
      setPipelines(data)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch pipelines')
    } finally {
      setLoading(false)
    }
  }

  // Fetch selected pipeline details
  const handleViewDetails = async (pipelineId) => {
    setLoadingDetails(true)
    setError(null)
    try {
      const pipeline = await getPipeline(pipelineId)
      setSelectedPipeline(pipeline)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch pipeline details')
    } finally {
      setLoadingDetails(false)
    }
  }

  // Fetch decisions for a pipeline
  const handleGetDecisions = async (pipelineId) => {
    setLoadingDecisions(true)
    setError(null)
    try {
      const data = await getDecisions(pipelineId)
      setDecisions(data)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch decisions')
    } finally {
      setLoadingDecisions(false)
    }
  }

  // Reset filter
  const handleFilterReset = () => {
    setFilter({ status: 'all', minDate: '', maxDate: '' })
  }

  // Filter pipelines by status
  const getFilteredPipelines = () => {
    return pipelines.filter((pipeline) => {
      if (filter.status !== 'all' && pipeline.status !== filter.status) return false
      if (filter.minDate && new Date(pipeline.created_at) < new Date(filter.minDate)) return false
      if (filter.maxDate && new Date(pipeline.created_at) > new Date(filter.maxDate)) return false
      return true
    })
  }

  // Get status badge color
  const getStatusBadgeColor = (status) => {
    const statusColors = {
      pending: '#ffc107',
      running: '#28a745',
      completed: '#007bff',
      failed: '#dc3545',
      cancelled: '#6c757d'
    }
    return statusColors[status.toLowerCase()] || '#6c757d'
  }

  // Get formatted date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Loading State
  if (loading) {
    return (
      <div className="pipeline-list-container">
        <div className="loading-spinner">Loading pipelines...</div>
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <div className="pipeline-list-container">
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
        <button onClick={fetchPipelines} className="retry-button">Retry</button>
      </div>
    )
  }

  // Render
  return (
    <div className="pipeline-list-container">
      <div className="pipeline-list-header">
        <h1>Pipeline Management</h1>
        <button onClick={fetchPipelines} className="refresh-button">
          <span className="refresh-icon">↻</span> Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="filter-select"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <input
          type="date"
          value={filter.minDate}
          onChange={(e) => setFilter({ ...filter, minDate: e.target.value })}
          placeholder="Min Date"
          className="filter-input"
        />

        <input
          type="date"
          value={filter.maxDate}
          onChange={(e) => setFilter({ ...filter, maxDate: e.target.value })}
          placeholder="Max Date"
          className="filter-input"
        />

        <button onClick={handleFilterReset} className="filter-reset-button">
          Reset Filters
        </button>
      </div>

      {/* Pipelines List */}
      <div className="pipelines-list">
        <table className="pipelines-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Created</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {getFilteredPipelines().length === 0 ? (
              <tr>
                <td colSpan="5" className="no-data">
                  No pipelines found
                </td>
              </tr>
            ) : (
              getFilteredPipelines().map((pipeline) => (
                <tr key={pipeline.id}>
                  <td className="pipeline-id">#{pipeline.id}</td>
                  <td className="pipeline-name">{pipeline.name}</td>
                  <td className="pipeline-date">
                    {formatDate(pipeline.created_at)}
                  </td>
                  <td className="pipeline-status">
                    <span
                      className={`status-badge status-${pipeline.status}`}
                      style={{ backgroundColor: getStatusBadgeColor(pipeline.status) }}
                    >
                      {pipeline.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="pipeline-actions">
                    <button
                      onClick={() => handleViewDetails(pipeline.id)}
                      disabled={loadingDetails}
                      className="action-button"
                    >
                      {loadingDetails ? 'Loading...' : 'View Details'}
                    </button>
                    <button
                      onClick={() => handleGetDecisions(pipeline.id)}
                      disabled={loadingDecisions}
                      className="action-button"
                    >
                      {loadingDecisions ? 'Loading...' : 'Get Decisions'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pipeline Details Section */}
      {selectedPipeline && (
        <div className="pipeline-details-section">
          <h2>Pipeline Details</h2>
          <div className="details-card">
            <h3>{selectedPipeline.name}</h3>
            <p><strong>ID:</strong> #{selectedPipeline.id}</p>
            <p><strong>Status:</strong> <span className={`status-badge status-${selectedPipeline.status}`} style={{ backgroundColor: getStatusBadgeColor(selectedPipeline.status) }}>
              {selectedPipeline.status.toUpperCase()}
            </span></p>
            <p><strong>Created:</strong> {formatDate(selectedPipeline.created_at)}</p>
            {selectedPipeline.description && (
              <p><strong>Description:</strong> {selectedPipeline.description}</p>
            )}
          </div>
        </div>
      )}

      {/* Decisions Section */}
      {decisions.length > 0 && (
        <div className="decisions-section">
          <h2>Pipeline Decisions</h2>
          <div className="decisions-list">
            {decisions.map((decision, index) => (
              <div key={index} className="decision-item">
                <strong>{decision.name}</strong>
                <span className={`decision-status status-${decision.status}`} style={{ backgroundColor: getStatusBadgeColor(decision.status) }}>
                  {decision.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default PipelineList