'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import NavBar from '../NavBar'
import { createClient } from '@/lib/supabase'

type Category = {
  id: string
  slug: string
  label: string
  description: string | null
}

export default function CategoriesPage() {
  const locale = useLocale()
  const supabase = createClient()

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    setLoading(true)

    const { data } = await supabase
      .from('word_categories')
      .select('id, slug, label, description')
      .order('label', { ascending: true })

    setCategories(data || [])
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <NavBar />

      <main className="container" style={{ padding: '2rem 1.5rem' }}>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            marginBottom: '1.5rem',
          }}
        >
          Kategoriler
        </h1>

        {loading ? (
          <div style={{ color: 'var(--color-text-muted)' }}>
            Yükleniyor...
          </div>
        ) : categories.length === 0 ? (
          <div style={{ color: 'var(--color-text-muted)' }}>
            Henüz kategori yok.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/${locale}/categories/${cat.slug}`}
                style={{ textDecoration: 'none' }}
              >
                <div
                  className="card"
                  style={{
                    padding: '1rem',
                    cursor: 'pointer',
                    minHeight: 120,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '1rem',
                        color: 'var(--color-text)',
                        marginBottom: '0.35rem',
                      }}
                    >
                      {cat.label}
                    </div>

                    <div
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--color-text-muted)',
                        lineHeight: 1.5,
                      }}
                    >
                      {cat.description || 'Kategoriye ait kelimeleri incele'}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: '0.75rem',
                      fontSize: '0.8rem',
                      color: 'var(--color-primary)',
                      fontWeight: 600,
                    }}
                  >
                    Aç →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}