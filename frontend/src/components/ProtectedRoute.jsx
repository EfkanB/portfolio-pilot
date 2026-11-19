import { Navigate, useLocation } from 'react-router-dom'
import { clearToken, hasValidToken } from '../services/api'

export default function ProtectedRoute({ children }) {
  const location = useLocation()

  if (!hasValidToken()) {
    clearToken()
    // Remember the target so Login can send the user back after signing in.
    return <Navigate to="/login" replace state={{ from: { pathname: location.pathname, state: location.state } }} />
  }
  return children
}
