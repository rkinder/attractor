import React, { useEffect, useState, useCallback } from 'react'
import { getPipeline, getDecisions } from '../services/api'

/**
 * PipelineTimeline Component
 * Displays a timeline view of pipeline execution with events, stages, and status
 */
function PipelineTimeline({
  pipelineId = null,
  pipelineData = null,
  onEventClick = null,
  onSelectStage = null,
  onSelectEvent = null,
  autoRefresh = true
}) {
  // State
  const [timelineData, setTimelineData] = useState(null)
  const [stages, setStages] = useState([])
  const [events, setEvents] = useState([])
  const [decisions, setDecisions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isPlaying, setIsPlaying] = useState(false)

  // Fetch pipeline timeline data
  const fetchTimelineData = useCallback(async () => {
    if (!pipelineId && !pipelineData) return

    setLoading(true)
    setError(null)

    try {
      let pipeline, decisionsData

      // If pipeline data not provided, fetch it
      if (!pipelineData && !pipelineId) {
        throw new Error('No pipeline data provided')
      }

      // Use provided data or fetch
      if (pipelineData) {
        pipeline = pipelineData
      } else {
        pipeline = await getPipeline(pipelineId)
      }

      // Fetch decisions for timeline events
      if (pipelineId) {
        decisionsData = await getDecisions(pipelineId)
      }

      // Build timeline data structure
      const timeline = buildTimelineData(pipeline, decisionsData)
      setTimelineData(timeline)
      setStages(timeline.stages || [])
      setEvents(timeline.events || [])
      setDecisions(timeline.decisions || [])

    } catch (err) {
      console.error('Failed to fetch timeline data:', err)
      setError(err.response?.data?.message || err.message || 'Failed to load timeline')
    } finally {
      setLoading(false)
    }
  }, [pipelineId, pipelineData])

  // Fetch timeline on mount and when data changes
  useEffect(() => {
    fetchTimelineData()
    if (autoRefresh) {
      // Auto-refresh timeline every 60 seconds
      const interval = setInterval(fetchTimelineData, 60000)
      return () => clearInterval(interval)
    }
  }, [fetchTimelineData, autoRefresh])

  // Calculate relative time for stages
  const calculateStagePosition = (stage, index, totalStages) => {
    const duration = stage.duration || 0
    const totalDuration = stages.reduce((sum, s) => sum + (s.duration || 0), 0)
    const progress = totalDuration > 0 ? (stage.duration || 0) / totalDuration : 0
    return progress
  }

  // Format time display
  const formatRelativeTime = (time) => {
    const now = new Date()
    const diffMs = now - new Date(time)
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffSeconds = Math.floor(diffMs / 1000)

    if (diffHours > 24) {
      return `${diffHours} hours ago`
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
    } else {
      return `${diffSeconds} second${diffSeconds > 1 ? 's' : ''} ago`
    }
  }

  // Build timeline data structure
  const buildTimelineData = (pipeline, decisions) => {
    const stages = []
    const events = []
    const now = new Date()

    // Create stage objects
    pipeline.stages?.forEach((stage, index) => {
      stages.push({
        id: stage.id || index,
        name: stage.name || `Stage ${index + 1}`,
        status: stage.status || 'running',
        startTime: stage.started_at || new Date(Date.now() - stage.duration * 60000),
        endTime: stage.completed_at || new Date(),
        duration: stage.duration || 0,
        progress: stage.progress || 0,
        tasks: stage.tasks || []
      })
    })

    // Create event objects from decisions
    decisions?.forEach((decision, index) => {
      events.push({
        id: decision.id || index,
        name: decision.name || `Event ${index + 1}`,
        type: decision.type || 'info',
        status: decision.status || 'completed',
        timestamp: decision.timestamp || new Date(),
        message: decision.message || '',
        pipelineId: pipeline?.id
      })
    })

    // Add pipeline start event
    events.unshift({
      id: 'start',
      name: 'Pipeline Started',
      type: 'info',
      status: 'completed',
      timestamp: new Date(pipeline?.created_at || new Date(Date.now() - 3600000)),
      message: `Pipeline ${pipeline?.id} initialized`
    })

    // Add pipeline end event if completed
    if (pipeline?.status === 'completed') {
      events.push({
        id: 'complete',
        name: 'Pipeline Completed',
        type: 'success',
        status: 'completed',
        timestamp: pipeline?.completed_at || now,
        message: `Pipeline completed successfully`
      })
    } else if (pipeline?.status === 'failed') {
      events.push({
        id: 'failed',
        name: 'Pipeline Failed',
        type: 'error',
        status: 'completed',
        timestamp: pipeline?.failed_at || now,
        message: `Pipeline failed: ${pipeline?.error || 'Unknown error'}`
      })
    }

    return {
      pipeline,
      stages,
      events,
      timelineEvents: events
    }
  }

  // Handle stage click
  const handleStageClick = (stage) => {
    if (onSelectStage) {
      onSelectStage({ type: 'stage', stage })
    }
  }

  // Handle event click
  const handleEventClick = (event) => {
    if (onSelectEvent) {
      onSelectEvent({ type: 'event', event })
    }
  }

  // Toggle animation playback
  const togglePlayback = () => {
    setIsPlaying(!isPlaying)
  }

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffc107',
      running: '#28a745',
      completed: '#28a745',
      failed: '#dc3545',
      error: '#dc3545',
      info: '#6c757d',
      success: '#28a745'
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
      success: 'Success'
    }
    return labels[status.toLowerCase()] || status
  }

  // Loading state
  if (loading) {
    return (
      <div className="pipeline-timeline-container">
        <div className="timeline-loading">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <span>Loading Timeline...</span>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="pipeline-timeline-container">
        <div className="timeline-error">
          <h3>Error Loading Timeline</h3>
          <p>{error}</p>
          <button className="error-retry-button" onClick={fetchTimelineData}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Empty state
  if (!timelineData) {
    return (
      <div className="pipeline-timeline-container">
        <div className="timeline-empty">
          <h3>No Pipeline Timeline Data</h3>
          <p>Provide pipeline ID or data to display timeline</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pipeline-timeline-container">
      {/* Header */}
      <div className="timeline-header">
        <div className="timeline-title-section">
          <h2 className="timeline-title">
            {pipelineData?.name || pipelineData?.id ? `Pipeline ${pipelineData.id}` : 'Pipeline Timeline'}
          </h2>
          <span className={`timeline-status status-${timelineData.status || 'running'}`}
            style={{ backgroundColor: getStatusColor(timelineData.status || 'running') }}>
            {getStatusLabel(timelineData.status || 'running')}
          </span>
        </div>
        <div className="timeline-actions">
          <button
            onClick={togglePlayback}
            className="playback-button"
            title={isPlaying ? 'Pause Timeline' : 'Play Timeline'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button className="refresh-button" onClick={fetchTimelineData}>
            <span className="refresh-icon">↻</span> Refresh
          </button>
        </div>
      </div>

      {/* Timeline Overview */}
      <div className="timeline-overview">
        <div className="timeline-info-card">
          <div className="info-item">
            <span className="info-label">Created:</span>
            <span className="info-value">
              {new Date(pipelineData?.created_at).toLocaleString()}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Started:</span>
            <span className="info-value">
              {new Date(pipelineData?.started_at || pipelineData?.created_at).toLocaleString()}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Last Update:</span>
            <span className="info-value">
              {formatRelativeTime(pipelineData?.updated_at || now)}
            </span>
          </div>
        </div>

        <div className="timeline-progress-section">
          <h3>Pipeline Progress</h3>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${timelineData.progress || 0}%`,
                backgroundColor: getStatusColor(timelineData.status)
              }}
            ></div>
          </div>
          <span className="progress-text">
            {timelineData.progress?.toFixed(1) || 0}% Complete
          </span>
        </div>
      </div>

      {/* Stages Timeline */}
      <div className="timeline-stages">
        <h3>Execution Stages</h3>
        <div className="stages-container">
          {stages.map((stage, index) => (
            <div
              key={stage.id}
              className="stage-item"
              onClick={() => handleStageClick(stage)}
              style={{ backgroundColor: stage.status === 'failed' ? '#ffeef0' : '#f8f9fa' }}
            >
              <div className="stage-number">
                <span className="stage-indicator" style={{
                  backgroundColor: getStatusColor(stage.status),
                  borderColor: getStatusColor(stage.status)
                }}>
                  {index + 1}
                </span>
              </div>
              <div className="stage-content">
                <div className="stage-header">
                  <span className="stage-name">{stage.name}</span>
                  <span
                    className={`stage-status status-${stage.status}`}
                    style={{ backgroundColor: getStatusColor(stage.status) }}
                  >
                    {getStatusLabel(stage.status)}
                  </span>
                </div>
                <div className="stage-timeline">
                  <div className="timeline-track">
                    <div
                      className="timeline-progress"
                      style={{
                        width: `${stage.progress || 0}%`,
                        backgroundColor: getStatusColor(stage.status)
                      }}
                    ></div>
                  </div>
                  <span className="stage-duration">{stage.duration}s</span>
                </div>
                <div className="stage-time">
                  <span className="stage-start">Start:</span>
                  <span className="stage-end">End:</span>
                </div>
                <div className="stage-tasks">
                  {stage.tasks?.slice(0, 3).map((task, tIndex) => (
                    <span key={tIndex} className="task-badge">
                      {task.name || `Task ${tIndex + 1}`}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {stages.length === 0 && (
            <div className="no-stages">
              <p>No execution stages found</p>
            </div>
          )}
        </div>
      </div>

      {/* Events Timeline */}
      <div className="timeline-events">
        <h3>Timeline Events</h3>
        <div className="events-container">
          {events.map((event) => (
            <div
              key={event.id}
              className="event-item"
              onClick={() => handleEventClick(event)}
              style={{
                borderLeftColor: event.type === 'error' ? '#dc3545' : event.type === 'success' ? '#28a745' : '#007bff'
              }}
            >
              <div className="event-header">
                <span className="event-type-badge" style={{
                  backgroundColor:
                    event.type === 'error' ? '#dc3545' :
                    event.type === 'success' ? '#28a745' :
                    event.type === 'info' ? '#007bff' : '#6c757d'
                }}>
                  {event.type?.toUpperCase() || 'INFO'}
                </span>
                <span className="event-status" style={{
                  backgroundColor: getStatusColor(event.status)
                }}>
                  {getStatusLabel(event.status)}
                </span>
              </div>
              <div className="event-body">
                <div className="event-title">{event.name}</div>
                <div className="event-message">{event.message}</div>
                <div className="event-time">
                  <span className="time-label">Time:</span>
                  <span className="time-value">
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {events.length === 0 && (
            <div className="no-events">
              <p>No events recorded</p>
            </div>
          )}
        </div>
      </div>

      {/* Timeline Footer */}
      <div className="timeline-footer">
        <div className="footer-stats">
          <div className="stat-item">
            <span className="stat-label">Total Stages:</span>
            <span className="stat-value">{stages.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Events:</span>
            <span className="stat-value">{events.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Active Stages:</span>
            <span className="stat-value">
              {stages.filter(s => s.status === 'running').length}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Completed Stages:</span>
            <span className="stat-value">
              {stages.filter(s => s.status === 'completed').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PipelineTimeline