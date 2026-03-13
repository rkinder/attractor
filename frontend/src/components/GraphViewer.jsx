import { dotToMermaid } from '../utils/dotToMermaid'
import React from 'react'

function GraphViewer({ source }) {
  const [mermaidCode, setMermaidCode] = useState(null)
  
  React.useEffect(() => {
    if (source) {
      const code = dotToMermaid(source)
      setMermaidCode(code)
    }
  }, [source])
  
  return (
    <div>
      <pre>{mermaidCode}</pre>
    </div>
  )
}

export default GraphViewer