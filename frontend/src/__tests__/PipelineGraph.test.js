import React from 'react'
import { render } from '@testing-library/react'
import PipelineGraph from '../components/PipelineGraph'

describe('PipelineGraph Component', () => {
  test('renders loading state', () => {
    const { container } = render(<PipelineGraph graphData="" loading={true} />)
    expect(container.querySelector('.loading-spinner')).toBeInTheDocument()
  })

  test('renders error state', () => {
    const { container } = render(
      <PipelineGraph graphData="" error="Test error" />
    )
    expect(container.querySelector('.error-message')).toBeInTheDocument()
  })

  test('displays mermaid diagram', async () => {
    const graphData = 'graph TD; A[Start] --> B[End];'
    const { container } = render(<PipelineGraph graphData={graphData} />)
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(container.querySelector('.mermaid-diagram-container')).toBeInTheDocument()
  })

  test('handles mode change', () => {
    const { container } = render(
      <PipelineGraph 
        graphData="graph TD; A[Start];" 
        graphMode="flow"
      />
    )
    expect(container.querySelector('.graph-mode-select')).toBeInTheDocument()
  })
})