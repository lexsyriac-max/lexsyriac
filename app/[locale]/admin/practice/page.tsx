'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { createClient } from '@/app/lib/supabase'
import AdminNav from '../components/AdminNav'

type PracticeGroup = {
  id: string
  slug: string
  label: string
  description: string | null
  sort_order: number | null
  is_active: boolean | null
}

export default function PracticePage() {
  const locale = useLocale()
  const supabase = createClient()

  const [groups, setGroups] = useState<PracticeGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadGroups()
  }, [])

  async function loadGroups() {
    setLoading(true)

    const { data, error } = await supabase
      .from('practice_groups')
      .select('id, slug, label, description, sort_order, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (!error && data) {
      setGroups(data)
    }

    setLoading(false)
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <AdminNav locale={locale} />

      <div
        style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, #0F3D47 100%)',
          padding: '2.5rem 0',
        }}
      >
        <div className="container">
          <p
            style={{
              color: 'rgba(255,255,255,0.68)',
              fontSize: '0.8rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '0.4rem',
            }}
          >
            Hızlı Öğrenme
          </p>

          <h1
            style={{
              color: 'white',
              fontFamily: 'var(--font-display)',
              fontSize: '2rem',
              fontWeight: 700,
              marginBottom: '0.6rem',
            }}
          >
            Pratik Gruplar
          </h1>

          <p
            style={{
              color: 'rgba(255,255,255,0.82)',
              maxWidth: 720,
              lineHeight: 1.7,
            }}
          >
            Temel kelime gruplarına hızlıca ulaş. Zamirler, sayılar, günler, aylar ve daha fazlasını
            düzenli başlıklar altında çalış.
          </p>
        </div>
      </div>

      <div className="container" style={{ padding: '2rem 1.5rem 3rem' }}>
        {loading ? (
          <div style={{ color: 'var(--color-text-muted)' }}>Yükleniyor...</div>
        ) : groups.length === 0 ? (
          <div style={{ color: 'var(--color-text-muted)' }}>Henüz pratik grup bulunmuyor.</div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/${locale}/practice/${group.slug}`}
                style={{ textDecoration: 'none' }}
              >
                <div
                  className="card"
                  style={{
                    padding: '1.25rem',
                    minHeight: 150,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--color-text-subtle)',
                        marginBottom: '0.35rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      Pratik Grubu
                    </div>

                    <h2
                      style={{
                        fontSize: '1.15rem',
                        color: 'var(--color-text)',
                        marginBottom: '0.5rem',
                      }}
                    >
                      {group.label}
                    </h2>

                    <p
                      style={{
                        fontSize: '0.88rem',
                        color: 'var(--color-text-muted)',
                        lineHeight: 1.6,
                      }}
                    >
                      {group.description || 'Bu başlık altındaki temel kelimeleri hızlıca çalış.'}
                    </p>
                  </div>

                  <div
                    style={{
                      marginTop: '1rem',
                      fontSize: '0.85rem',
                      color: 'var(--color-primary)',
                      fontWeight: 600,
                    }}
                  >
                    Gruba git →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}