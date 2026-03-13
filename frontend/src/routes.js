import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PipelineListView from './pages/PipelineListView'
import PipelineDetailPage from './pages/PipelineDetailPage'
import { createBrowserRouter } from 'react-router-dom'

/**
 * Route definitions
 */
const routes = [
  {
    path: '/',
    element: <Navigate to="/pipelines" replace />,
  },
  {
    path: '/pipelines',
    element: <PipelineListView />,
    children: [],
  },
  {
    path: '/pipelines/:pipelineId',
    element: <PipelineDetailPage />,
  },
  {
    path: '*',
    element: <Navigate to="/pipelines" replace />,
  },
]

/**
 * Create router
 */
export const router = createBrowserRouter(routes)

/**
 * Router component
 */
export function Router({ children }) {
  return <BrowserRouter>{children}</BrowserRouter>
}

export default routes