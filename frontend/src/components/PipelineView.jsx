import React, { useState } from 'react'
import PipelineGraph from './PipelineGraph'
import { getPipelines } from '../services/api'

function PipelineView({ pipelineId }) {
  const [dotData, setDotData] = useState('')

  // Fetch pipeline DOT data from API
  const fetchPipelineData = async () => {
    try {
      const pipeline = await getPipelines(pipelineId)
      
      // Generate DOT syntax for pipeline
      const dotSyntax = generatePipelineDot(pipeline)
      setDotData(dotSyntax)
    } catch (error) {
      console.error('Failed to fetch pipeline:', error)
    }
  }

  React.useEffect(() => {
    fetchPipelineData()
  }, [pipelineId])

  return (
    <div>
      <h2>Pipeline {pipelineId}</h2>
      <PipelineGraph 
        graphData={dotData}
        graphMode="flow"
        onReady={(id) => console.log('Graph ready:', id)}
        onError={(error) => console.error('Graph error:', error)}
      />
    </div>
  )
}

// Generate DOT syntax for pipeline
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

export default PipelineView