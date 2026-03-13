import React from 'react'
import PipelineGraph from './PipelineGraph'

function CustomPipelineGraph() {
  const graphData = `
  graph TD;
      A[Start] --> B(Process);
      B --> C{Decision};
      C -->|Yes| D(Approval);
      C -->|No| E(Retry);
      E --> B;
      D --> F(Complete);
  `

  return (
    <div>
      <h2>Pipeline Flow</h2>
      <PipelineGraph 
        graphData={graphData}
        graphMode="flow"
        autoLayout={true}
        onReady={(diagramId) => {
          console.log('Mermaid diagram rendered:', diagramId)
        }}
        onError={(error) => {
          console.error('Render error:', error)
        }}
      />
    </div>
  )
}

export default CustomPipelineGraph