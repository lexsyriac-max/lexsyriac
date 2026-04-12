'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import NavBar from '../NavBar'
import { useLocale } from 'next-intl'
import { useSearchParams } from 'next/navigation'
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
  created_at?: string | null
}

type SearchMode = 'all' | 'turkish' | 'english' | 'syriac' | 'transliteration'

const TYPE_OPTIONS = [
  { value: '', label: 'Tüm türler' },
  { value: 'isim', label: 'İsim' },
  { value: 'fiil', label: 'Fiil' },
  { value: 'sıfat', label: 'Sıfat' },
  { value: 'zarf', label: 'Zarf' },
  { value: 'zamir', label: 'Zamir' },
  { value: 'edat', label: 'Edat' },
  { value: 'bağlaç', label: 'Bağlaç' },
  { value: 'ünlem', label: 'Ünlem' },
  { value: 'diğer', label: 'Diğer' },
]

export default function DictionaryPage() {
  const locale = useLocale()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [searchMode, setSearchMode] = useState<SearchMode>('all')
  const [typeFilter, setTypeFilter] = useState('')
  const [selectedWord, setSelectedWord] = useState<Word | null>(null)
  const [showWordList, setShowWordList] = useState(true)

  useEffect(() => {
    loadWords()
  }, [])

  useEffect(() => {
    const urlQuery = searchParams.get('q') || ''
    setQuery(urlQuery)
  }, [searchParams])

  async function loadWords() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('words')
      .select('*')
      .order('turkish', { ascending: true })

    if (error) {
      setError(error.message)
      setWords([])
      setLoading(false)
      return
    }

    setWords(data || [])
    setLoading(false)
  }

  const filteredWords = useMemo(() => {
    const q = query.trim().toLowerCase()

    return words.filter((word) => {
      const matchesType = typeFilter ? (word.word_type || '') === typeFilter : true
      if (!matchesType) return false
      if (!q) return true

      const tr = (word.turkish || '').toLowerCase()
      const en = (word.english || '').toLowerCase()
      const sy = (word.syriac || '').toLowerCase()
      const translit = (word.transliteration || '').toLowerCase()

      if (searchMode === 'turkish') return tr.includes(q)
      if (searchMode === 'english') return en.includes(q)
      if (searchMode === 'syriac') return sy.includes(q)
      if (searchMode === 'transliteration') return translit.includes(q)

      return (
        tr.includes(q) ||
        en.includes(q) ||
        sy.includes(q) ||
        translit.includes(q)
      )
    })
  }, [words, query, searchMode, typeFilter])

  function clearFilters() {
    setQuery('')
    setSearchMode('all')
    setTypeFilter('')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <NavBar />

      <main>
        <div
          style={{
            background: 'linear-gradient(135deg, var(--color-primary) 0%, #0F3D47 100%)',
            padding: '2.75rem 0',
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
              Sözlük
            </p>

            <h1
              style={{
                color: 'white',
                fontFamily: 'var(--font-display)',
                fontSize: '2.1rem',
                fontWeight: 700,
                marginBottom: '0.65rem',
              }}
            >
              Üç dilli sözlükte arama yap
            </h1>

            <p
              style={{
                color: 'rgba(255,255,255,0.86)',
                fontSize: '0.98rem',
                lineHeight: 1.7,
              }}
            >
              Türkçe, Süryanice, İngilizce ve transliterasyon alanlarında arama yapabilir,
              sonuçları türüne göre filtreleyebilirsin.
            </p>
          </div>
        </div>

        <div className="container" style={{ padding: '2rem 1.5rem 3rem' }}>
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
            <div
              className="btn-group-mobile"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'var(--color-text)',
                }}
              >
                Arama ve Filtreler
              </div>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowWordList((prev) => !prev)}
              >
                {showWordList ? '▲ Kelime Listesini Gizle' : '▼ Kelime Listesini Göster'}
              </button>
            </div>

            <div
              className="mobile-stack"
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'minmax(0, 1.5fr) minmax(180px, 0.8fr) minmax(180px, 0.8fr)',
                gap: '0.85rem',
                alignItems: 'end',
              }}
            >
              <div>
                <label style={LS}>Arama</label>
                <input
                  className="input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Kelime yaz..."
                />
              </div>

              <div>
                <label style={LS}>Arama Alanı</label>
                <select
                  className="input"
                  value={searchMode}
                  onChange={(e) => setSearchMode(e.target.value as SearchMode)}
                >
                  <option value="all">Tüm alanlar</option>
                  <option value="turkish">Türkçe</option>
                  <option value="english">İngilizce</option>
                  <option value="syriac">Süryanice</option>
                  <option value="transliteration">Transliterasyon</option>
                </select>
              </div>

              <div>
                <label style={LS}>Kelime Türü</label>
                <select
                  className="input"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  {TYPE_OPTIONS.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              className="btn-group-mobile"
              style={{
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap',
                marginTop: '1rem',
              }}
            >
              <button className="btn btn-secondary" onClick={clearFilters}>
                Filtreleri Temizle
              </button>

              <div
                style={{
                  fontSize: '0.88rem',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {filteredWords.length} sonuç
              </div>
            </div>
          </div>

          {error && (
            <div
              style={{
                marginBottom: '1rem',
                background: '#FFF7F7',
                border: '1px solid #E5C7C7',
                color: '#A94442',
                borderRadius: 12,
                padding: '0.875rem 1rem',
                fontSize: '0.9rem',
              }}
            >
              {error}
            </div>
          )}

          {!showWordList ? (
            <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '0.95rem',
                  color: 'var(--color-text)',
                  marginBottom: '0.35rem',
                  fontWeight: 600,
                }}
              >
                Kelime listesi gizlendi
              </div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                Arama ve filtreleme devam ediyor. Listeyi görmek için yukarıdaki butonu kullan.
              </div>
            </div>
          ) : loading ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              Yükleniyor...
            </div>
          ) : filteredWords.length === 0 ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '1rem',
                  color: 'var(--color-text)',
                  marginBottom: '0.35rem',
                  fontWeight: 600,
                }}
              >
                Sonuç bulunamadı
              </div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.92rem' }}>
                Arama ifadesini değiştir veya filtreleri temizle.
              </div>
            </div>
          ) : (
            <div
              className="responsive-grid-3"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1rem',
              }}
            >
              {filteredWords.map((word) => (
                <button
                  key={word.id}
                  onClick={() => setSelectedWord(word)}
                  className="card"
                  style={{
                    padding: '1rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    background: 'white',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '16/9',
                      borderRadius: 10,
                      overflow: 'hidden',
                      border: '1px solid var(--color-border)',
                      background: '#F2EFE9',
                      marginBottom: '0.85rem',
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
                          fontSize: '0.8rem',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        Görsel yok
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '1rem',
                          fontWeight: 700,
                          color: 'var(--color-text)',
                          marginBottom: '0.2rem',
                        }}
                      >
                        {word.turkish || '—'}
                      </div>

                      <div
                        className="text-syriac"
                        style={{
                          fontSize: '1.15rem',
                          color: 'var(--color-primary)',
                          marginBottom: '0.2rem',
                        }}
                      >
                        {word.syriac || '—'}
                      </div>

                      <div
                        style={{
                          fontSize: '0.88rem',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        {word.english || '—'}
                      </div>
                    </div>

                    <span className="badge">{word.word_type || 'diğer'}</span>
                  </div>

                  <div
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--color-text-subtle)',
                    }}
                  >
                    {word.transliteration || 'Transliterasyon yok'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {selectedWord && (
        <div
          onClick={() => setSelectedWord(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 560,
              padding: '1.5rem',
              background: 'white',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '1rem',
                marginBottom: '1rem',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 700,
                    color: 'var(--color-text)',
                    marginBottom: '0.25rem',
                  }}
                >
                  {selectedWord.turkish || '—'}
                </div>

                <div
                  className="text-syriac"
                  style={{
                    fontSize: '1.5rem',
                    color: 'var(--color-primary)',
                    marginBottom: '0.25rem',
                  }}
                >
                  {selectedWord.syriac || '—'}
                </div>

                <div
                  style={{
                    fontSize: '1rem',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {selectedWord.english || '—'}
                </div>
              </div>

              <button
                onClick={() => setSelectedWord(null)}
                className="btn btn-ghost btn-sm"
              >
                Kapat
              </button>
            </div>

            <div style={{ display: 'grid', gap: '0.85rem' }}>
              <DetailRow label="Transliterasyon" value={selectedWord.transliteration || '—'} />
              <DetailRow label="Kelime Türü" value={selectedWord.word_type || '—'} />
              <DetailRow label="Ses" value={selectedWord.audio_url ? 'Mevcut' : 'Yok'} />
              <DetailRow label="Görsel" value={selectedWord.image_url ? 'Mevcut' : 'Yok'} />
            </div>

            {selectedWord.image_url && (
              <div style={{ marginTop: '1rem' }}>
                <img
                  src={selectedWord.image_url}
                  alt={selectedWord.turkish || 'word-image'}
                  style={{
                    width: '100%',
                    maxHeight: 260,
                    objectFit: 'cover',
                    borderRadius: 12,
                    border: '1px solid var(--color-border)',
                  }}
                />
              </div>
            )}

            {selectedWord.audio_url && (
              <div style={{ marginTop: '1rem' }}>
                <audio controls style={{ width: '100%' }}>
                  <source src={selectedWord.audio_url} />
                </audio>
              </div>
            )}

            <div
              className="btn-group-mobile"
              style={{
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap',
                marginTop: '1rem',
              }}
            >
              <Link href={`/${locale}/dictionary/${selectedWord.id}`} className="btn btn-ghost btn-sm">
                Detay Sayfası →
              </Link>
              <Link href={`/${locale}/learn`} className="btn btn-secondary">
                Öğrenme Alanına Git
              </Link>

              <Link href={`/${locale}/sentences`} className="btn btn-primary">
                Cümle Alanına Git
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
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
      <div style={{ fontSize: '0.95rem', color: 'var(--color-text)' }}>
        {value}
      </div>
    </div>
  )
}

const LS: React.CSSProperties = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: 600,
  marginBottom: '0.35rem',
  color: 'var(--color-text)',
}