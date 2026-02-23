/**
 * P1: Pagination helper for API routes.
 * Backward-compatible: if no page/limit params, returns undefined (skip pagination).
 */

import { NextRequest } from 'next/server'

export interface PaginationParams {
    page: number
    limit: number
    from: number
    to: number
}

/**
 * Parse pagination params from request.
 * Returns null if no pagination params provided (backward-compatible).
 */
export function parsePagination(request: NextRequest, defaultLimit = 100): PaginationParams | null {
    const page = request.nextUrl.searchParams.get('page')
    const limit = request.nextUrl.searchParams.get('limit')

    // If neither provided, skip pagination (return all — existing behavior)
    if (!page && !limit) return null

    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1)
    const limitNum = Math.min(500, Math.max(1, parseInt(limit || String(defaultLimit), 10) || defaultLimit))
    const from = (pageNum - 1) * limitNum
    const to = from + limitNum - 1

    return { page: pageNum, limit: limitNum, from, to }
}

/**
 * Apply pagination to a Supabase query and add count header.
 * Returns the query with .range() applied if pagination is active.
 */
export function applyPagination(query: any, pagination: PaginationParams | null) {
    if (!pagination) return query
    return query.range(pagination.from, pagination.to)
}

/**
 * Create pagination response headers.
 */
export function paginationHeaders(pagination: PaginationParams | null, totalCount?: number): Record<string, string> {
    if (!pagination) return {}
    const headers: Record<string, string> = {
        'X-Page': String(pagination.page),
        'X-Limit': String(pagination.limit),
    }
    if (totalCount !== undefined) {
        headers['X-Total-Count'] = String(totalCount)
        headers['X-Total-Pages'] = String(Math.ceil(totalCount / pagination.limit))
    }
    return headers
}
