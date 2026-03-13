import React, { useEffect, useState, useCallback } from 'react'
import { getPipeline } from '../services/api'

/**
 * NodeDetails Component
 * Displays detailed information about a pipeline node with statistics, events, and metrics
 */
function NodeDetails({
  nodeId,
  nodeIdType = 'pipeline',
  nodeData = null,
  onNodeClick = null,
  onStatClick = null,
  onEventClick = null,
  autoRefresh = true
}) {
  // State
  const [selectedNode, setSelectedNode] = useState(null)
  const [nodeStats, setNodeStats] = useState([])
  const [events, setEvents] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedTab, setSelectedTab] = useState('overview')

  // Fetch node data
  const fetchNodeData = useCallback(async (nodeId, nodeType) => {
    setLoading(true)
    setError(null)

    try {
      let nodeData, stats, eventsData, metricsData

      // If node data not provided, fetch it
      if (!nodeData) {
        nodeData = await getPipeline(nodeId)
      }

      // Build node stats from data
      stats = nodeData.stages?.map((stage, index) => ({
        id: stage.id || index,
        name: stage.name || `Stage ${index + 1}`,
        status: stage.status || 'running',
        duration: stage.duration || 0,
        progress: stage.progress || 0,
        tasks: stage.tasks || [],
        startTime: stage.started_at || null,
        endTime: stage.completed_at || null
      }))

      // Fetch events
      eventsData = nodeData.events || []

      // Build events array
      eventsData.forEach((event, index) => ({
        id: event.id || index,
        name: event.name || `Event ${index + 1}`,
        type: event.type || 'info',
        status: event.status || 'completed',
        timestamp: event.timestamp || new Date(),
        message: event.message || '',
        details: event.details || {}
      }))

      // Build metrics
      metricsData = {
        totalNodes: nodeData.nodes?.length || 0,
        runningNodes: nodeData.running_nodes || 0,
        completedNodes: nodeData.completed_nodes || 0,
        failedNodes: nodeData.failed_nodes || 0,
        successRate: nodeData.success_rate || 0,
        averageDuration: nodeData.average_duration || 0,
        totalTasks: nodeData.total_tasks || 0,
        completedTasks: nodeData.completed_tasks || 0,
        errorRate: nodeData.error_rate || 0
      }

      // Store data
      setSelectedNode({ ...nodeData, id: nodeId, type: nodeType })
      setNodeStats(stats || [])
      setEvents(eventsData || [])
      setMetrics(metricsData)

    } catch (err) {
      console.error('Failed to fetch node data:', err)
      setError(err.response?.data?.message || err.message || 'Failed to load node details')
    } finally {
      setLoading(false)
    }
  }, [nodeData])

  // Fetch data on mount and when node changes
  useEffect(() => {
    if (nodeId && !nodeData) {
      fetchNodeData(nodeId, nodeIdType)
      if (autoRefresh) {
        const interval = setInterval(() => {
          fetchNodeData(nodeId, nodeIdType)
        }, 30000) // Auto-refresh every 30 seconds
        return () => clearInterval(interval)
      }
    } else if (nodeData) {
      // Use provided data
      const stats = nodeData.stages?.map((stage, index) => ({
        id: stage.id || index,
        name: stage.name || `Stage ${index + 1}`,
        status: stage.status || 'running',
        duration: stage.duration || 0,
        progress: stage.progress || 0,
        tasks: stage.tasks || [],
        startTime: stage.started_at || null,
        endTime: stage.completed_at || null
      }))

      setSelectedNode({ ...nodeData, id: nodeId, type: nodeIdType })
      setNodeStats(stats || [])
      setEvents(nodeData.events || [])
    }
  }, [nodeId, nodeData, nodeIdType, autoRefresh, fetchNodeData])

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffc107',
      running: '#28a745',
      completed: '#28a745',
      failed: '#dc3545',
      error: '#dc3545',
      info: '#6c757d',
      success: '#28a745',
      warning: '#ffc107',
      processing: '#007bff'
    }
    return colors[status.toLowerCase()] || '#6c757d'
  }

  // Get status label
  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      running: 'Running',
      completed: 'Completed',
      failed: 'Failed',
      error: 'Error',
      info: 'Info',
      success: 'Success',
      warning: 'Warning',
      processing: 'Processing'
    }
    return labels[status.toLowerCase()] || status
  }

  // Get icon for status
  const getStatusIcon = (status) => {
    const icons = {
      pending: '⏳',
      running: '▶',
      completed: '✓',
      failed: '✗',
      error: '⚠',
      info: 'ℹ',
      success: '✓',
      warning: '⚡',
      processing: '🔄'
    }
    return icons[status.toLowerCase()] || '🔳'
  }

  // Handle tab change
  const handleTabChange = (tab) => {
    setSelectedTab(tab)
  }

  // Handle stat click
  const handleStatClick = (stat) => {
    if (onStatClick) {
      onStatClick({ type: 'stat', stat })
    }
  }

  // Handle event click
  const handleEventClick = (event) => {
    if (onEventClick) {
      onEventClick({ type: 'event', event })
    }
  }

  // Calculate node percentage
  const getPercentage = (value, total) => {
    return total > 0 ? ((value / total) * 100).toFixed(1) : 0
  }

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '-'
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Loading state
  if (loading) {
    return (
      <div className="node-details-container">
        <div className="node-details-loading">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <span>Loading Node Details...</span>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="node-details-container">
        <div className="node-details-error">
          <h3>Error Loading Node Details</h3>
          <p>{error}</p>
          <button className="error-retry-button" onClick={fetchNodeData}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Empty state
  if (!selectedNode) {
    return (
      <div className="node-details-container">
        <div className="node-details-empty">
          <h3>No Node Selected</h3>
          <p>Provide a node ID or node data to display details</p>
        </div>
      </div>
    )
  }

  // Render
  return (
    <div className="node-details-container">
      {/* Header */}
      <div className="node-details-header">
        <div className="node-details-title-section">
          <h2 className="node-details-title">
            {selectedNode.name || `Node ${selectedNode.id}`}
          </h2>
          <span
            className={`node-status status-${selectedNode.status || 'running'}`}
            style={{ backgroundColor: getStatusColor(selectedNode.status || 'running') }}
          >
            {getStatusLabel(selectedNode.status || 'running')}
          </span>
        </div>
        <div className="node-details-actions">
          <button
            onClick={() => fetchNodeData(selectedNode.id, selectedNode.type)}
            className="node-details-refresh-button"
            title="Refresh Data"
          >
            <span className="refresh-icon">↻</span> Refresh
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="node-details-tabs">
        <button
          className={`tab-button ${selectedTab === 'overview' ? 'active' : ''}`}
          onClick={() => handleTabChange('overview')}
        >
          Overview
        </button>
        <button
          className={`tab-button ${selectedTab === 'stats' ? 'active' : ''}`}
          onClick={() => handleTabChange('stats')}
        >
          Statistics
        </button>
        <button
          className={`tab-button ${selectedTab === 'events' ? 'active' : ''}`}
          onClick={() => handleTabChange('events')}
        >
          Events
        </button>
        <button
          className={`tab-button ${selectedTab === 'timeline' ? 'active' : ''}`}
          onClick={() => handleTabChange('timeline')}
        >
          Timeline
        </button>
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && (
        <div className="tab-content">
          {/* Quick Stats */}
          <div className="quick-stats-grid">
            <div className="quick-stat-card">
              <span className="stat-label">Node ID</span>
              <span className="stat-value">{selectedNode.id}</span>
            </div>
            <div className="quick-stat-card">
              <span className="stat-label">Status</span>
              <span
                className={`stat-value stat-${selectedNode.status}`}
                style={{ color: getStatusColor(selectedNode.status) }}
              >
                {getStatusLabel(selectedNode.status)}
              </span>
            </div>
            <div className="quick-stat-card">
              <span className="stat-label">Created</span>
              <span className="stat-value">{formatTimestamp(selectedNode.created_at)}</span>
            </div>
            <div className="quick-stat-card">
              <span className="stat-label">Last Updated</span>
              <span className="stat-value">{formatTimestamp(selectedNode.updated_at)}</span>
            </div>
            <div className="quick-stat-card">
              <span className="stat-label">Duration</span>
              <span className="stat-value">{selectedNode.duration}s</span>
            </div>
            <div className="quick-stat-card">
              <span className="stat-label">Success Rate</span>
              <span className="stat-value">{selectedNode.success_rate?.toFixed(2)}%</span>
            </div>
          </div>

          {/* Description */}
          {selectedNode.description && (
            <div className="node-description">
              <h3>Description</h3>
              <p>{selectedNode.description}</p>
            </div>
          )}
        </div>
      )}

      {selectedTab === 'stats' && (
        <div className="tab-content">
          {/* Node Metrics */}
          {metrics && (
            <div className="metrics-section">
              <h3>Node Metrics</h3>
              <div className="metrics-grid">
                <div className="metric-card">
                  <span className="metric-label">Total Nodes</span>
                  <span className="metric-value">{metrics.totalNodes}</span>
                  <div className="metric-bar-container">
                    <div
                      className="metric-bar"
                      style={{ width: `${metrics.totalNodes}%`, backgroundColor: '#007bff' }}
                    ></div>
                  </div>
                </div>

                <div className="metric-card">
                  <span className="metric-label">Running</span>
                  <span className="metric-value">{metrics.runningNodes}</span>
                  <div className="metric-bar-container">
                    <div
                      className="metric-bar"
                      style={{ width: `${getPercentage(metrics.runningNodes, metrics.totalNodes)}%`, backgroundColor: '#28a745' }}
                    ></div>
                  </div>
                </div>

                <div className="metric-card">
                  <span className="metric-label">Completed</span>
                  <span className="metric-value">{metrics.completedNodes}</span>
                  <div className="metric-bar-container">
                    <div
                      className="metric-bar"
                      style={{ width: `${getPercentage(metrics.completedNodes, metrics.totalNodes)}%`, backgroundColor: '#28a745' }}
                    ></div>
                  </div>
                </div>

                <div className="metric-card">
                  <span className="metric-label">Failed</span>
                  <span className="metric-value">{metrics.failedNodes}</span>
                  <div className="metric-bar-container">
                    <div
                      className="metric-bar"
                      style={{ width: `${getPercentage(metrics.failedNodes, metrics.totalNodes)}%`, backgroundColor: '#dc3545' }}
                    ></div>
                  </div>
                </div>

                <div className="metric-card">
                  <span className="metric-label">Success Rate</span>
                  <span className="metric-value">{metrics.successRate.toFixed(2)}%</span>
                  <div className="metric-bar-container">
                    <div
                      className="metric-bar"
                      style={{ width: `${metrics.successRate}%`, backgroundColor: '#28a745' }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stage Statistics */}
          {nodeStats.length > 0 && (
            <div className="stats-section">
              <h3>Stage Statistics</h3>
              <div className="stats-container">
                {nodeStats.map((stat, index) => (
                  <div
                    key={stat.id}
                    className="stat-item"
                    onClick={() => handleStatClick(stat)}
                    style={{ backgroundColor: stat.status === 'failed' ? '#ffeef0' : '#f8f9fa' }}
                  >
                    <div className="stat-header">
                      <span className="stat-number">#{index + 1}</span>
                      <span className="stat-name">{stat.name}</span>
                      <span
                        className={`stat-status status-${stat.status}`}
                        style={{ backgroundColor: getStatusColor(stat.status) }}
                      >
                        {getStatusLabel(stat.status)}
                      </span>
                    </div>
                    <div className="stat-metrics">
                      <span>Duration: {stat.duration}s</span>
                      <span>Progress: {stat.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedTab === 'events' && (
        <div className="tab-content">
          {/* Events List */}
          {events.length > 0 ? (
            <div className="events-section">
              <div className="events-filter-bar">
                <select
                  className="events-filter-select"
                  onChange={(e) => {
                    const filter = e.target.value
                    const filteredEvents = events.filter(event => event.type === filter)
                    setEvents(filteredEvents)
                  }}
                >
                  <option value="all">All Events</option>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                  <option value="success">Success</option>
                </select>
              </div>

              <div className="events-list">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="event-card"
                    onClick={() => handleEventClick(event)}
                    style={{
                      borderLeftColor:
                        event.type === 'error' ? '#dc3545' :
                        event.type === 'warning' ? '#ffc107' : '#007bff',
                      borderLeftWidth: '4px'
                    }}
                  >
                    <div className="event-header">
                      <span
                        className="event-type-badge"
                        style={{
                          backgroundColor: event.type === 'error' ? '#dc3545' :
                            event.type === 'warning' ? '#ffc107' :
                            event.type === 'success' ? '#28a745' : '#007bff'
                        }}
                      >
                        {event.type?.toUpperCase() || 'INFO'}
                      </span>
                      <span
                        className="event-status"
                        style={{ backgroundColor: getStatusColor(event.status) }}
                      >
                        {getStatusLabel(event.status)}
                      </span>
                    </div>
                    <div className="event-body">
                      <div className="event-title">{event.name}</div>
                      <div className="event-message">{event.message}</div>
                      {event.details && (
                        <div className="event-details">
                          <strong>Details:</strong> {event.details}
                        </div>
                      )}
                      <div className="event-time">
                        <span className="time-label">Time:</span>
                        <span className="time-value">{formatTimestamp(event.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="no-events">
              <p>No events recorded for this node</p>
            </div>
          )}
        </div>
      )}

      {selectedTab === 'timeline' && (
        <div className="tab-content">
          {/* Timeline Visualization */}
          <div className="timeline-section">
            <h3>Node Timeline</h3>
            <div className="timeline-container">
              {nodeStats.length > 0 && nodeStats.map((stage, index) => (
                <div
                  key={stage.id}
                  className="timeline-stage"
                  onClick={() => handleStatClick(stage)}
                  style={{
                    backgroundColor: stage.status === 'completed' ? '#d4edda' :
                      stage.status === 'running' ? '#fff3cd' :
                      stage.status === 'failed' ? '#f8d7da' : '#f8f9fa',
                    borderTopColor: getStatusColor(stage.status)
                  }}
                >
                  <div className="timeline-stage-header">
                    <span className="stage-number">{index + 1}</span>
                    <span className="stage-name">{stage.name}</span>
                    <span
                      className={`stage-status status-${stage.status}`}
                      style={{ backgroundColor: getStatusColor(stage.status) }}
                    >
                      {getStatusLabel(stage.status)}
                    </span>
                  </div>
                  <div className="timeline-stage-tasks">
                    {stage.tasks?.slice(0, 5).map((task, tIndex) => (
                      <span key={tIndex} className="task-badge">
                        {task.name || `Task ${tIndex + 1}`}
                      </span>
                    ))}
                    {stage.tasks?.length > 5 && (
                      <span className="tasks-count">
                        +{stage.tasks.length - 5} more
                      </span>
                    )}
                  </div>
                  <div className="timeline-stage-duration">
                    {stage.duration}s
                  </div>
                  <div className="timeline-stage-progress">
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${stage.progress || 0}%`,
                          backgroundColor: getStatusColor(stage.status)
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}

              {nodeStats.length === 0 && (
                <div className="no-timeline">
                  <p>No timeline data available for this node</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NodeDetails