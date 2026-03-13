import React, { useEffect, useState } from 'react'
import PipelineTimeline from './PipelineTimeline'
import { getPipeline } from '../services/api'

function PipelineDetail({ pipelineId }) {
  const [pipeline, setPipeline] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPipeline = async () => {
      try {
        const data = await getPipeline(pipelineId)
        setPipeline(data)
      } catch (error) {
        console.error('Failed to fetch pipeline:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPipeline()
  }, [pipelineId])

  if (loading) return <div>Loading pipeline data...</div>

  return (
    <div>
      <h2>Pipeline {pipelineId} Timeline</h2>
      <PipelineTimeline
        pipelineData={pipeline}
        onEventClick={(event) => {
          console.log('Event clicked:', event.name, event.timestamp)
        }}
        onSelectStage={(stage) => {
          console.log('Stage selected:', stage.name)
        }}
        autoRefresh={false}
      />
    </div>
  )
}

export default PipelineDetail