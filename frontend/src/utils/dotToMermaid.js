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
  // Strip comments
  const cleanedCode = dotCode
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')

  const nodes = extractNodes(cleanedCode)
  const edges = extractEdges(cleanedCode)

  let mermaidCode = 'graph TD\n'

  // Emit node definitions with labels
  const emittedNodes = new Set()
  nodes.forEach(node => {
    emittedNodes.add(node.id)
    const label = node.label || node.id
    mermaidCode += `  ${sanitizeId(node.id)}["${escapeLabel(label)}"]\n`
  })

  // Emit edges (also implicitly define any nodes not already listed)
  edges.forEach(edge => {
    const from = sanitizeId(edge.from)
    const to = sanitizeId(edge.to)
    if (edge.label) {
      mermaidCode += `  ${from} -->|"${escapeLabel(edge.label)}"| ${to}\n`
    } else {
      mermaidCode += `  ${from} --> ${to}\n`
    }
  })

  return mermaidCode
}

/**
 * Extract node definitions from DOT syntax.
 * Matches: identifier [attr=val, ...]
 * Skips graph-level keywords and edge lines.
 */
function extractNodes(dotCode) {
  const nodes = []
  const seen = new Set()

  // Match lines like:  nodeId [label="...", shape=box]
  // Also bare nodes: nodeId;
  const nodeWithAttrsRegex = /^[ \t]*([a-zA-Z_][a-zA-Z0-9_]*)\s*\[([^\]]*)\]/gm
  const KEYWORDS = new Set(['node', 'edge', 'graph', 'digraph', 'subgraph', 'strict'])

  let match
  while ((match = nodeWithAttrsRegex.exec(dotCode)) !== null) {
    const id = match[1]
    if (KEYWORDS.has(id)) continue
    if (seen.has(id)) continue
    seen.add(id)

    const attrs = match[2]
    const labelMatch = attrs.match(/label\s*=\s*"([^"]*)"/) ||
                       attrs.match(/label\s*=\s*'([^']*)'/)  ||
                       attrs.match(/label\s*=\s*([^,\]]+)/)
    nodes.push({
      id,
      label: labelMatch ? labelMatch[1].trim() : id,
    })
  }

  return nodes
}

/**
 * Extract edge definitions from DOT syntax.
 * DOT directed graphs use -> for edges.
 */
function extractEdges(dotCode) {
  const edges = []

  // Match: from -> to [label="..."]  (directed)
  // or:    from -- to [label="..."]  (undirected)
  const edgeRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:->|--)\s*([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*\[([^\]]*)\])?/g

  let match
  while ((match = edgeRegex.exec(dotCode)) !== null) {
    const edge = { from: match[1], to: match[2] }
    if (match[3]) {
      const labelMatch = match[3].match(/label\s*=\s*"([^"]*)"/) ||
                         match[3].match(/label\s*=\s*'([^']*)'/) ||
                         match[3].match(/label\s*=\s*([^,\]]+)/)
      if (labelMatch) edge.label = labelMatch[1].trim()
    }
    edges.push(edge)
  }

  return edges
}

/**
 * Sanitize a DOT node ID for use as a Mermaid node ID.
 * Mermaid IDs can't contain hyphens, so replace with underscores.
 */
function sanitizeId(id) {
  return id.replace(/-/g, '_')
}

/**
 * Escape special characters in Mermaid labels.
 */
function escapeLabel(label) {
  return label.replace(/"/g, '&quot;')
}

export { extractNodes, extractEdges }
