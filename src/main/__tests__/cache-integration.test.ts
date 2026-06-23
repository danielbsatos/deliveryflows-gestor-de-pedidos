import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryCache } from '../lib/cache'

describe('Cache Integration Scenarios', () => {
  let cache: MemoryCache

  beforeEach(() => {
    cache = new MemoryCache()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return cached data on subsequent calls within TTL', () => {
    const fetchData = vi.fn(() => [{ id: '1', name: 'Cat 1' }])

    function getData(): unknown[] {
      const cached = cache.get<unknown[]>('test-data')
      if (cached) return cached
      const data = fetchData()
      cache.set('test-data', data, 5000)
      return data
    }

    const first = getData()
    expect(fetchData).toHaveBeenCalledTimes(1)
    expect(first).toEqual([{ id: '1', name: 'Cat 1' }])

    const second = getData()
    expect(fetchData).toHaveBeenCalledTimes(1)
    expect(second).toEqual([{ id: '1', name: 'Cat 1' }])
  })

  it('should refetch after cache expires', () => {
    const fetchData = vi.fn(() => [{ id: '2', name: 'Cat 2' }])

    function getData(): unknown[] {
      const cached = cache.get<unknown[]>('test-data')
      if (cached) return cached
      const data = fetchData()
      cache.set('test-data', data, 1000)
      return data
    }

    getData()
    expect(fetchData).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1500)

    getData()
    expect(fetchData).toHaveBeenCalledTimes(2)
  })

  it('should invalidate cache on write operations', () => {
    cache.set('config', { key: 'value' }, 5000)
    expect(cache.has('config')).toBe(true)

    cache.delete('config')
    expect(cache.has('config')).toBe(false)
  })

  it('should handle concurrent cache keys independently', () => {
    cache.set('printers', ['p1', 'p2'], 2000)
    cache.set('categories', ['c1', 'c2'], 4000)
    cache.set('config', { setting: true }, 6000)

    vi.advanceTimersByTime(3000)

    expect(cache.get('printers')).toBeNull()
    expect(cache.get<string[]>('categories')).toEqual(['c1', 'c2'])
    expect(cache.get<object>('config')).toEqual({ setting: true })
  })
})
