import React, { useEffect, useState, useCallback } from 'react'
import mermaid from 'mermaid'
import { dotToMermaid } from '../utils/dotToMermaid'

/**
 * PipelineGraph Component
 * Renders pipeline diagrams using mermaid.js
 */
function PipelineGraph({
  graphData = '',
  graphMode = 'flow',
  autoLayout = true,
  onReady = null,
  onError = null
}) {
  // State
  const [diagramId, setDiagramId] = useState(`pipeline-graph-${Date.now()}`)
  const [mermaidCode, setMermaidCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [rendered, setRendered] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize Mermaid on mount
  useEffect(() => {
    initializeMermaid()
  }, [])

  // Initialize Mermaid configuration
  const initializeMermaid = useCallback(() => {
    if (isInitialized) return

    // Set Mermaid theme
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      theme: 'default',
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: 14,
      themeVariables: {
        primaryColor: '#007bff',
        edgeLabelBackground: '#ffffff',
        edgeLabelColor: '#333',
        lineColor: '#666',
        tertiaryColor: '#f5f5f5',
        primaryTextColor: '#007bff',
        secondaryColor: '#6c757d',
        noteBkgColor: '#f8f9fa',
        noteTextColor: '#333',
        fontSize: 14,
        fontFamily: 'Segoe UI, Arial, sans-serif'
      },
      gantt: {
        titleFontColor: '#007bff'
      },
      sequence: {
        actorBackgroundColor: '#f8f9fa'
      }
    })

    // Register a custom theme for pipeline graphs
    mermaid.registerTheme('pipeline', {
      themeVariables: {
        primaryColor: '#007bff',
        primaryTextColor: '#ffffff',
        primaryBorderColor: '#0056b3',
        lineColor: '#666',
        secondaryColor: '#28a745',
        warningColor: '#ffc107',
        dangerColor: '#dc3545',
        tertiaryColor: '#f5f5f5'
      }
    })

    setIsInitialized(true)
  }, [isInitialized])

  // Convert DOT to Mermaid syntax
  const convertDotToMermaid = useCallback(async (dotData) => {
    try {
      const mermaidCode = dotToMermaid(dotData)
      return mermaidCode
    } catch (err) {
      console.error('DOT conversion error:', err)
      return ''
    }
  }, [])

  // Generate Mermaid code from data
  const generateMermaidCode = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let code = ''

      // Try to convert if DOT syntax is provided
      if (graphData.trim().startsWith('digraph') || graphData.trim().startsWith('graph')) {
        code = await convertDotToMermaid(graphData)
      } else {
        // Use graphData directly if it's already Mermaid syntax
        code = graphData
      }

      // Generate unique ID for diagram
      setDiagramId(`pipeline-graph-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
      setMermaidCode(code)
      setRendered(true)

      if (onReady) {
        onReady(diagramId)
      }
    } catch (err) {
      console.error('Graph generation error:', err)
      setError(err.message || 'Failed to generate graph')
    } finally {
      setLoading(false)
    }
  }, [graphData, onReady])

  // Trigger graph generation when data changes
  useEffect(() => {
    generateMermaidCode()
  }, [graphData, graphMode, generateMermaidCode])

  // Handle external graph update
  const handleGraphUpdate = useCallback((newGraphData) => {
    if (newGraphData) {
      setGraphData(newGraphData)
    }
  }, [setGraphData])

  // Get graph configuration based on mode
  const getGraphConfig = useCallback(() => {
    const config = {
      flow: {
        startOnLoad: false,
        type: 'graph'
      },
      timeline: {
        startOnLoad: false,
        type: 'gantt'
      },
      sequence: {
        startOnLoad: false,
        type: 'sequence'
      },
        classDiagram: {
        startOnLoad: false,
        type: 'classDiagram'
      }
    }

    // Apply pipeline theme
    Object.assign(config[graphMode], {
      theme: 'pipeline'
    })

    return config[graphMode]
  }, [graphMode])

  // Reset graph
  const handleReset = () => {
    setGraphData('')
    setMermaidCode('')
    setRendered(false)
    setError(null)
  }

  // Export graph as image
  const handleExport = async (format = 'png') => {
    try {
      await mermaid.init({}, `#mermaid-diagram-${diagramId}`)
      const svg = document.querySelector(`#mermaid-diagram-${diagramId}`)
      
      if (svg) {
        const canvas = document.createElement('canvas')
        canvas.width = svg.offsetWidth * 2
        canvas.height = svg.offsetHeight * 2
        
        const ctx = canvas.getContext('2d')
        ctx.scale(2, 2)
        
        // This is a simplified export - in production use proper canvas export
        console.log(`Exported graph as ${format}`)
        
        if (onExport) {
          onExport({ 
            format, 
            diagramId, 
            canvas, 
            svg 
          })
        }
      }
    } catch (err) {
      console.error('Export error:', err)
    }
  }

  // Render loading state
  if (loading) {
    return (
      <div className="pipeline-graph-container pipeline-graph-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <span>Generating Graph...</span>
        </div>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div className="pipeline-graph-container pipeline-graph-error">
        <div className="error-message">
          <h3>Error Rendering Graph</h3>
          <p>{error}</p>
          <button onClick={generateMermaidCode} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Render graph
  if (!mermaidCode) {
    return (
      <div className="pipeline-graph-container">
        <div className="empty-state">
          <h3>No Pipeline Graph Data</h3>
          <p>Provide pipeline graph data or DOT syntax</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pipeline-graph-container">
      {/* Graph Header */}
      <div className="graph-header">
        <h2 className="graph-title">Pipeline Graph</h2>
        <div className="graph-actions">
          <select 
            value={graphMode}
            onChange={(e) => {
              setGraphMode(e.target.value)
              generateMermaidCode()
            }}
            className="graph-mode-select"
          >
            <option value="flow">Flow Chart</option>
            <option value="timeline">Timeline</option>
            <option value="sequence">Sequence</option>
            <option value="classDiagram">Class Diagram</option>
          </select>
          
          <button 
            onClick={handleReset}
            className="reset-button"
            title="Reset Graph"
          >
            <span className="reset-icon">↻</span> Reset
          </button>
          
          <button 
            onClick={() => handleExport('png')}
            className="export-button"
            title="Export as PNG"
          >
            <span className="export-icon">⬇</span> Export
          </button>
        </div>
      </div>

      {/* Mermaid Diagram */}
      <div className="mermaid-diagram-container" id="mermaid-container">
        <div id={`mermaid-diagram-${diagramId}`}></div>
      </div>

      {/* Legend */}
      <div className="graph-legend">
        <h3>Legend</h3>
        <div className="legend-item">
          <div className="legend-node-start" style={{ backgroundColor: '#28a745' }}></div>
          <span>Start Node</span>
        </div>
        <div className="legend-item">
          <div className="legend-node-process" style={{ backgroundColor: '#007bff' }}></div>
          <span>Process Node</span>
        </div>
        <div className="legend-item">
          <div className="legend-node-end" style={{ backgroundColor: '#6c757d' }}></div>
          <span>End Node</span>
        </div>
        <div className="legend-item">
          <div className="legend-edge-error" style={{ backgroundColor: '#dc3545' }}></div>
          <span>Error/Exception Edge</span>
        </div>
      </div>
    </div>
  )
}

export default PipelineGraph