import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryCache } from '../lib/cache'

describe('MemoryCache', () => {
  let cache: MemoryCache

  beforeEach(() => {
    cache = new MemoryCache()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should store and retrieve a value', () => {
    cache.set('key1', { foo: 'bar' }, 5000)
    expect(cache.get('key1')).toEqual({ foo: 'bar' })
  })

  it('should return null for a missing key', () => {
    expect(cache.get('nonexistent')).toBeNull()
  })

  it('should expire entries after TTL', () => {
    cache.set('key1', 'value1', 1000)
    vi.advanceTimersByTime(1500)
    expect(cache.get('key1')).toBeNull()
  })

  it('should return data before TTL expires', () => {
    cache.set('key1', 'value1', 2000)
    vi.advanceTimersByTime(1500)
    expect(cache.get('key1')).toBe('value1')
  })

  it('should indicate presence with has()', () => {
    cache.set('key1', 'value1', 5000)
    expect(cache.has('key1')).toBe(true)
    cache.delete('key1')
    expect(cache.has('key1')).toBe(false)
  })

  it('should clear all entries', () => {
    cache.set('a', 1, 5000)
    cache.set('b', 2, 5000)
    cache.clear()
    expect(cache.size).toBe(0)
    expect(cache.get('a')).toBeNull()
  })

  it('should delete a specific entry', () => {
    cache.set('a', 1, 5000)
    cache.set('b', 2, 5000)
    const result = cache.delete('a')
    expect(result).toBe(true)
    expect(cache.get('a')).toBeNull()
    expect(cache.get('b')).toEqual(2)
  })

  it('should return false when deleting nonexistent key', () => {
    expect(cache.delete('nonexistent')).toBe(false)
  })

  it('should handle multiple data types', () => {
    cache.set('string', 'hello', 5000)
    cache.set('number', 42, 5000)
    cache.set('object', { nested: { value: true } }, 5000)
    cache.set('array', [1, 2, 3], 5000)

    expect(cache.get<string>('string')).toBe('hello')
    expect(cache.get<number>('number')).toBe(42)
    expect(cache.get<object>('object')).toEqual({ nested: { value: true } })
    expect(cache.get<number[]>('array')).toEqual([1, 2, 3])
  })

  it('should track size correctly', () => {
    expect(cache.size).toBe(0)
    cache.set('a', 1, 5000)
    expect(cache.size).toBe(1)
    cache.set('b', 2, 5000)
    expect(cache.size).toBe(2)
    cache.clear()
    expect(cache.size).toBe(0)
  })

  it('should not return expired entries via has()', () => {
    cache.set('key1', 'value1', 1000)
    vi.advanceTimersByTime(1001)
    expect(cache.has('key1')).toBe(false)
  })

  it('should overwrite existing key with new TTL', () => {
    cache.set('key1', 'old', 1000)
    vi.advanceTimersByTime(500)
    cache.set('key1', 'new', 2000)
    vi.advanceTimersByTime(1500)
    expect(cache.get('key1')).toBe('new')
  })
})
