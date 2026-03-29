'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { createClient } from '@/app/lib/supabase'

type Category = {
  id: string
  slug: string
  label: string
  description: string | null
  sort_order: number | null
  is_active: boolean | null
  show_on_home: boolean | null
  home_order: number | null
}

export default function CategoriesPage() {
  const locale = useLocale()
  const supabase = createClient()

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const [label, setLabel] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('word_categories')
      .select(
        'id, slug, label, description, sort_order, is_active, show_on_home, home_order'
      )
      .order('sort_order', { ascending: true })

    if (error) {
      setError(error.message)
      setCategories([])
      setLoading(false)
      return
    }

    setCategories(data || [])
    setLoading(false)
  }

  function generateSlug(text: string) {
    return text
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  async function handleAdd() {
    setError('')
    setMessage('')

    if (!label.trim()) {
      setError('Kategori adı gerekli.')
      return
    }

    const finalSlug = (slug.trim() || generateSlug(label)).trim()

    const { error } = await supabase.from('word_categories').insert({
      label: label.trim(),
      slug: finalSlug,
      description: description.trim() || null,
      show_on_home: false,
      home_order: 0,
    })

    if (error) {
      setError(error.message)
      return
    }

    setMessage('Kategori eklendi.')
    setLabel('')
    setSlug('')
    setDescription('')
    await loadCategories()
  }

  async function handleDelete(id: string, label: string) {
    setError('')
    setMessage('')

    const confirmed = confirm(
      `"${label}" kategorisini silmek istiyor musun?\n\nBu işlem sadece kategoriyi ve ona bağlı kategori ilişkilerini siler. Kelimeler sistemde kalır.`
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('word_categories')
      .delete()
      .eq('id', id)

    if (error) {
      setError(error.message)
      return
    }

    setMessage('Kategori silindi. Kelimeler sistemde kaldı.')
    await loadCategories()
  }

  async function toggleShowOnHome(category: Category) {
    setError('')
    setMessage('')

    const nextValue = !category.show_on_home

    const { error } = await supabase
      .from('word_categories')
      .update({
        show_on_home: nextValue,
      })
      .eq('id', category.id)

    if (error) {
      setError(error.message)
      return
    }

    setMessage(
      nextValue
        ? `"${category.label}" ana sayfada gösterilecek.`
        : `"${category.label}" ana sayfadan kaldırıldı.`
    )

    await loadCategories()
  }

  return (
    <main style={{ padding: '2rem' }}>
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
          Admin
        </div>

        <h1 style={{ marginBottom: '0.5rem' }}>Kategori Yönetimi</h1>

        <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          Buradan yeni kategori ekleyebilir, mevcut kategorileri yönetebilir, ana sayfada görünüp görünmeyeceğini belirleyebilir veya silebilirsin.
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

      <div
        className="card"
        style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'grid',
          gap: '0.75rem',
          maxWidth: 680,
        }}
      >
        <h2 style={{ fontSize: '1.05rem' }}>Yeni Kategori Ekle</h2>

        <input
          className="input"
          placeholder="Kategori adı (örn: Zamirler)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />

        <input
          className="input"
          placeholder="Slug (opsiyonel)"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />

        <textarea
          placeholder="Açıklama (opsiyonel)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{
            width: '100%',
            minHeight: 90,
            borderRadius: 10,
            border: '1px solid var(--color-border)',
            padding: '0.75rem',
            resize: 'vertical',
          }}
        />

        <div>
          <button className="btn btn-primary" onClick={handleAdd}>
            Kategori Ekle
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '1rem' }}>
        <h2 style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>Mevcut Kategoriler</h2>

        {loading ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Yükleniyor...</p>
        ) : categories.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Henüz kategori bulunmuyor.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {categories.map((c) => (
              <div
                key={c.id}
                style={{
                  padding: '0.95rem 1rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      flexWrap: 'wrap',
                      marginBottom: '0.2rem',
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        color: 'var(--color-text)',
                      }}
                    >
                      {c.label}
                    </div>

                    {c.show_on_home ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '0.2rem 0.55rem',
                          borderRadius: 999,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: '#EAF7EE',
                          color: '#1F7A3E',
                          border: '1px solid #B7DEC2',
                        }}
                      >
                        ● Ana Sayfada
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '0.2rem 0.55rem',
                          borderRadius: 999,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: '#F2F2F2',
                          color: '#666',
                          border: '1px solid #DDD',
                        }}
                      >
                        Pasif
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--color-text-muted)',
                      marginBottom: '0.15rem',
                    }}
                  >
                    slug: {c.slug}
                  </div>

                  <div
                    style={{
                      fontSize: '0.84rem',
                      color: 'var(--color-text-subtle)',
                    }}
                  >
                    {c.description || 'Açıklama yok'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Link
                    href={`/${locale}/admin/categories/${c.id}`}
                    className="btn btn-primary btn-sm"
                  >
                    Yönet
                  </Link>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => toggleShowOnHome(c)}
                  >
                    {c.show_on_home ? 'Ana Sayfadan Kaldır' : 'Ana Sayfada Göster'}
                  </button>

                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDelete(c.id, c.label)}
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}