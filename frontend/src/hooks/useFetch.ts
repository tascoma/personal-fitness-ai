import { useCallback, useEffect, useState } from 'react'

interface FetchState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: true, error: null })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null })
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ data: null, loading: false, error: err.message })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ...deps])

  const refetch = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    setVersion((v) => v + 1)
  }, [])

  return { ...state, refetch }
}
