import React, { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { dotToMermaid } from '../utils/dotToMermaid'

let mermaidInitialized = false

/**
 * PipelineGraph Component
 * Renders pipeline diagrams using mermaid.js
 */
function PipelineGraph({
  graphData = '',
  onReady = null,
  onError = null
}) {
  const containerRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        theme: 'dark',
        fontFamily: 'Segoe UI, Arial, sans-serif',
      })
      mermaidInitialized = true
    }
  }, [])

  useEffect(() => {
    if (!graphData || !containerRef.current) return

    setLoading(true)
    setError(null)

    let mermaidCode = graphData.trim()

    // Convert DOT syntax to Mermaid if needed
    if (mermaidCode.startsWith('digraph') || mermaidCode.startsWith('graph ')) {
      try {
        mermaidCode = dotToMermaid(mermaidCode)
      } catch (err) {
        setError(`DOT conversion failed: ${err.message}`)
        setLoading(false)
        return
      }
    }

    if (!mermaidCode) {
      setLoading(false)
      return
    }

    const id = `mermaid-${Date.now()}`
    mermaid.render(id, mermaidCode)
      .then(({ svg }) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = svg
          if (onReady) onReady(id)
        }
      })
      .catch(err => {
        const msg = err.message || 'Failed to render graph'
        setError(msg)
        if (onError) onError(err)
      })
      .finally(() => setLoading(false))
  }, [graphData])

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

  if (error) {
    return (
      <div className="pipeline-graph-container pipeline-graph-error">
        <div className="error-message">
          <h3>Error Rendering Graph</h3>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (!graphData) {
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
      <div ref={containerRef} className="mermaid-diagram-container" />
    </div>
  )
}

export default PipelineGraph
