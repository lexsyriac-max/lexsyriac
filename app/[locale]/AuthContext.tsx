'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import type { User, Session } from '@supabase/supabase-js'
import { createClient } from '../lib/supabase'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const locale = useLocale()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) return { error: error.message }

      const signedInUser = data.user

      if (!signedInUser) {
        return { error: 'Kullanıcı bilgisi alınamadı.' }
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', signedInUser.id)
        .single()

      if (profileError || !profile) {
        await supabase.auth.signOut()
        return { error: 'Kullanıcı profili bulunamadı.' }
      }

      if (profile.role === 'banned') {
        await supabase.auth.signOut()
        return { error: 'Bu hesap engellenmiştir.' }
      }

      router.refresh()

      if (profile.role === 'admin') {
        router.replace(`/${locale}/admin`)
      } else {
        router.replace(`/${locale}/dashboard`)
      }

      return { error: null }
    },
    [supabase, locale, router]
  )

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      })

      if (error) return { error: error.message }

      const newUser = data.user

      if (newUser) {
        await supabase.from('profiles').insert({
          id: newUser.id,
          email: newUser.email,
          full_name: fullName,
          role: 'member',
        })
      }

      return { error: null }
    },
    [supabase]
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.replace(`/${locale}`)
  }, [supabase, locale, router])

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}