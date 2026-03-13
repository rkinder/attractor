import React, { useEffect, useState } from 'react'
import NodeDetails from './NodeDetails'

function NodeDetailViewer({ nodeId }) {
  const [nodeData, setNodeData] = useState(null)

  useEffect(() => {
    // Fetch node data
    const fetchNodeData = async () => {
      try {
        const data = await getPipeline(nodeId)
        setNodeData(data)
      } catch (error) {
        console.error('Failed to fetch node:', error)
      }
    }

    fetchNodeData()
  }, [nodeId])

  return (
    <div>
      <h2>Node {nodeId} Details</h2>
      <NodeDetails
        nodeData={nodeData}
        nodeIdType="pipeline"
        onStatClick={(stat) => {
          console.log('Stat:', stat)
          // Navigate to stage details, etc.
        }}
        onEventClick={(event) => {
          console.log('Event:', event)
          // Show event details, etc.
        }}
        autoRefresh={false}
      />
    </div>
  )
}

export default NodeDetailViewer