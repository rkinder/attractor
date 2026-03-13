import React from 'react'
import NodeDetails from './NodeDetails'

function AdvancedNodeDetails({ nodeId }) {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div>
      <h2>Advanced Node Details</h2>
      <NodeDetails
        nodeId={nodeId}
        onNodeClick={(node) => {
          console.log('Node clicked:', node)
          setActiveTab('overview')
        }}
        onStatClick={(stat) => {
          console.log('Stat clicked:', stat)
          setActiveTab('stats')
        }}
        onEventClick={(event) => {
          console.log('Event clicked:', event)
          setActiveTab('events')
        }}
        autoRefresh={true}
      />
    </div>
  )
}

export default AdvancedNodeDetails