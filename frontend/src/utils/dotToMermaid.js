/**
 * DOT to Mermaid Graph Converter Utility
 * Converts Graphviz DOT digraph/graph syntax to Mermaid flowchart syntax
 */

/**
 * Convert DOT digraph syntax to Mermaid flowchart syntax
 * @param {string} dotCode - DOT language source code
 * @returns {string} Mermaid graph code
 */
export function dotToMermaid(dotCode) {
  // Remove or handle comments
  const cleanedCode = dotCode.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')

  // Extract nodes and edges from DOT syntax
  const nodes = extractNodes(cleanedCode)
  const edges = extractEdges(cleanedCode)
  
  // Convert to Mermaid syntax
  let mermaidCode = 'graph TD;\n'

  // Convert nodes with styles
  nodes.forEach(node => {
    let nodeDef = `    node_${node.id}`
    
    if (node.label) {
      nodeDef += `[${node.label}]`
    } else {
      nodeDef += ``
    }
    
    // Add node styles if provided
    if (node.style) {
      const styleStr = buildStyleString(node.style)
      nodeDef = `    node_${node.id}(${node.id})${styleStr}`
    } else {
      nodeDef = `    node_${node.id}(${node.id})`
    }
    
    if (!nodeDef.includes('[')) {
      mermaidCode += `${nodeDef};\n`
    }
  })

  // Convert edges
  edges.forEach(edge => {
    const edgeStyle = buildEdgeStyle(edge)
    mermaidCode += `    node_${edge.from} --> node_${edge.to}${edgeStyle};\n`
  })

  // Add graph-level styling if present
  const graphStyle = extractGraphStyles(cleanedCode)
  if (graphStyle) {
    mermaidCode = `graph TD;\n`
    mermaidCode += `${graphStyle};\n`
  }

  return mermaidCode
}

/**
 * Extract node definitions from DOT syntax
 */
function extractNodes(dotCode) {
  const nodes = []
  const nodeRegex = /node\s+\[id="([^"]+)"\](?:\[[^\]]*\])?/g

  let match
  while ((match = nodeRegex.exec(dotCode)) !== null) {
    const id = match[1]
    const styleMatch = match[0].match(/\[\[([^\]]+)\]\]/)
    const labelMatch = match[0].match(/label="([^"]*)"/)
    
    nodes.push({
      id: id,
      label: labelMatch ? labelMatch[1] : null,
      style: styleMatch ? styleMatch[1] : null
    })
  }
  
  return nodes
}

/**
 * Extract edge definitions from DOT syntax
 */
function extractEdges(dotCode) {
  const edges = []
  const edgeRegex = /node_\d+_->?|node_\d+_-->/g
  
  // More accurate edge extraction
  const edgePatterns = [
    /([a-zA-Z0-9_]+)-->([a-zA-Z0-9_]+)/g,  // -->
    /([a-zA-Z0-9_]+)--->([a-zA-Z0-9_]+)/g, // ---->
    /([a-zA-Z0-9_]+)--([a-zA-Z0-9_]+)/g,   // --
    /([a-zA-Z0-9_]+)--->([a-zA-Z0-9_]+)/g  // ---->
  ]
  
  edgePatterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(dotCode)) !== null) {
      edges.push({
        from: match[1],
        to: match[2],
        type: pattern === /([a-zA-Z0-9_]+)--->([a-zA-Z0-9_]+)/g ? 'double' : 'single'
      })
    }
  })
  
  // Also extract with labels
  const edgeWithLabelsRegex = /([a-zA-Z0-9_]+)-->([a-zA-Z0-9_]+)\s*\[label="([^"]*)"/g
  
  let match
  while ((match = edgeWithLabelsRegex.exec(dotCode)) !== null) {
    const from = match[1]
    const to = match[2]
    const label = match[3]
    
    edges.push({
      from: from,
      to: to,
      label: label,
      type: 'double'
    })
  }
  
  return edges
}

/**
 * Extract graph-level style attributes from DOT syntax
 */
function extractGraphStyles(dotCode) {
  const styles = []
  
  // Extract graph style
  const graphStyleRegex = /graph\s*\[\s*([^\]]+)\]/
  const match = dotCode.match(graphStyleRegex)
  
  if (match) {
    const styleStr = match[1].trim()
    const attributes = styleStr.split(';')
    
    attributes.forEach(attr => {
      const trimmed = attr.trim()
      if (trimmed && !trimmed.startsWith('id') && !trimmed.startsWith('rank')) {
        styles.push(trimmed)
      }
    })
  }
  
  return styles.join('\n')
}

/**
 * Build style string from DOT style attributes
 */
function buildStyleString(styleStr) {
  const styles = []
  
  const attrRegex = /([^=]+)=(["'])([^\2]*)(\2)/g
  
  let match
  while ((match = attrRegex.exec(styleStr)) !== null) {
    const attrName = match[1]
    const attrValue = match[3]
    
    if (attrName === 'label') {
      // Already handled separately
    } else if (attrName === 'label' && match[0].includes('[')) {
      styles.push(attrName + `="${attrValue}"`)
    } else if (attrName === 'shape') {
      styles.push(attrName + `="${attrValue}"`)
    } else if (attrName === 'color') {
      styles.push(attrName + `="${attrValue}"`)
    } else if (attrName === 'fillcolor') {
      styles.push(attrName + `="${attrValue}"`)
    } else if (attrName === 'style') {
      styles.push(attrName + `="${attrValue}"`)
    }
  }
  
  return styles.join(' ')
}

/**
 * Build edge style string from DOT edge attributes
 */
function buildEdgeStyle(edge) {
  let styleStr = ''
  
  if (edge.label) {
    styleStr += `[label="${edge.label}"]`
  }
  
  if (edge.type === 'double') {
    styleStr += '[color=blue]'
  }
  
  if (edge.type === 'in') {
    styleStr += '[color=red]'
  }
  
  return styleStr
}

/**
 * Export utility functions for advanced usage
 */
export { extractNodes, extractEdges, extractGraphStyles }