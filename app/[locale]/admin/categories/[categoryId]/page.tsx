'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase'
import { useParams } from 'next/navigation'

type Category = {
  id: string
  slug: string
  label: string
  description: string | null
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

type CategoryWordItem = {
  id: string
  note: string | null
  sort_order: number | null
  word_id: string
  word: Word
}

export default function CategoryDetailPage() {
  const supabase = createClient()
  const params = useParams()
  const categoryId = params.categoryId as string

  const [category, setCategory] = useState<Category | null>(null)
  const [items, setItems] = useState<CategoryWordItem[]>([])
  const [poolWords, setPoolWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (categoryId) {
      loadAll()
    }
  }, [categoryId])

  async function loadAll() {
    setLoading(true)
    setMessage('')
    setError('')

    const { data: categoryData, error: categoryError } = await supabase
      .from('word_categories')
      .select('id, slug, label, description')
      .eq('id', categoryId)
      .single()

    if (categoryError) {
      setError(categoryError.message)
      setLoading(false)
      return
    }

    setCategory(categoryData)

    const { data: itemData, error: itemError } = await supabase
      .from('word_category_items')
      .select(`
        id,
        note,
        sort_order,
        word_id,
        word:words (
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

    if (itemError) {
      setError(itemError.message)
      setLoading(false)
      return
    }

    const normalizedItems = (itemData || []).map((item: any) => ({
      ...item,
      word: Array.isArray(item.word) ? item.word[0] : item.word,
    }))

    setItems(normalizedItems)

    const usedWordIds = normalizedItems.map((item: CategoryWordItem) => item.word_id)

    let query = supabase
      .from('words')
      .select('id, turkish, english, syriac, transliteration, word_type, image_url, audio_url')
      .order('turkish', { ascending: true })

    if (usedWordIds.length > 0) {
      query = query.not('id', 'in', `(${usedWordIds.join(',')})`)
    }

    const { data: poolData, error: poolError } = await query

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
    })

    if (error) {
      setError(error.message)
      return
    }

    setMessage(`"${word.turkish}" kategoriye eklendi.`)
    await loadAll()
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
    await loadAll()
  }

  async function updateNote(itemId: string, note: string) {
    setMessage('')
    setError('')

    const { error } = await supabase
      .from('word_category_items')
      .update({ note })
      .eq('id', itemId)

    if (error) {
      setError(error.message)
      return
    }

    setMessage('Not güncellendi.')
    await loadAll()
  }

  const filteredPool = poolWords.filter((w) => {
    const q = search.trim().toLowerCase()
    if (!q) return true

    return (
      w.turkish?.toLowerCase().includes(q) ||
      w.english?.toLowerCase().includes(q) ||
      w.syriac?.toLowerCase().includes(q) ||
      w.transliteration?.toLowerCase().includes(q)
    )
  })

  return (
    <main style={{ padding: '2rem' }}>
      {loading ? (
        <div>Yükleniyor...</div>
      ) : (
        <>
          <div style={{ marginBottom: '1.5rem' }}>
            <div
              style={{
                fontSize: '0.8rem',
                color: 'var(--color-text-muted)',
                marginBottom: '0.3rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Kategori Detayı
            </div>

            <h1 style={{ marginBottom: '0.4rem' }}>
              {category?.label || 'Kategori'}
            </h1>

            <div style={{ color: 'var(--color-text-muted)' }}>
              {category?.description || 'Bu kategoriye ait kelimeleri ve notları yönet.'}
            </div>
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

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              alignItems: 'start',
            }}
          >
            <div
              className="card"
              style={{ padding: '1rem' }}
            >
              <h2 style={{ marginBottom: '1rem', fontSize: '1.05rem' }}>
                Kategorideki Kelimeler
              </h2>

              {items.length === 0 ? (
                <div style={{ color: 'var(--color-text-muted)' }}>
                  Bu kategoride henüz kelime yok.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {items.map((item) => (
                    <CategoryWordCard
                      key={item.id}
                      item={item}
                      onRemove={() => removeWordFromCategory(item.id, item.word.turkish)}
                      onSaveNote={(note) => updateNote(item.id, note)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div
              className="card"
              style={{ padding: '1rem' }}
            >
              <h2 style={{ marginBottom: '1rem', fontSize: '1.05rem' }}>
                Kelime Havuzu
              </h2>

              <input
                className="input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Kelime ara..."
                style={{ marginBottom: '1rem' }}
              />

              {filteredPool.length === 0 ? (
                <div style={{ color: 'var(--color-text-muted)' }}>
                  Eşleşen kelime bulunamadı.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {filteredPool.slice(0, 60).map((word) => (
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
                        <div style={{ fontWeight: 600 }}>{word.turkish}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                          {word.english} · {word.syriac}
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

function CategoryWordCard({
  item,
  onRemove,
  onSaveNote,
}: {
  item: CategoryWordItem
  onRemove: () => void
  onSaveNote: (note: string) => void
}) {
  const [note, setNote] = useState(item.note || '')

  useEffect(() => {
    setNote(item.note || '')
  }, [item.note])

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: '0.9rem',
        background: 'white',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '0.75rem',
          alignItems: 'start',
          marginBottom: '0.75rem',
        }}
      >
        <div>
          <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>
            {item.word.turkish}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            {item.word.english} · {item.word.syriac}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-subtle)', marginTop: '0.2rem' }}>
            {item.word.transliteration}
          </div>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={onRemove}>
          Çıkar
        </button>
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Bu kategori için not ekle..."
        style={{
          width: '100%',
          minHeight: 80,
          borderRadius: 10,
          border: '1px solid var(--color-border)',
          padding: '0.75rem',
          resize: 'vertical',
          marginBottom: '0.6rem',
        }}
      />

      <button className="btn btn-primary btn-sm" onClick={() => onSaveNote(note)}>
        Notu Kaydet
      </button>
    </div>
  )
}