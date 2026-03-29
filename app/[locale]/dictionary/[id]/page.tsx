'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import NavBar from '../../NavBar'
import { useLocale } from 'next-intl'
import { createClient } from '../../../lib/supabase'

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

export default function WordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const locale = useLocale()
  const supabase = createClient()

  const [word, setWord] = useState<Word | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadWord()
  }, [])

  async function loadWord() {
    setLoading(true)
    setError('')

    const { id } = await params

    const { data, error } = await supabase
      .from('words')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      setError(error.message)
      setWord(null)
      setLoading(false)
      return
    }

    setWord(data)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <NavBar />

      <main>
        <div
          style={{
            background: 'linear-gradient(135deg, var(--color-primary) 0%, #0F3D47 100%)',
            padding: '2.5rem 0',
          }}
        >
          <div className="container">
            <p
              style={{
                color: 'rgba(255,255,255,0.72)',
                fontSize: '0.82rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '0.45rem',
              }}
            >
              Kelime Kimliği
            </p>

            <h1
              style={{
                color: 'white',
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                fontWeight: 700,
                marginBottom: '0.5rem',
              }}
            >
              Kelime Detayı
            </h1>

            <p
              style={{
                color: 'rgba(255,255,255,0.86)',
                fontSize: '0.98rem',
                lineHeight: 1.7,
              }}
            >
              Bu sayfada kelimenin görsel, işitsel ve yazılı tüm temel bilgilerini birlikte görebilirsin.
            </p>
          </div>
        </div>

        <div className="container" style={{ padding: '2rem 1.5rem 3rem' }}>
          {loading ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              Yükleniyor...
            </div>
          ) : error ? (
            <div
              className="card"
              style={{
                padding: '1.25rem',
                color: '#A94442',
                border: '1px solid #E5C7C7',
                background: '#FFF7F7',
              }}
            >
              {error}
            </div>
          ) : !word ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              Kelime bulunamadı.
            </div>
          ) : (
            <div
              className="mobile-stack"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(280px, 420px) minmax(0, 1fr)',
                gap: '1.25rem',
                alignItems: 'start',
              }}
            >
              <div className="card" style={{ padding: '1rem' }}>
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '4/3',
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: '1px solid var(--color-border)',
                    background: '#F2EFE9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {word.image_url ? (
                    <img
                      src={word.image_url}
                      alt={word.turkish || 'kelime'}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        color: 'var(--color-text-muted)',
                        fontSize: '0.9rem',
                      }}
                    >
                      Görsel yok
                    </span>
                  )}
                </div>

                {word.audio_url && (
                  <div style={{ marginTop: '1rem' }}>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--color-text-muted)',
                        marginBottom: '0.4rem',
                      }}
                    >
                      Ses Kaydı
                    </div>
                    <audio controls style={{ width: '100%' }}>
                      <source src={word.audio_url} />
                    </audio>
                  </div>
                )}
              </div>

              <div className="card" style={{ padding: '1.25rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    marginBottom: '1rem',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: 'var(--color-text)',
                        marginBottom: '0.25rem',
                      }}
                    >
                      {word.turkish || '—'}
                    </div>

                    <div
                      className="text-syriac"
                      style={{
                        fontSize: '2rem',
                        color: 'var(--color-primary)',
                        marginBottom: '0.25rem',
                      }}
                    >
                      {word.syriac || '—'}
                    </div>

                    <div
                      style={{
                        fontSize: '1rem',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {word.english || '—'}
                    </div>
                  </div>

                  <span className="badge">{word.word_type || 'diğer'}</span>
                </div>

                <div style={{ display: 'grid', gap: '0.85rem' }}>
                  <DetailRow label="Türkçe" value={word.turkish || '—'} />
                  <DetailRow label="Süryanice" value={word.syriac || '—'} syriac />
                  <DetailRow label="İngilizce" value={word.english || '—'} />
                  <DetailRow label="Transliterasyon" value={word.transliteration || '—'} />
                  <DetailRow label="Kelime Türü" value={word.word_type || '—'} />
                </div>

                <div
                  className="btn-group-mobile"
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                    marginTop: '1.25rem',
                  }}
                >
                  <Link href={`/${locale}/dictionary`} className="btn btn-secondary">
                    Sözlüğe Dön
                  </Link>

                  <Link href={`/${locale}/learn`} className="btn btn-secondary">
                    Öğrenme Alanı
                  </Link>

                  <Link href={`/${locale}/sentences`} className="btn btn-primary">
                    Cümle Alanı
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function DetailRow({
  label,
  value,
  syriac,
}: {
  label: string
  value: string
  syriac?: boolean
}) {
  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        padding: '0.85rem 1rem',
        background: 'var(--color-bg-card)',
      }}
    >
      <div
        style={{
          fontSize: '0.8rem',
          color: 'var(--color-text-muted)',
          marginBottom: '0.2rem',
        }}
      >
        {label}
      </div>
      <div
        className={syriac ? 'text-syriac' : ''}
        style={{
          fontSize: syriac ? '1.15rem' : '0.95rem',
          color: 'var(--color-text)',
        }}
      >
        {value}
      </div>
    </div>
  )
}