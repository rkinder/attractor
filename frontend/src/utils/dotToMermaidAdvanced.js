import { dotToMermaid, extractNodes, extractEdges } from './dotToMermaid'

// Custom converter with error handling
export function safeDotToMermaid(dotCode, options = {}) {
  try {
    const result = dotToMermaid(dotCode)
    return { success: true, code: result, error: null }
  } catch (error) {
    return { 
      success: false, 
      code: null, 
      error: `Conversion failed: ${error.message}` 
    }
  }
}

// Analyze DOT code first
export function analyzeDotCode(dotCode) {
  const nodes = extractNodes(dotCode)
  const edges = extractEdges(dotCode)
  
  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodes,
    edges
  }
}

// Example
const analysis = analyzeDotCode(dotSource)
console.log(`Found ${analysis.nodeCount} nodes and ${analysis.edgeCount} edges`)