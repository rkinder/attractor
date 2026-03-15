import axios from 'axios'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add authentication token if available
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access - clear token
      localStorage.removeItem('authToken')
    }
    return Promise.reject(error)
  }
)

// API Functions
export const getPipelines = async (params = {}) => {
  try {
    const response = await api.get('/pipelines', { params })
    return response.data
  } catch (error) {
    if (error.response?.status === 404) {
      return []
    }
    throw error
  }
}

export const getPipeline = async (pipelineId) => {
  try {
    const response = await api.get(`/pipelines/${pipelineId}`)
    return response.data
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error('Pipeline not found')
    }
    throw error
  }
}

export const getDecisions = async (pipelineId, params = {}) => {
  try {
    const response = await api.get(`/pipelines/${pipelineId}/decisions`, { params })
    return response.data.decisions || []
  } catch (error) {
    if (error.response?.status === 404) {
      return []
    }
    throw error
  }
}

// Export axios instance for advanced usage
export default api