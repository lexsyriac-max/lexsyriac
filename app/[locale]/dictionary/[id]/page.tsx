'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import NavBar from '../../NavBar'
import { useLocale } from 'next-intl'
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

type SourceMatch = {
  id: string
  match_text: string
  document_id: string
  chunk_id: string
  source_documents: {
    title: string
    file_type: string
  }
  source_text_chunks: {
    content: string
    page_number: number
  }
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
  const [sources, setSources] = useState<SourceMatch[]>([])
  const [sourcesLoading, setSourcesLoading] = useState(false)

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

    // Kaynak eşleşmelerini yükle
    loadSources(id)
  }

  async function loadSources(wordId: string) {
    setSourcesLoading(true)

    const { data, error } = await supabase
      .from('source_word_index')
      .select(`
        id,
        match_text,
        document_id,
        chunk_id,
        source_documents ( title, file_type ),
        source_text_chunks ( content, page_number )
      `)
      .eq('word_id', wordId)
      .limit(10)

    if (!error && data) {
      setSources(data as unknown as SourceMatch[])
    }

    setSourcesLoading(false)
  }

  // Chunk içinde eşleşen kelimeyi vurgula
  function highlightMatch(content: string, matchText: string) {
    if (!matchText) return content
    const idx = content.toLowerCase().indexOf(matchText.toLowerCase())
    if (idx === -1) return content

    // Eşleşme etrafında 120 karakter göster
    const start = Math.max(0, idx - 60)
    const end = Math.min(content.length, idx + matchText.length + 60)
    const snippet = (start > 0 ? '...' : '') + content.slice(start, end) + (end < content.length ? '...' : '')

    const matchIdx = snippet.toLowerCase().indexOf(matchText.toLowerCase())
    if (matchIdx === -1) return snippet

    return (
      snippet.slice(0, matchIdx) +
      `<mark style="background:#FFF3B0;padding:0 2px;border-radius:3px;">${snippet.slice(matchIdx, matchIdx + matchText.length)}</mark>` +
      snippet.slice(matchIdx + matchText.length)
    )
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
            <>
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
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                        Görsel yok
                      </span>
                    )}
                  </div>

                  {word.audio_url && (
                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>
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
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.25rem' }}>
                        {word.turkish || '—'}
                      </div>
                      <div className="text-syriac" style={{ fontSize: '2rem', color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
                        {word.syriac || '—'}
                      </div>
                      <div style={{ fontSize: '1rem', color: 'var(--color-text-muted)' }}>
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
                    style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.25rem' }}
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

              {/* Kaynak Havuzu Bölümü */}
              <div style={{ marginTop: '1.5rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.875rem',
                  }}
                >
                  <h2
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: 'var(--color-text)',
                    }}
                  >
                    📂 Kaynak Havuzu
                  </h2>
                  {!sourcesLoading && (
                    <span
                      style={{
                        background: sources.length > 0 ? 'var(--color-primary)' : 'var(--color-border)',
                        color: sources.length > 0 ? 'white' : 'var(--color-text-muted)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.5rem',
                        borderRadius: 20,
                      }}
                    >
                      {sources.length}
                    </span>
                  )}
                </div>

                {sourcesLoading ? (
                  <div className="card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    Kaynaklar aranıyor...
                  </div>
                ) : sources.length === 0 ? (
                  <div
                    className="card"
                    style={{
                      padding: '1.5rem',
                      textAlign: 'center',
                      color: 'var(--color-text-muted)',
                      fontSize: '0.9rem',
                      border: '1px dashed var(--color-border)',
                      background: 'transparent',
                    }}
                  >
                    Bu kelime henüz hiçbir kaynakta bulunamadı.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {sources.map((src) => (
                      <div
                        key={src.id}
                        className="card"
                        style={{ padding: '1rem 1.25rem', borderLeft: '3px solid var(--color-primary)' }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '0.5rem',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                          }}
                        >
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-primary)' }}>
                            📄 {src.source_documents?.title || 'Kaynak'}
                          </span>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <span
                              style={{
                                background: 'var(--color-bg-subtle, #f0f0f0)',
                                padding: '0.15rem 0.4rem',
                                borderRadius: 5,
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                              }}
                            >
                              {src.source_documents?.file_type || ''}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                              Sayfa {src.source_text_chunks?.page_number || 1}
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: '0.85rem',
                            color: 'var(--color-text)',
                            lineHeight: 1.65,
                            background: 'var(--color-bg-subtle, #f8f8f8)',
                            borderRadius: 8,
                            padding: '0.6rem 0.875rem',
                          }}
                          dangerouslySetInnerHTML={{
                            __html: highlightMatch(
                              src.source_text_chunks?.content || '',
                              src.match_text
                            ),
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
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
      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>
        {label}
      </div>
      <div
        className={syriac ? 'text-syriac' : ''}
        style={{ fontSize: syriac ? '1.15rem' : '0.95rem', color: 'var(--color-text)' }}
      >
        {value}
      </div>
    </div>
  )
}
