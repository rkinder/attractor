import React, { useState } from 'react'
import NodeDetails from './NodeDetails'
import { getPipelines } from '../services/api'

function NodeSelector() {
  const [selectedNode, setSelectedNode] = useState(null)
  const [nodes, setNodes] = useState([])
  const [loading, setLoading] = useState(false)

  // Fetch all nodes
  const fetchNodes = async () => {
    setLoading(true)
    try {
      const data = await getPipelines()
      setNodes(data)
    } catch (error) {
      console.error('Failed to fetch nodes:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle node selection
  const handleNodeSelect = async (nodeId) => {
    setSelectedNode(nodeId)
    await fetchNodes()
  }

  useEffect(() => {
    fetchNodes()
  }, [])

  return (
    <div>
      <h3>Select a Node</h3>
      <select
        value={selectedNode || ''}
        onChange={(e) => handleNodeSelect(e.target.value)}
      >
        <option value="">Select a node...</option>
        {nodes.map((node) => (
          <option key={node.id} value={node.id}>
            {node.name || node.id}
          </option>
        ))}
      </select>

      {selectedNode && (
        <NodeDetails
          nodeId={selectedNode}
          onNodeClick={(node) => console.log('Selected:', node)}
          onStatClick={(stat) => console.log('Stat:', stat)}
          onEventClick={(event) => console.log('Event:', event)}
          autoRefresh={true}
        />
      )}
    </div>
  )
}

export default NodeSelector