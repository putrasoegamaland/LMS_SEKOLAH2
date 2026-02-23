/**
 * P2: Lightweight in-memory fetch cache for frontend.
 * Drop-in replacement for fetch() that caches GET responses.
 * No external dependencies required.
 */

interface CacheEntry {
    data: any
    timestamp: number
}

const cache = new Map<string, CacheEntry>()
const DEFAULT_TTL = 30_000 // 30 seconds
const pendingRequests = new Map<string, Promise<any>>()

/**
 * Fetch with in-memory caching. Deduplicates concurrent requests.
 * @param url - API endpoint URL
 * @param ttl - Cache TTL in milliseconds (default 30s)
 * @returns Parsed JSON response
 */
export async function cachedFetch<T = any>(url: string, ttl = DEFAULT_TTL): Promise<T> {
    // Check cache
    const cached = cache.get(url)
    if (cached && Date.now() - cached.timestamp < ttl) {
        return cached.data as T
    }

    // Deduplicate concurrent requests for the same URL
    if (pendingRequests.has(url)) {
        return pendingRequests.get(url)!
    }

    const promise = fetch(url)
        .then(async (res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            cache.set(url, { data, timestamp: Date.now() })
            pendingRequests.delete(url)
            return data
        })
        .catch((err) => {
            pendingRequests.delete(url)
            throw err
        })

    pendingRequests.set(url, promise)
    return promise
}

/**
 * Invalidate cached entries matching a URL prefix.
 * Call after mutations (POST/PUT/DELETE) to refresh data.
 * @param urlPrefix - URL prefix to match (e.g., '/api/students')
 */
export function invalidateCache(urlPrefix?: string) {
    if (!urlPrefix) {
        cache.clear()
        return
    }
    for (const key of cache.keys()) {
        if (key.startsWith(urlPrefix) || key.includes(urlPrefix)) {
            cache.delete(key)
        }
    }
}

/**
 * Custom React hook for cached data fetching.
 * Usage: const { data, loading, error, refetch } = useCachedFetch('/api/students')
 */
export function createFetchUrl(base: string, params?: Record<string, string | number | boolean | undefined | null>) {
    if (!params) return base
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            searchParams.set(key, String(value))
        }
    })
    const qs = searchParams.toString()
    return qs ? `${base}?${qs}` : base
}
