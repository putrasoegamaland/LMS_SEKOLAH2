'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { AuthUser } from '@/lib/types'

interface AuthContextType {
    user: AuthUser | null
    loading: boolean
    login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
    logout: () => Promise<void>
    refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [loading, setLoading] = useState(true)

    const refreshUser = async () => {
        try {
            const res = await fetch('/api/auth/me')
            if (res.ok) {
                const data = await res.json()
                setUser(data.user)
            } else {
                setUser(null)
            }
        } catch {
            setUser(null)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        refreshUser()
    }, [])

    const login = async (username: string, password: string) => {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })

            const data = await res.json()

            if (res.ok) {
                setUser(data.user)
                return { success: true }
            } else {
                return { success: false, error: data.error }
            }
        } catch {
            return { success: false, error: 'Terjadi kesalahan' }
        }
    }

    const logout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' })
            setUser(null)
        } catch (error) {
            console.error('Logout error:', error)
        }
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
