'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { Word } from '@/lib/types/words'
import {
  getWords,
  addWord,
  updateWord,
  deleteWord,
  deleteAllWords,
  AddWordPayload,
} from '@/lib/services/db'
import WordForm from './components/WordForm'
import WordTable from './components/WordTable'
import WordModal from './components/WordModal'

export default function AdminWordsPage() {
  const locale = useLocale()

  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingWord, setEditingWord] = useState<Word | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [totalCount, setTotal] = useState(0)
  const [todayCount, setToday] = useState(0)

  // Modal sadece detay için
  const [activeWord, setActiveWord] = useState<Word | null>(null)

  const load = useCallback(async () => {
    setLoading(true)

    const { data, error: e } = await getWords()
    if (e) {
      setError(e)
      setLoading(false)
      return
    }

    const list = data || []
    setWords(list)
    setTotal(list.length)

    const today = new Date().toISOString().slice(0, 10)
    setToday(list.filter((w) => w.created_at?.slice(0, 10) === today).length)

    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleAdd(payload: AddWordPayload): Promise<{ error: string | null }> {
    const { error: e } = await addWord(payload)

    if (e) return { error: e }

    setMessage(`✓ "${payload.turkish}" başarıyla eklendi.`)
    await load()
    return { error: null }
  }

  async function handleUpdateFromForm(
  id: string,
  payload: AddWordPayload
): Promise<{ error: string | null }> {
  const { error: e } = await updateWord({
    id,
    turkish: payload.turkish,
    english: payload.english,
    syriac: payload.syriac,
    transliteration: payload.transliteration,
    word_type: payload.word_type,
    category_id: payload.category_id ?? null,
    image_url: payload.image_url ?? null,
    audio_url: payload.audio_url ?? null,
  })

    if (e) return { error: e }

    setMessage(`✓ "${payload.turkish}" güncellendi.`)
    setEditingWord(null)
    setShowForm(false)
    await load()
    return { error: null }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" silinsin mi?`)) return

    const { error: e } = await deleteWord(id)
    if (e) {
      setError(e)
    } else {
      await load()
    }
  }

  async function handleDeleteAll() {
    const { error: e } = await deleteAllWords()
    if (e) {
      setError(e)
    } else {
      setMessage('Tüm kelimeler silindi.')
      await load()
    }
  }

  function openDetail(word: Word) {
    setActiveWord(word)
  }

  function closeDetail() {
    setActiveWord(null)
  }

  function openEdit(word: Word) {
    setEditingWord(word)
    setShowForm(true)
    setActiveWord(null)
    setMessage('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleToggleCreate() {
    if (showForm) {
      setShowForm(false)
      setEditingWord(null)
      return
    }

    setEditingWord(null)
    setShowForm(true)
    setMessage('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleFormCancel() {
    setEditingWord(null)
    setShowForm(false)
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div
        style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, #0F3D47 100%)',
          padding: '2rem 0',
        }}
      >
        <div className="container">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <p
                style={{
                  color: 'rgba(255,255,255,0.65)',
                  fontSize: '0.8rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '0.3rem',
                }}
              >
                Admin Alanı
              </p>
              <h1
                style={{
                  color: 'white',
                  fontFamily: 'var(--font-display)',
                  fontSize: '2rem',
                  fontWeight: 700,
                }}
              >
                Kelime Yönetimi
              </h1>
            </div>

            <Link
              href={`/${locale}/admin`}
              className="btn btn-ghost btn-sm"
              style={{
                color: 'rgba(255,255,255,0.9)',
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            >
              ← Admin Panele Dön
            </Link>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '2rem 1.5rem 4rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: '1rem',
            marginBottom: '1.5rem',
            maxWidth: 700,
          }}
        >
          {[
            { label: 'TOPLAM KELİME', value: totalCount },
            { label: 'BUGÜN EKLENEN', value: todayCount },
            { label: 'YÜKLEME', value: loading ? '...' : '✓' },
          ].map((s) => (
            <div key={s.label} className="card" style={{ padding: '1.25rem 1.5rem' }}>
              <div
                style={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  letterSpacing: '0.08em',
                  color: 'var(--color-text-muted)',
                  marginTop: '0.25rem',
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <button className="btn btn-primary" onClick={handleToggleCreate}>
            {showForm
              ? editingWord
                ? '✕ Düzenlemeyi İptal'
                : '✕ İptal'
              : '+ Kelime Ekle'}
          </button>
        </div>

        {message && (
          <div
            style={{
              marginBottom: '1rem',
              background: '#EEF8F1',
              border: '1px solid #B7DEC2',
              color: '#216A3A',
              borderRadius: 12,
              padding: '0.875rem 1rem',
              fontSize: '0.9rem',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            {message}
            <button
              onClick={() => setMessage('')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#216A3A',
              }}
            >
              ✕
            </button>
          </div>
        )}

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
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            {error}
            <button
              onClick={() => setError('')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#A94442',
              }}
            >
              ✕
            </button>
          </div>
        )}

        {showForm && (
          <WordForm
            editingWord={editingWord}
            onAdd={handleAdd}
            onUpdate={handleUpdateFromForm}
            onCancel={handleFormCancel}
          />
        )}

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Yükleniyor...
          </div>
        ) : (
          <WordTable
            locale={locale}
            words={words}
            onEdit={openEdit}
            onDetail={openDetail}
            onDelete={handleDelete}
            onDeleteAll={handleDeleteAll}
          />
        )}
      </div>

      {activeWord && (
        <WordModal
          word={activeWord}
          mode="detail"
          onClose={closeDetail}
          onSave={async () => {}}
          onModeChange={() => {}}
        />
      )}
    </main>
  )
}