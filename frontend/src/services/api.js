import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'
export const HUB_URL = `${API_BASE_URL}/portfolioHub`

const TOKEN_KEY = 'token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

/** True when a JWT exists and its `exp` claim is still in the future. */
export function hasValidToken() {
  const token = getToken()
  if (!token) return false

  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp !== 'number' || payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

/** Pulls a human-readable message out of an axios error (ProblemDetails, {message}, or Identity errors). */
export function getErrorMessage(error, fallback) {
  const data = error?.response?.data
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (data.message) return data.message
  if (data.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors).flat()[0]
    if (first) return first
  }
  if (Array.isArray(data) && data[0]?.description) return data[0].description
  return data.title ?? fallback
}

const api = axios.create({ baseURL: API_BASE_URL })

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthCall = error.config?.url?.includes('/api/Auth/')
    if (error.response?.status === 401 && !isAuthCall) {
      clearToken()
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  },
)

export default api
