import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { hasValidToken } from '../services/api'

/**
 * Returns `goTo(path, state)`: navigates straight to `path` when signed in,
 * otherwise to /login remembering where the user wanted to go (and why),
 * so the login page can send them back afterwards.
 */
export default function useAuthGate() {
  const navigate = useNavigate()

  return useCallback(
    (path, state) => {
      if (hasValidToken()) {
        navigate(path, { state })
      } else {
        navigate('/login', { state: { from: { pathname: path, state } } })
      }
    },
    [navigate],
  )
}
