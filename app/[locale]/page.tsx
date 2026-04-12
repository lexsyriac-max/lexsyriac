'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import NavBar from './NavBar'
import { createClient } from '@/lib/supabase'

type Word = {
  id: string
  turkish: string | null
  english: string | null
  syriac: string | null
  transliteration: string | null
  word_type: string | null
  image_url?: string | null
  audio_url?: string | null
}

type HomeCategory = {
  id: string
  slug: string
  label: string
  description: string | null
  show_on_home: boolean | null
  home_order: number | null
}

export default function HomePage() {
  const t = useTranslations()
  const locale = useLocale()
  const router = useRouter()
  const supabase = createClient()

  const [search, setSearch] = useState('')
  const [words, setWords] = useState<Word[]>([])
  const [homeCategories, setHomeCategories] = useState<HomeCategory[]>([])
  const [loadingWords, setLoadingWords] = useState(true)
  const [loadingCategories, setLoadingCategories] = useState(true)

  useEffect(() => {
    loadWords()
    loadHomeCategories()
  }, [])

  async function loadWords() {
    setLoadingWords(true)

    const { data } = await supabase
      .from('words')
      .select('*')
      .order('turkish', { ascending: true })

    setWords(data || [])
    setLoadingWords(false)
  }

  async function loadHomeCategories() {
    setLoadingCategories(true)

    const { data } = await supabase
      .from('word_categories')
      .select('id, slug, label, description, show_on_home, home_order')
      .eq('show_on_home', true)
      .order('home_order', { ascending: true })

    setHomeCategories(data || [])
    setLoadingCategories(false)
  }

  const randomWords = useMemo(() => {
    if (!words.length) return []

    return [...words]
      .map((word) => ({ word, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .slice(0, 4)
      .map(({ word }) => word)
  }, [words])

  const stats = [
    { label: 'Kelime', value: String(words.length || 0), icon: '📚' },
    {
      label: 'Görsel',
      value: String(words.filter((w) => !!w.image_url).length || 0),
      icon: '🖼️',
    },
    {
      label: 'Ses',
      value: String(words.filter((w) => !!w.audio_url).length || 0),
      icon: '🔊',
    },
    { label: 'Modül', value: '6', icon: '🧩' },
  ]

  const modules = [
    {
      href: '/dictionary',
      title: t('nav.dictionary'),
      desc: 'Kelime havuzunda ara, filtrele ve detay gör.',
      icon: '📖',
    },
    {
      href: '/learn',
      title: t('nav.learn'),
      desc: 'Kelime öğrenme akışları ve görsel destekli çalışma alanı.',
      icon: '🎓',
    },
    {
      href: '/categories',
      title: 'Kategoriler',
      desc: 'Kelimeleri konu başlıklarına göre toplu incele.',
      icon: '🗂️',
    },
    {
      href: '/sentences',
      title: t('nav.sentences'),
      desc: 'Cümle kurma ve cümle çalışma modülleri için merkez alan.',
      icon: '✍️',
    },
    {
      href: '/rules',
      title: t('nav.rules'),
      desc: 'Dil kuralları ve öğretici açıklamaları incele.',
      icon: '📚',
    },
    {
      href: '/resources',
      title: t('nav.sources'),
      desc: 'Kaynaklar, notlar ve yardımcı içerikler.',
      icon: '🗃️',
    },
  
    {
      href: '/learn-sentences',
      icon: '🗣️',
      title: 'Cümle Öğren',
      desc: 'Doğrulanmış cümle havuzundan çoktan seçmeli ve boşluk doldurma çalışması.',
    },
]

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = search.trim()
    if (!q) return
    router.push(`/${locale}/dictionary?q=${encodeURIComponent(q)}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <NavBar />

      <section
        style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, #0F3D47 100%)',
          padding: '3rem 0 2.4rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: '-1.5rem',
            top: '-1rem',
            fontSize: '13rem',
            color: 'rgba(255,255,255,0.04)',
            fontFamily: 'var(--font-display)',
            lineHeight: 1,
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          ܣ
        </div>

        <div className="container" style={{ position: 'relative' }}>
          <div
            style={{
              maxWidth: 780,
              margin: '0 auto',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                color: 'rgba(255,255,255,0.62)',
                fontSize: '0.78rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: '0.7rem',
              }}
            >
              Üçdilli Sözlük Platformu
            </p>

            <h1
              style={{
                color: 'white',
                fontSize: 'clamp(1.9rem, 4vw, 3rem)',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                lineHeight: 1.12,
                marginBottom: '1rem',
              }}
            >
              Süryaniceyi düzenli,
              <br />
              <span style={{ color: '#F4C87A' }}>modüler ve öğretici biçimde çalış</span>
            </h1>

            <p
              style={{
                color: 'rgba(255,255,255,0.76)',
                maxWidth: 650,
                margin: '0 auto 1.4rem',
                lineHeight: 1.65,
                fontSize: '0.96rem',
              }}
            >
              Kelime ara, kategoriye göre incele, kuralları çalış ve ileride eklenecek
              kelime öğrenme, cümle kurma ve cümle öğrenme modüllerine tek merkezden ulaş.
            </p>

            <form
              onSubmit={handleSearchSubmit}
              style={{
                display: 'flex',
                gap: '0.5rem',
                maxWidth: 640,
                margin: '0 auto',
                flexWrap: 'wrap',
              }}
            >
              <input
                className="input"
                placeholder="Kelime ara... (TR / Süryanice / EN)"
                style={{
                  flex: 1,
                  minWidth: 220,
                  background: 'white',
                }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="btn btn-accent">
                Ara
              </button>
            </form>

            <div
              style={{
                fontSize: '0.8rem',
                color: 'rgba(255,255,255,0.7)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginTop: '1rem',
                marginBottom: '0.45rem',
              }}
            >
              Rastgele Kelimeler
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '0.6rem',
                maxWidth: 820,
                margin: '0 auto',
              }}
            >
              {randomWords.map((w) => (
                <div
                  key={w.id}
                  style={{
                    padding: '0.58rem 0.72rem',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    minHeight: 74,
                    transition: 'all 0.15s ease',
                    backdropFilter: 'blur(4px)',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      overflow: 'hidden',
                      flexShrink: 0,
                      background: 'rgba(255,255,255,0.12)',
                      border: '1px solid rgba(255,255,255,0.16)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {w.image_url ? (
                      <img
                        src={w.image_url}
                        alt={w.turkish || 'kelime'}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          color: 'rgba(255,255,255,0.65)',
                        }}
                      >
                        —
                      </span>
                    )}
                  </div>

                  <div style={{ minWidth: 0, lineHeight: 1.22 }}>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: 'white',
                        marginBottom: '0.05rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {w.turkish || '—'}
                    </div>

                    <div
                      style={{
                        fontSize: '0.95rem',
                        color: '#F4C87A',
                        fontFamily: 'var(--font-display)',
                        marginBottom: '0.05rem',
                      }}
                    >
                      {w.syriac || '—'}
                    </div>

                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'rgba(255,255,255,0.75)',
                      }}
                    >
                      {w.english || '—'}
                    </div>

                    <div
                      style={{
                        fontSize: '0.68rem',
                        color: 'rgba(255,255,255,0.55)',
                        marginTop: '0.05rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {w.transliteration || ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="container" style={{ padding: '2rem 1.5rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr)',
            gap: '1.75rem',
          }}
        >
          <section>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.15rem' }}>
              Modüller
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1rem',
              }}
            >
              {modules.map((module) => (
                <Link
                  key={module.href}
                  href={`/${locale}${module.href}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    className="card"
                    style={{
                      padding: '1.1rem',
                      minHeight: 118,
                      display: 'flex',
                      gap: '0.9rem',
                      alignItems: 'flex-start',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 10,
                        background: 'var(--color-primary-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: '1.35rem',
                      }}
                    >
                      {module.icon}
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: '0.96rem',
                          fontWeight: 700,
                          color: 'var(--color-text)',
                          marginBottom: '0.2rem',
                        }}
                      >
                        {module.title}
                      </div>

                      <div
                        style={{
                          fontSize: '0.82rem',
                          color: 'var(--color-text-muted)',
                          lineHeight: 1.5,
                        }}
                      >
                        {module.desc}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.15rem' }}>
              Kategoriler
            </h2>

            {loadingCategories ? (
              <div style={{ color: 'var(--color-text-muted)' }}>Yükleniyor...</div>
            ) : homeCategories.length === 0 ? (
              <div style={{ color: 'var(--color-text-muted)' }}>
                Ana sayfada gösterilecek kategori henüz seçilmedi.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                {homeCategories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/${locale}/categories/${category.slug}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div
                      className="card"
                      style={{
                        padding: '0.82rem 0.95rem',
                        textAlign: 'center',
                        fontWeight: 700,
                        color: 'var(--color-text)',
                        cursor: 'pointer',
                        minHeight: 0,
                      }}
                    >
                      {category.label}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

      </main>

      <section
        style={{
          padding: '1.2rem 0',
          background: '#FAFAF8',
          borderTop: '1px solid var(--color-border)',
          marginTop: '1.5rem',
        }}
      >
        <div className="container">
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '1.4rem',
              flexWrap: 'wrap',
              fontSize: '0.78rem',
              color: 'var(--color-text-muted)',
            }}
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <span style={{ fontSize: '0.9rem' }}>{stat.icon}</span>
                <span style={{ fontWeight: 700 }}>{stat.value}</span>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer
        style={{
          borderTop: '1px solid var(--color-border)',
          padding: '2rem 0',
          background: 'white',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            © 2026 LexSyriac — Üçdilli Sözlük
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-subtle)' }}>
            Türkçe · ܣܘܪܝܐ · English
          </div>
        </div>
      </footer>
    </div>
  )
}