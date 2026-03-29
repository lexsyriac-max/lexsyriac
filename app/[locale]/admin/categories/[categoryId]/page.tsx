'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

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

export default function CategoryDetailPage() {
  const params = useParams()
  const categoryId = params.categoryId as string
  const supabase = createClient()

  const [category, setCategory] = useState<Category | null>(null)
  const [items, setItems] = useState<CategoryWordItem[]>([])
  const [poolWords, setPoolWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [teachingNote, setTeachingNote] = useState('')
  const [poolOpen, setPoolOpen] = useState(true)

  useEffect(() => {
    if (categoryId) {
      loadPage()
    }
  }, [categoryId])

  async function loadPage() {
    setLoading(true)
    setMessage('')
    setError('')

    const { data: categoryData, error: categoryError } = await supabase
      .from('word_categories')
      .select('id, slug, label, description, teaching_note')
      .eq('id', categoryId)
      .single()

    if (categoryError) {
      setError(categoryError.message)
      setLoading(false)
      return
    }

    setCategory(categoryData)
    setTeachingNote(categoryData.teaching_note || '')

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
      .eq('category_id', categoryId)
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

    const usedIds = normalizedItems.map((item) => item.word_id)

    let wordQuery = supabase
      .from('words')
      .select('id, turkish, english, syriac, transliteration, word_type, image_url, audio_url')
      .order('turkish', { ascending: true })

    if (usedIds.length > 0) {
      wordQuery = wordQuery.not('id', 'in', `(${usedIds.join(',')})`)
    }

    const { data: poolData, error: poolError } = await wordQuery

    if (poolError) {
      setError(poolError.message)
      setLoading(false)
      return
    }

    setPoolWords(poolData || [])
    setLoading(false)
  }

  async function addWordToCategory(word: Word) {
    setMessage('')
    setError('')

    const { error } = await supabase.from('word_category_items').insert({
      category_id: categoryId,
      word_id: word.id,
      note: null,
      sort_order: 0,
    })

    if (error) {
      setError(error.message)
      return
    }

    setMessage(`"${word.turkish}" kategoriye eklendi.`)
    await loadPage()
  }

  async function removeWordFromCategory(itemId: string, wordLabel: string) {
    setMessage('')
    setError('')

    const { error } = await supabase
      .from('word_category_items')
      .delete()
      .eq('id', itemId)

    if (error) {
      setError(error.message)
      return
    }

    setMessage(`"${wordLabel}" kategoriden çıkarıldı.`)
    await loadPage()
  }

  async function saveTeachingNote() {
    setMessage('')
    setError('')

    const { error } = await supabase
      .from('word_categories')
      .update({ teaching_note: teachingNote })
      .eq('id', categoryId)

    if (error) {
      setError(error.message)
      return
    }

    setMessage('Kategori notu kaydedildi.')
    await loadPage()
  }

  const filteredPoolWords = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return poolWords

    return poolWords.filter((w) => {
      return (
        w.turkish?.toLowerCase().includes(q) ||
        w.english?.toLowerCase().includes(q) ||
        w.syriac?.toLowerCase().includes(q) ||
        w.transliteration?.toLowerCase().includes(q)
      )
    })
  }, [poolWords, search])

  return (
    <main style={{ padding: '2rem' }}>
      {loading ? (
        <div style={{ color: 'var(--color-text-muted)' }}>Yükleniyor...</div>
      ) : (
        <>
          <div style={{ marginBottom: '1.5rem' }}>
            <div
              style={{
                fontSize: '0.8rem',
                color: 'var(--color-text-muted)',
                marginBottom: '0.35rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Kategori Detayı
            </div>

            <h1 style={{ marginBottom: '0.45rem' }}>
              {category?.label || 'Kategori'}
            </h1>

            <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              {category?.description || 'Bu kategoriye kelime ekle, çıkar ve öğretici kategori notu yaz.'}
            </p>
          </div>

          {message && (
            <div
              style={{
                background: '#EEF8F1',
                border: '1px solid #B7DEC2',
                color: '#216A3A',
                borderRadius: 10,
                padding: '0.875rem 1rem',
                marginBottom: '1rem',
              }}
            >
              {message}
            </div>
          )}

          {error && (
            <div
              style={{
                background: '#FFF7F7',
                border: '1px solid #E5C7C7',
                color: '#A94442',
                borderRadius: 10,
                padding: '0.875rem 1rem',
                marginBottom: '1rem',
              }}
            >
              {error}
            </div>
          )}

          <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.05rem', marginBottom: '0.85rem' }}>
              Kategori Öğretici Notu
            </h2>

            <textarea
              value={teachingNote}
              onChange={(e) => setTeachingNote(e.target.value)}
              placeholder="Bu kategoriyle ilgili açıklayıcı bilgi, kısa kural, öğretici not..."
              style={{
                width: '100%',
                minHeight: 140,
                borderRadius: 10,
                border: '1px solid var(--color-border)',
                padding: '0.75rem',
                resize: 'vertical',
                marginBottom: '0.75rem',
              }}
            />

            <button className="btn btn-primary btn-sm" onClick={saveTeachingNote}>
              Kategori Notunu Kaydet
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              alignItems: 'start',
            }}
          >
            <div className="card" style={{ padding: '1rem' }}>
              <h2 style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>
                Kategorideki Kelimeler
              </h2>

              {items.length === 0 ? (
                <div style={{ color: 'var(--color-text-muted)' }}>
                  Bu kategoride henüz kelime yok.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '0.85rem' }}>
                  {items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        border: '1px solid var(--color-border)',
                        borderRadius: 12,
                        padding: '0.95rem',
                        background: 'white',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          alignItems: 'start',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: 700,
                              color: 'var(--color-text)',
                              marginBottom: '0.2rem',
                            }}
                          >
                            {item.word.turkish}
                          </div>

                          <div
                            style={{
                              fontSize: '0.85rem',
                              color: 'var(--color-text-muted)',
                              marginBottom: '0.15rem',
                            }}
                          >
                            {item.word.english} · {item.word.syriac}
                          </div>

                          <div
                            style={{
                              fontSize: '0.8rem',
                              color: 'var(--color-text-subtle)',
                            }}
                          >
                            {item.word.transliteration}
                          </div>
                        </div>

                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => removeWordFromCategory(item.id, item.word.turkish)}
                        >
                          Çıkar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card" style={{ padding: '1rem' }}>
              <h2 style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>
                Kelime Havuzu
              </h2>

              <input
                className="input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Kelime ara..."
                style={{ marginBottom: '0.75rem' }}
              />

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPoolOpen((p) => !p)}
                style={{ marginBottom: '1rem' }}
              >
                {poolOpen ? 'Kelime Havuzunu Kapat' : 'Kelime Havuzunu Aç'}
              </button>

              {!poolOpen ? (
                <div style={{ color: 'var(--color-text-muted)' }}>
                  Kelime havuzu kapalı.
                </div>
              ) : filteredPoolWords.length === 0 ? (
                <div style={{ color: 'var(--color-text-muted)' }}>
                  Eşleşen kelime bulunamadı.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '0.6rem' }}>
                  {filteredPoolWords.slice(0, 80).map((word) => (
                    <div
                      key={word.id}
                      style={{
                        border: '1px solid var(--color-border)',
                        borderRadius: 10,
                        padding: '0.75rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.75rem',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            color: 'var(--color-text)',
                            marginBottom: '0.15rem',
                          }}
                        >
                          {word.turkish}
                        </div>

                        <div
                          style={{
                            fontSize: '0.85rem',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          {word.english} · {word.syriac}
                        </div>

                        <div
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--color-text-subtle)',
                            marginTop: '0.15rem',
                          }}
                        >
                          {word.transliteration}
                        </div>
                      </div>

                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => addWordToCategory(word)}
                      >
                        Ekle
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  )
}