import React, { useState } from 'react'
import PipelineTimeline from './PipelineTimeline'

function TimelineViewer({ pipelineId, autoRefresh = true }) {
  const [currentTime, setCurrentTime] = useState(new Date())

  // Auto-update current time every second
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div>
      <h3>Pipeline Execution Timeline</h3>
      <PipelineTimeline
        pipelineId={pipelineId}
        autoRefresh={autoRefresh}
        onEventClick={(event) => {
          console.log('Event:', event)
          // You can trigger notifications, analytics, etc.
        }}
        onSelectStage={(stage) => {
          console.log('Stage:', stage)
          // You can expand stage details, etc.
        }}
      />
    </div>
  )
}

export default TimelineViewer