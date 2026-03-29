'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import NavBar from './NavBar'
import { createClient } from '../lib/supabase'

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

  const hourlyWord = useMemo(() => {
    if (!words.length) return null
    const hour = new Date().getHours()
    const index = hour % words.length
    return words[index]
  }, [words])

  const randomTags = useMemo(() => {
    if (!words.length) return []

    const shuffled = [...words].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, 5)
  }, [words])

  const stats = [
    { label: 'Toplam Kelime', value: String(words.length || 0), icon: '📚' },
    {
      label: 'Görselli Kelime',
      value: String(words.filter((w) => !!w.image_url).length || 0),
      icon: '🖼️',
    },
    {
      label: 'Sesli Kelime',
      value: String(words.filter((w) => !!w.audio_url).length || 0),
      icon: '🔊',
    },
    { label: 'Dil Modülleri', value: '6', icon: '🗂️' },
  ]

  const quickLinks = [
    { href: '/dictionary', label: t('nav.dictionary'), desc: t('cards.dictionary'), icon: '🔍', color: 'teal' },
    { href: '/learn', label: t('nav.learn'), desc: t('cards.learn'), icon: '🎴', color: 'amber' },
    { href: '/practice', label: 'Pratik', desc: 'Kategorilere göre hızlı öğrenme alanı', icon: '🧩', color: 'green' },
    { href: '/sentences', label: t('nav.sentences'), desc: t('cards.sentences'), icon: '✍️', color: 'green' },
    { href: '/rules', label: t('nav.rules'), desc: t('cards.rules'), icon: '📖', color: 'teal' },
    { href: '/resources', label: t('nav.sources'), desc: t('cards.sources'), icon: '🗃️', color: 'amber' },
    { href: '/stats', label: t('nav.stats'), desc: t('cards.stats'), icon: '📊', color: 'green' },
  ]

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = search.trim()
    if (!q) return
    router.push(`/${locale}/dictionary?q=${encodeURIComponent(q)}`)
  }

  function goToTaggedSearch(tag: string) {
    router.push(`/${locale}/dictionary?q=${encodeURIComponent(tag)}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <NavBar />

      <section
        style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, #0F3D47 100%)',
          padding: '3.25rem 0 2.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: '-2rem',
            top: '-1rem',
            fontSize: '14rem',
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
              maxWidth: 760,
              margin: '0 auto',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                color: 'rgba(255,255,255,0.6)',
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
                fontSize: 'clamp(1.85rem, 4vw, 2.9rem)',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                lineHeight: 1.15,
                marginBottom: '1rem',
              }}
            >
              Süryaniceyi keşfet,
              <br />
              <span style={{ color: '#F4C87A' }}>kelime kelime öğren</span>
            </h1>

            <p
              style={{
                color: 'rgba(255,255,255,0.76)',
                maxWidth: 620,
                margin: '0 auto 1.5rem',
                lineHeight: 1.65,
                fontSize: '0.96rem',
              }}
            >
              Türkçe, Süryanice ve İngilizce arasında arama yap, kelime hazneni geliştir,
              kuralları incele ve dil öğrenme akışını tek bir merkezden yönet.
            </p>

            <form
              onSubmit={handleSearchSubmit}
              style={{
                display: 'flex',
                gap: '0.5rem',
                maxWidth: 620,
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
                marginTop: '0.9rem',
                display: 'flex',
                gap: '0.5rem',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {randomTags.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => goToTaggedSearch(w.turkish || w.english || '')}
                  style={{
                    padding: '0.25rem 0.75rem',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 999,
                    fontSize: '0.8125rem',
                    color: 'rgba(255,255,255,0.75)',
                    cursor: 'pointer',
                  }}
                >
                  {w.turkish || w.english}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          padding: '1.5rem 0',
          background: 'white',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1rem',
            }}
          >
            {stats.map((stat) => (
              <div key={stat.label} style={{ textAlign: 'center', padding: '0.5rem' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{stat.icon}</div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: 'var(--color-primary)',
                  }}
                >
                  {stat.value}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                  {stat.label}
                </div>
              </div>
            ))}
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
          <div>
            <h2 style={{ marginBottom: '1.1rem', fontSize: '1.2rem' }}>
              Öne Çıkan Kategoriler
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
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1rem',
                }}
              >
                {homeCategories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/${locale}/practice/${category.slug}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div
                      className="card"
                      style={{
                        padding: '1.1rem',
                        minHeight: 145,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
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
                          Kategori
                        </div>

                        <div
                          style={{
                            fontSize: '1.06rem',
                            fontWeight: 700,
                            color: 'var(--color-text)',
                            marginBottom: '0.45rem',
                          }}
                        >
                          {category.label}
                        </div>

                        <div
                          style={{
                            fontSize: '0.87rem',
                            color: 'var(--color-text-muted)',
                            lineHeight: 1.55,
                          }}
                        >
                          {category.description || 'Bu kategoriye ait kelimeleri hızlıca çalış.'}
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: '1rem',
                          fontSize: '0.84rem',
                          color: 'var(--color-primary)',
                          fontWeight: 600,
                        }}
                      >
                        Kategoriye git →
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 style={{ marginBottom: '1.1rem', fontSize: '1.2rem' }}>
              {t('home.quickAccess')}
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1rem',
              }}
            >
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={`/${locale}${link.href}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    className="card"
                    style={{
                      padding: '1.25rem',
                      cursor: 'pointer',
                      display: 'flex',
                      gap: '1rem',
                      alignItems: 'flex-start',
                      minHeight: 110,
                    }}
                  >
                    <div
                      style={{
                        fontSize: '1.5rem',
                        width: 44,
                        height: 44,
                        background:
                          link.color === 'teal'
                            ? 'var(--color-primary-light)'
                            : link.color === 'amber'
                            ? 'var(--color-accent-light)'
                            : '#EAF4EE',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {link.icon}
                    </div>

                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '0.9375rem',
                          color: 'var(--color-text)',
                          marginBottom: '0.2rem',
                        }}
                      >
                        {link.label}
                      </div>
                      <div
                        style={{
                          fontSize: '0.8125rem',
                          color: 'var(--color-text-muted)',
                          lineHeight: 1.4,
                        }}
                      >
                        {link.desc}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 style={{ marginBottom: '1.1rem', fontSize: '1.2rem' }}>
              Saatlik Kelime
            </h2>

            <div
              className="card"
              style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, var(--color-primary-light), white)',
                borderColor: 'rgba(26, 95, 110, 0.15)',
                maxWidth: 520,
              }}
            >
              {loadingWords ? (
                <div style={{ color: 'var(--color-text-muted)' }}>Yükleniyor...</div>
              ) : !hourlyWord ? (
                <div style={{ color: 'var(--color-text-muted)' }}>Kelime bulunamadı.</div>
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '1rem',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span className="badge badge-primary">
                      {hourlyWord.word_type || 'kelime'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>
                      Saatlik seçim
                    </span>
                  </div>

                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '16/9',
                      borderRadius: 12,
                      overflow: 'hidden',
                      border: '1px solid var(--color-border)',
                      background: '#F2EFE9',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {hourlyWord.image_url ? (
                      <img
                        src={hourlyWord.image_url}
                        alt={hourlyWord.turkish || 'kelime'}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                        Görsel yok
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: '2.5rem',
                      color: 'var(--color-primary)',
                      fontFamily: 'var(--font-display)',
                      marginBottom: '0.75rem',
                      textAlign: 'center',
                    }}
                  >
                    {hourlyWord.syriac || '—'}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      justifyContent: 'center',
                      flexWrap: 'wrap',
                      marginBottom: '1rem',
                    }}
                  >
                    <span className="badge badge-accent">{hourlyWord.turkish || '—'}</span>
                    <span
                      className="badge"
                      style={{
                        background: '#EAF4EE',
                        color: '#2D7A4F',
                        border: 'none',
                      }}
                    >
                      {hourlyWord.english || '—'}
                    </span>
                  </div>

                  <div
                    style={{
                      padding: '0.75rem',
                      background: 'rgba(26, 95, 110, 0.06)',
                      borderRadius: 8,
                      fontSize: '0.875rem',
                      color: 'var(--color-text-muted)',
                      textAlign: 'center',
                    }}
                  >
                    {hourlyWord.transliteration || 'Transliterasyon yok'}
                  </div>

                  <Link
                    href={`/${locale}/dictionary/${hourlyWord.id}`}
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '1rem' }}
                  >
                    Daha fazla öğren
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer
        style={{
          borderTop: '1px solid var(--color-border)',
          padding: '2rem 0',
          background: 'white',
          marginTop: '2rem',
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