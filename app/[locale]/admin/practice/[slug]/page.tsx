'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import NavBar from '../../NavBar'
import { createClient } from '@/app/lib/supabase'

type Category = {
  id: string
  slug: string
  label: string
  description: string | null
  teaching_note: string | null
}

type Word = {
  id: string
  turkish: string
  english: string
  syriac: string
  transliteration: string
  word_type: string
  image_url: string | null
  audio_url: string | null
}

type CategoryWordRow = {
  id: string
  category_id: string
  word_id: string
  note: string | null
  sort_order: number | null
  created_at: string
  words: Word | Word[] | null
}

type CategoryWordItem = {
  id: string
  category_id: string
  word_id: string
  note: string | null
  sort_order: number | null
  created_at: string
  word: Word
}

export default function PracticeCategoryPage() {
  const params = useParams()
  const slug = params.slug as string
  const supabase = createClient()

  const [category, setCategory] = useState<Category | null>(null)
  const [items, setItems] = useState<CategoryWordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (slug) {
      loadPage()
    }
  }, [slug])

  async function loadPage() {
    setLoading(true)
    setError('')

    const { data: categoryData, error: categoryError } = await supabase
      .from('word_categories')
      .select('id, slug, label, description, teaching_note')
      .eq('slug', slug)
      .single()

    if (categoryError || !categoryData) {
      setError(categoryError?.message || 'Kategori bulunamadı.')
      setLoading(false)
      return
    }

    setCategory(categoryData)

    const { data: itemData, error: itemError } = await supabase
      .from('word_category_items')
      .select(`
        id,
        category_id,
        word_id,
        note,
        sort_order,
        created_at,
        words (
          id,
          turkish,
          english,
          syriac,
          transliteration,
          word_type,
          image_url,
          audio_url
        )
      `)
      .eq('category_id', categoryData.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (itemError) {
      setError(itemError.message)
      setLoading(false)
      return
    }

    const normalizedItems: CategoryWordItem[] = ((itemData as CategoryWordRow[] | null) || [])
      .map((row) => {
        const word = Array.isArray(row.words) ? row.words[0] : row.words
        if (!word) return null
        return {
          id: row.id,
          category_id: row.category_id,
          word_id: row.word_id,
          note: row.note,
          sort_order: row.sort_order,
          created_at: row.created_at,
          word,
        }
      })
      .filter(Boolean) as CategoryWordItem[]

    setItems(normalizedItems)
    setLoading(false)
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <NavBar />

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
            Kategori Pratiği
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
            {category?.label || 'Kategori'}
          </h1>

          <p
            style={{
              color: 'rgba(255,255,255,0.82)',
              maxWidth: 760,
              lineHeight: 1.7,
            }}
          >
            {category?.description || 'Bu kategoriye ait temel kelimeleri çalış.'}
          </p>
        </div>
      </div>

      <div className="container" style={{ padding: '2rem 1.5rem 3rem' }}>
        {loading ? (
          <div style={{ color: 'var(--color-text-muted)' }}>Yükleniyor...</div>
        ) : error ? (
          <div
            style={{
              background: '#FFF7F7',
              border: '1px solid #E5C7C7',
              color: '#A94442',
              borderRadius: 10,
              padding: '0.875rem 1rem',
            }}
          >
            {error}
          </div>
        ) : (
          <>
            {category?.teaching_note && (
              <div
                className="card"
                style={{
                  padding: '1rem',
                  marginBottom: '1rem',
                  background: '#FFFDF7',
                  border: '1px solid #E8DFC2',
                }}
              >
                <h2 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>
                  Kategori Notu
                </h2>

                <div
                  style={{
                    color: 'var(--color-text)',
                    lineHeight: 1.75,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {category.teaching_note}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem' }}>
                Bu kategorideki kelimeler
              </h2>
            </div>

            {items.length === 0 ? (
              <div style={{ color: 'var(--color-text-muted)' }}>
                Bu kategoride henüz kelime yok.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '1rem',
                }}
              >
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="card"
                    style={{
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        aspectRatio: '4/3',
                        borderRadius: 10,
                        overflow: 'hidden',
                        border: '1px solid var(--color-border)',
                        background: '#F5F3EE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {item.word.image_url ? (
                        <img
                          src={item.word.image_url}
                          alt={item.word.turkish}
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

                    <div>
                      <div
                        style={{
                          fontSize: '1rem',
                          fontWeight: 700,
                          color: 'var(--color-text)',
                          marginBottom: '0.2rem',
                        }}
                      >
                        {item.word.turkish}
                      </div>

                      <div
                        style={{
                          fontSize: '0.9rem',
                          color: 'var(--color-text-muted)',
                          marginBottom: '0.2rem',
                        }}
                      >
                        {item.word.english}
                      </div>

                      <div
                        style={{
                          fontSize: '1.2rem',
                          color: 'var(--color-primary)',
                          fontFamily: 'var(--font-display)',
                          marginBottom: '0.25rem',
                        }}
                      >
                        {item.word.syriac}
                      </div>

                      <div
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--color-text-subtle)',
                        }}
                      >
                        {item.word.transliteration}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.5rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span className="badge badge-primary">
                        {item.word.word_type || 'kelime'}
                      </span>

                      {item.word.audio_url ? (
                        <audio controls style={{ maxWidth: 180 }}>
                          <source src={item.word.audio_url} />
                        </audio>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.82rem',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          Ses yok
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}