import type { CacheEntry } from '../../shared/types'

/** Cache em memória com expiração por TTL (time-to-live). Thread-safe para uso no processo principal. */
export class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>()

  /** Armazena um valor com tempo de expiração em milissegundos. */
  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs
    })
  }

  /** Recupera um valor. Retorna `null` se a chave não existir ou estiver expirada. */
  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry.data
  }

  /** Verifica se a chave existe e não expirou. */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /** Remove todas as entradas do cache. */
  clear(): void {
    this.store.clear()
  }

  /** Remove uma entrada específica. Retorna `true` se a chave existia. */
  delete(key: string): boolean {
    return this.store.delete(key)
  }

  /** Número de entradas atualmente no cache (incluindo possivelmente expiradas). */
  get size(): number {
    return this.store.size
  }
}

export const cache = new MemoryCache()
