'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import NavBar from '../../NavBar'

type Category = {
  id: string
  label: string
  slug: string
  description: string | null
  teaching_note: string | null
}

type Word = {
  id: string
  turkish: string
  english: string
  syriac: string
  transliteration: string
  word_type: string | null
  image_url: string | null
  audio_url: string | null
}

export default function CategoryTableClient({
  category,
  words,
}: {
  category: Category
  words: Word[]
}) {
  const locale = useLocale()
  const [query, setQuery] = useState('')

  const filteredWords = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return words

    return words.filter((word) => {
      return (
        word.turkish?.toLowerCase().includes(q) ||
        word.english?.toLowerCase().includes(q) ||
        word.syriac?.toLowerCase().includes(q) ||
        word.transliteration?.toLowerCase().includes(q) ||
        word.word_type?.toLowerCase().includes(q)
      )
    })
  }, [words, query])

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <NavBar />

      <section
        style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, #0F3D47 100%)',
          padding: '2.35rem 0',
        }}
      >
        <div className="container">
          <div style={{ marginBottom: '0.55rem' }}>
            <Link
              href={`/${locale}/categories`}
              style={{
                color: 'rgba(255,255,255,0.78)',
                textDecoration: 'none',
                fontSize: '0.88rem',
              }}
            >
              ← Kategorilere Dön
            </Link>
          </div>

          <p
            style={{
              color: 'rgba(255,255,255,0.68)',
              fontSize: '0.8rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '0.35rem',
            }}
          >
            Kategori
          </p>

          <h1
            style={{
              color: 'white',
              fontFamily: 'var(--font-display)',
              fontSize: '2rem',
              fontWeight: 700,
              marginBottom: '0.55rem',
            }}
          >
            {category.label}
          </h1>

          <p
            style={{
              color: 'rgba(255,255,255,0.82)',
              maxWidth: 760,
              lineHeight: 1.7,
            }}
          >
            {category.description || 'Bu kategoriye ait kelimeler listeleniyor.'}
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: '2rem 1.5rem 3rem' }}>
        {category.teaching_note && (
          <div
            className="card"
            style={{
              padding: '1rem 1.1rem',
              marginBottom: '1rem',
              background: '#FFFDF7',
              border: '1px solid #E8DFC2',
            }}
          >
            <h2
              style={{
                fontSize: '1.02rem',
                marginBottom: '0.7rem',
                color: 'var(--color-text)',
              }}
            >
              Kategori Notu
            </h2>

            <div
              style={{
                color: 'var(--color-text)',
                lineHeight: 1.75,
                whiteSpace: 'pre-wrap',
                fontSize: '0.93rem',
              }}
            >
              {category.teaching_note}
            </div>
          </div>
        )}

        <div className="card" style={{ padding: '1rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
              marginBottom: '1rem',
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '1.06rem',
                  color: 'var(--color-text)',
                  marginBottom: '0.2rem',
                }}
              >
                Kelime Listesi
              </h2>

              <div
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--color-text-muted)',
                }}
              >
                Toplam: {filteredWords.length}
              </div>
            </div>

            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Türkçe, İngilizce, Süryanice veya tür ara..."
              style={{ maxWidth: 340, width: '100%' }}
            />
          </div>

          {filteredWords.length === 0 ? (
            <div
              style={{
                color: 'var(--color-text-muted)',
                padding: '1rem 0.25rem',
              }}
            >
              Eşleşen kelime bulunamadı.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                  minWidth: 920,
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: '#F7F7F5',
                    }}
                  >
                    <th style={{ ...TH, borderTopLeftRadius: 10 }}>Görsel</th>
                    <th style={TH}>Türkçe</th>
                    <th style={TH}>Süryanice</th>
                    <th style={TH}>İngilizce</th>
                    <th style={TH}>Transliterasyon</th>
                    <th style={TH}>Tür</th>
                    <th style={{ ...TH, borderTopRightRadius: 10 }}>Ses</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredWords.map((word, index) => (
                    <tr
                      key={word.id}
                      style={{
                        background: index % 2 === 0 ? 'white' : '#FCFCFA',
                      }}
                    >
                      <td style={TD}>
                        <div
                          style={{
                            width: 58,
                            height: 44,
                            borderRadius: 8,
                            overflow: 'hidden',
                            background: '#F4F1EA',
                            border: '1px solid var(--color-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {word.image_url ? (
                            <img
                              src={word.image_url}
                              alt={word.turkish}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          ) : (
                            <span
                              style={{
                                fontSize: '0.72rem',
                                color: '#888',
                              }}
                            >
                              —
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={TDStrong}>
                        <div style={{ lineHeight: 1.3 }}>{word.turkish}</div>
                      </td>

                      <td style={TDSyriac}>
                        <div style={{ lineHeight: 1.35 }}>{word.syriac}</div>
                      </td>

                      <td style={TD}>
                        <div style={{ lineHeight: 1.35 }}>{word.english}</div>
                      </td>

                      <td style={TDMuted}>
                        <div style={{ lineHeight: 1.35 }}>{word.transliteration}</div>
                      </td>

                      <td style={TD}>
                        <span className="badge badge-primary">
                          {word.word_type || 'kelime'}
                        </span>
                      </td>

                      <td style={TD}>
                        {word.audio_url ? (
                          <audio controls style={{ maxWidth: 180, height: 32 }}>
                            <source src={word.audio_url} />
                          </audio>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.82rem',
                              color: '#888',
                            }}
                          >
                            Ses yok
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

const TH: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.9rem 0.8rem',
  fontSize: '0.81rem',
  color: 'var(--color-text-muted)',
  fontWeight: 700,
  letterSpacing: '0.03em',
  borderBottom: '1px solid var(--color-border)',
}

const TD: React.CSSProperties = {
  padding: '0.9rem 0.8rem',
  fontSize: '0.92rem',
  color: 'var(--color-text)',
  verticalAlign: 'middle',
  borderBottom: '1px solid var(--color-border)',
}

const TDStrong: React.CSSProperties = {
  ...TD,
  fontWeight: 700,
}

const TDSyriac: React.CSSProperties = {
  ...TD,
  fontFamily: 'var(--font-display)',
  fontSize: '1rem',
  color: 'var(--color-primary)',
}

const TDMuted: React.CSSProperties = {
  ...TD,
  color: 'var(--color-text-muted)',
}