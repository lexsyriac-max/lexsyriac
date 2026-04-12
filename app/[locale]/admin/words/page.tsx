'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase'
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

type WordCategory = {
  id: string
  name: string
}

export default function AdminWordsPage() {
  const locale = useLocale()
  const supabase = createClient()
  const searchParams = useSearchParams()
  const router = useRouter()

  // Pending kelime akışı: ?pendingId=xxx ile gelince formu dolu aç
  const pendingId = searchParams.get('pendingId')
  const [pendingWordId, setPendingWordId] = useState<string | null>(null)

  const [words, setWords] = useState<Word[]>([])
  const [categories, setCategories] = useState<WordCategory[]>([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editingWord, setEditingWord] = useState<Word | null>(null)
  const [activeWord, setActiveWord] = useState<Word | null>(null)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [totalCount, setTotalCount] = useState(0)
  const [todayCount, setTodayCount] = useState(0)
  const [unverifiedCount, setUnverifiedCount] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [{ data: wordsData, error: wordsError }, categoriesRes] = await Promise.all([
        getWords(),
        supabase
          .from('categories')
          .select('id,name')
          .eq('type', 'word')
          .order('name', { ascending: true }),
      ])

      if (wordsError) {
        setError(wordsError)
        setWords([])
        setTotalCount(0)
        setTodayCount(0)
        setUnverifiedCount(0)
      } else {
        const list = wordsData || []
        setWords(list)
        setTotalCount(list.length)

        const today = new Date().toISOString().slice(0, 10)
        setTodayCount(list.filter((w) => w.created_at?.slice(0, 10) === today).length)
        setUnverifiedCount(list.filter((w) => !w.is_verified).length)
      }

      if (categoriesRes.error) {
        setCategories([])
        setError((prev) => prev || categoriesRes.error.message)
      } else {
        setCategories((categoriesRes.data as WordCategory[]) || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veriler yüklenemedi.')
      setWords([])
      setCategories([])
      setTotalCount(0)
      setTodayCount(0)
      setUnverifiedCount(0)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void load()
  }, [load])

  // pendingId URL parametresi varsa → pending_words'den çek → formu dolu aç
  useEffect(() => {
    if (!pendingId) return

    async function loadPending() {
      const { data, error } = await supabase
        .from('pending_words')
        .select('*')
        .eq('id', pendingId)
        .single()

      if (error || !data) return

      // pending_words → Word formatına dönüştür
      const pseudoWord: Word = {
        id: '__pending__' + data.id,
        turkish: data.word_tr || data.lemma || data.normalized_form || '',
        english: data.word_en || '',
        syriac: data.word_syc || data.surface_form || '',
        transliteration: data.transliteration || '',
        root: '',
        word_type: data.pos || 'isim',
        image_url: null,
        audio_url: null,
        source: 'lexscan',
        is_verified: false,
        sedra_verified: false,
        notes: data.context_sentence || '',
        practice_group: null,
        category_id: null,
        created_at: data.created_at,
        updated_at: data.updated_at,
      }

      setPendingWordId(data.id)
      setEditingWord(pseudoWord)
      setShowForm(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    void loadPending()
  }, [pendingId, supabase])

  async function handleAdd(payload: AddWordPayload): Promise<{ error: string | null }> {
    const { error } = await addWord(payload)

    if (error) {
      setError(error)
      return { error }
    }

    setMessage(`✓ "${payload.turkish}" başarıyla eklendi.`)
    setShowForm(false)
    setEditingWord(null)

    // Pending akışından geldiyse → pending kaydı sil ve URL temizle
    if (pendingWordId) {
      await supabase.from('pending_words').delete().eq('id', pendingWordId)
      setPendingWordId(null)
      router.replace(`/${locale}/admin/words`)
    }

    await load()
    return { error: null }
  }

  async function handleUpdateFromForm(
    id: string,
    payload: AddWordPayload
  ): Promise<{ error: string | null }> {
    // Pending akışından geliyorsa → update değil add yap
    if (id.startsWith('__pending__')) {
      return handleAdd(payload)
    }
    const { error } = await updateWord({
      id,
      ...payload,
      category_id: payload.category_id ?? null,
      image_url: payload.image_url ?? null,
      audio_url: payload.audio_url ?? null,
      root: payload.root ?? null,
      source: payload.source ?? 'manual',
      is_verified: payload.is_verified ?? false,
      sedra_verified: payload.sedra_verified ?? false,
      notes: payload.notes ?? null,
    })

    if (error) {
      setError(error)
      return { error }
    }

    setMessage(`✓ "${payload.turkish}" güncellendi.`)
    setShowForm(false)
    setEditingWord(null)
    await load()

    return { error: null }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" silinsin mi?`)) return

    const { error } = await deleteWord(id)
    if (error) {
      setError(error)
      return
    }

    if (activeWord?.id === id) setActiveWord(null)
    if (editingWord?.id === id) {
      setEditingWord(null)
      setShowForm(false)
    }

    setMessage(`✓ "${name}" silindi.`)
    await load()
  }

  async function handleDeleteAll() {
    if (!confirm('Tüm kelimeler silinsin mi?')) return

    const { error } = await deleteAllWords()
    if (error) {
      setError(error)
      return
    }

    setActiveWord(null)
    setEditingWord(null)
    setShowForm(false)
    setMessage('Tüm kelimeler silindi.')
    await load()
  }

  function openEdit(word: Word) {
    setEditingWord(word)
    setShowForm(true)
    setActiveWord(null)
    setMessage('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openDetail(word: Word) {
    setActiveWord(word)
  }

  function handleToggleCreate() {
    if (showForm) {
      setShowForm(false)
      setEditingWord(null)
      return
    }

    setShowForm(true)
    setEditingWord(null)
    setActiveWord(null)
    setMessage('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
            maxWidth: 980,
          }}
        >
          {[
            { label: 'TOPLAM KELİME', value: totalCount },
            { label: 'BUGÜN EKLENEN', value: todayCount },
            { label: 'ONAY BEKLEYEN AI', value: unverifiedCount },
          ].map((card) => (
            <div key={card.label} className="card" style={{ padding: '1.25rem 1.5rem' }}>
              <div
                style={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {card.value}
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  letterSpacing: '0.08em',
                  color: 'var(--color-text-muted)',
                  marginTop: '0.25rem',
                }}
              >
                {card.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleToggleCreate}>
            {showForm ? (editingWord ? '✕ Düzenlemeyi İptal' : '✕ İptal') : '+ Kelime Ekle'}
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
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#216A3A' }}
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
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A94442' }}
            >
              ✕
            </button>
          </div>
        )}

        {pendingWordId && (
          <div style={{
            display: 'flex', gap: '0.75rem', marginBottom: '1rem',
            padding: '0.75rem 1rem', background: '#F0F8FA',
            border: '1px solid #B0D8E0', borderRadius: 12, alignItems: 'center'
          }}>
            <span style={{ fontSize: 13, color: '#1A5F6E', fontWeight: 600 }}>
              📋 Pending kelime düzenleniyor
            </span>
            <div style={{ flex: 1 }} />
            <button
              className="btn btn-ghost btn-sm"
              onClick={async () => {
                // Sıradaki pending kelimeyi bul
                const { data } = await supabase
                  .from('pending_words')
                  .select('id')
                  .eq('status', 'pending')
                  .neq('id', pendingWordId)
                  .order('created_at', { ascending: false })
                  .limit(1)
                if (data && data[0]) {
                  router.push(`/${locale}/admin/words?pendingId=${data[0].id}`)
                } else {
                  router.push(`/${locale}/admin/pending`)
                }
              }}
            >
              Sonraki Kelime →
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => router.push(`/${locale}/admin/pending`)}
            >
              ← Pending'e Dön
            </button>
          </div>
        )}

        {showForm && (
          <WordForm
            editingWord={editingWord}
            onAdd={handleAdd}
            onUpdate={handleUpdateFromForm}
            onCancel={() => {
              setShowForm(false)
              setEditingWord(null)
              if (pendingWordId) {
                setPendingWordId(null)
                router.push(`/${locale}/admin/pending`)
              }
            }}
            categories={categories}
          />
        )}

        {!loading ? (
          <WordTable
            locale={locale}
            words={words}
            onEdit={openEdit}
            onDetail={openDetail}
            onDelete={handleDelete}
            onDeleteAll={handleDeleteAll}
          />
        ) : (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Yükleniyor...
          </div>
        )}
      </div>

      {activeWord && (
        <WordModal
          word={activeWord}
          mode="detail"
          onClose={() => setActiveWord(null)}
          onSave={async () => {}}
          onModeChange={() => {}}
        />
      )}
    </main>
  )
}