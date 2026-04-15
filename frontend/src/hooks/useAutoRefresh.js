import { useEffect, useRef } from 'react'

/**
 * useAutoRefresh — calls `callback` immediately and then every `intervalMs`.
 * Clears the interval when the component unmounts or dependencies change.
 *
 * @param {Function} callback  — the fetch/refresh function to call
 * @param {number}   intervalMs — polling interval in milliseconds (default 5 000)
 * @param {Array}    deps      — extra dependencies that reset the interval (e.g. [page, filter])
 */
export function useAutoRefresh(callback, intervalMs = 5000, deps = []) {
  const savedCallback = useRef(callback)

  // Keep ref current so the interval always calls the latest version
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    // Run immediately
    savedCallback.current()

    const id = setInterval(() => {
      savedCallback.current()
    }, intervalMs)

    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps])
}
