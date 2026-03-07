/**
 * src/hooks/useApi.js
 *
 * Generic hook for making authenticated API calls from components.
 * Provides loading, error, and data state so you don't repeat this
 * pattern in every component.
 *
 * Usage:
 *   const { data, isLoading, error, execute } = useApi()
 *
 *   // Trigger a call:
 *   useEffect(() => { execute(() => api.get('/channels')) }, [])
 *
 *   // Or on a button click:
 *   <button onClick={() => execute(() => api.post('/channels', payload))}>
 *     Create Channel
 *   </button>
 */

import { useState, useCallback } from 'react'

export function useApi() {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * execute — runs an async function that returns an Axios response.
   *
   * @param {() => Promise} apiFn  A zero-argument function wrapping an api.* call.
   * @returns {Promise<any>}       The response data (also stored in `data` state).
   */
  const execute = useCallback(async (apiFn) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiFn()
      setData(response.data)
      return response.data
    } catch (err) {
      const message =
        err.response?.data?.detail ?? err.message ?? 'An error occurred'
      setError(typeof message === 'string' ? message : JSON.stringify(message))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { data, isLoading, error, execute }
}
