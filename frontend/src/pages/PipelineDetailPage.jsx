import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPipeline } from '../services/api'
import PageLayout from '../components/PageLayout'
import PipelineGraph from '../components/PipelineGraph'
import PipelineTimeline from '../components/PipelineTimeline'
import NodeDetails from '../components/NodeDetails'
/**
 * PipelineDetailPage Component
 * Displays detailed view of a pipeline
 */
function PipelineDetailPage() {
  const { pipelineId } = useParams()
  const navigate = useNavigate()
  const [pipeline, setPipeline] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [viewMode, setViewMode] = useState('graph')

  // Fetch pipeline data
  const fetchPipeline = useCallback(async () => {
    if (!pipelineId) return

    setLoading(true)
    setError(null)

    try {
      const data = await getPipeline(pipelineId)
      setPipeline(data)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch pipeline')
    } finally {
      setLoading(false)
    }
  }, [pipelineId])

  // Fetch pipeline on mount
  useEffect(() => {
    fetchPipeline()
  }, [pipelineId, fetchPipeline])

  // Navigate back to list
  const handleBack = () => {
    navigate('/pipelines')
  }

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

  // Get status label
  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      running: 'Running',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled'
    }
    return labels[status.toLowerCase()] || status
  }

  // Loading state
  if (loading) {
    return (
      <PageLayout
        title="Loading Pipeline"
        subtitle="Fetching pipeline details..."
        onBack={handleBack}
      >
        <div className="detail-loading">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <span>Loading Pipeline {pipelineId}...</span>
          </div>
        </div>
      </PageLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <PageLayout
        title="Error"
        subtitle="Failed to load pipeline details"
        onBack={handleBack}
      >
        <div className="detail-error">
          <h3>Error</h3>
          <p>{error}</p>
          <button
            className="error-retry-button"
            onClick={fetchPipeline}
          >
            Retry
          </button>
        </div>
      </PageLayout>
    )
  }

  // Empty state
  if (!pipeline) {
    return (
      <PageLayout
        title="Pipeline Not Found"
        subtitle="No pipeline with ID {pipelineId}"
        onBack={handleBack}
      >
        <div className="detail-empty">
          <h3>Pipeline Not Found</h3>
          <p>The pipeline you're looking for doesn't exist or has been deleted.</p>
          <button
            className="error-retry-button"
            onClick={fetchPipeline}
          >
            Retry
          </button>
        </div>
      </PageLayout>
    )
  }

  // Render
  return (
    <PageLayout
      title={pipeline.name || `Pipeline #${pipeline.id}`}
      subtitle={`Status: ${getStatusLabel(pipeline.status)}`}
      onBack={handleBack}
    >
      {/* View Mode Selector */}
      <div className="view-mode-selector">
        <div className="view-mode-tabs">
          <button
            className={`mode-tab ${viewMode === 'graph' ? 'active' : ''}`}
            onClick={() => setViewMode('graph')}
          >
            Graph View
          </button>
          <button
            className={`mode-tab ${viewMode === 'timeline' ? 'active' : ''}`}
            onClick={() => setViewMode('timeline')}
          >
            Timeline View
          </button>
          <button
            className={`mode-tab ${viewMode === 'nodes' ? 'active' : ''}`}
            onClick={() => setViewMode('nodes')}
          >
            Nodes View
          </button>
          <button
            className={`mode-tab ${viewMode === 'logs' ? 'active' : ''}`}
            onClick={() => setViewMode('logs')}
          >
            Logs View
          </button>
        </div>
      </div>

      {/* View Content */}
      {viewMode === 'graph' && (
        <PipelineGraph
          graphData={generatePipelineDot(pipeline)}
          graphMode="flow"
          autoLayout={true}
          onReady={(diagramId) => console.log('Graph ready:', diagramId)}
          onError={(error) => console.error('Graph error:', error)}
        />
      )}

      {viewMode === 'timeline' && (
        <PipelineTimeline
          pipelineId={pipeline.id}
          onEventClick={(event) => console.log('Event clicked:', event)}
          onSelectStage={(stage) => console.log('Stage selected:', stage)}
          autoRefresh={true}
        />
      )}

      {viewMode === 'nodes' && (
        <NodeDetails
          nodeId={pipeline.id}
          nodeData={pipeline}
          onNodeClick={(node) => console.log('Node clicked:', node)}
          onStatClick={(stat) => console.log('Stat clicked:', stat)}
          onEventClick={(event) => console.log('Event clicked:', event)}
          autoRefresh={false}
        />
      )}

      {viewMode === 'logs' && (
        <div className="logs-view">
          <h3>Pipeline Logs</h3>
          <pre className="logs-content">
            <code>
              {pipeline.log_content || 'No logs available for this pipeline.'}
            </code>
          </pre>
        </div>
      )}
    </PageLayout>
  )
}

// Helper to generate DOT syntax for pipeline
function generatePipelineDot(pipeline) {
  return `
digraph {
  node [shape=box, style=rounded];
  rankdir=LR;
  
  start [label="Pipeline Start", shape=plaintext];
  decision [label="${pipeline.name}", shape=ellipse];
  process1 [label="Process Step 1"];
  process2 [label="Process Step 2"];
  end [label="Pipeline Complete", shape=plaintext];
  
  start -> decision;
  decision -> process1;
  process1 -> process2;
  process2 -> end;
}`
}

export default PipelineDetailPage