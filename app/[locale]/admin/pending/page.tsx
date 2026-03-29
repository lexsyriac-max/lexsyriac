'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type PendingWord = {
  id: string
  word_tr: string
  word_en: string
  word_syc: string
  transliteration: string
  pos: string
  status: string
}

type PendingGrammar = {
  id: string
  rule_name: string
  description: string
  example: string
  language: string
  status: string
}

export default function PendingPage() {
  const supabase = createClient()

  const [tab, setTab] = useState<'words' | 'grammar'>('words')
  const [words, setWords] = useState<PendingWord[]>([])
  const [grammar, setGrammar] = useState<PendingGrammar[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [editingWord, setEditingWord] = useState<PendingWord | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    setMessage('')

    const { data: w, error: wErr } = await supabase
      .from('pending_words')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    const { data: g, error: gErr } = await supabase
      .from('pending_grammar')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (wErr) setError(wErr.message)
    if (gErr) setError(gErr.message)

    setWords(w || [])
    setGrammar(g || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function normalizeWordType(value: string) {
  const v = value.trim().toLowerCase()

  if (['isim', 'noun', 'ad'].includes(v)) return 'isim'
  if (['fiil', 'verb'].includes(v)) return 'fiil'
  if (['sıfat', 'sifat', 'adjective'].includes(v)) return 'sıfat'
  if (['zarf', 'adverb'].includes(v)) return 'zarf'
  if (['zamir', 'pronoun'].includes(v)) return 'zamir'
  if (['edat', 'preposition'].includes(v)) return 'edat'
  if (['bağlaç', 'baglac', 'conjunction'].includes(v)) return 'bağlaç'
  if (['ünlem', 'unlem', 'interjection'].includes(v)) return 'ünlem'

  return 'diğer'
}

  function normalizePendingWord(word: PendingWord) {
    return {
      turkish: word.word_tr.trim().toLowerCase(),
      english: word.word_en.trim().toLowerCase(),
      syriac: word.word_syc.trim(),
      transliteration: word.transliteration.trim(),
      word_type: normalizeWordType(word.pos),
    }
  }

  async function checkWordDuplicate(word: PendingWord) {
    const cleanWord = normalizePendingWord(word)

    const { data, error } = await supabase
      .from('words')
      .select('id')
      .eq('turkish', cleanWord.turkish)
      .eq('english', cleanWord.english)
      .eq('syriac', cleanWord.syriac)
      .limit(1)

    if (error) {
      setError(error.message)
      return true
    }

    return !!(data && data.length > 0)
  }

  async function checkSimilarWords(word: PendingWord) {
    const clean = word.word_tr.trim().toLowerCase()

    const { data } = await supabase
      .from('words')
      .select('turkish, english')
      .ilike('turkish', `%${clean}%`)
      .limit(3)

    return data || []
  }

  async function approveWord(word: PendingWord) {
    setError('')
    setMessage('')

    const cleanWord = normalizePendingWord(word)

    const similar = await checkSimilarWords(word)
    if (similar.length > 0) {
      setError(
        `Benzer kelimeler bulundu: ${similar
          .map((s) => s.turkish)
          .join(', ')}`
      )
      return
    }

    const isDuplicate = await checkWordDuplicate(word)
    if (isDuplicate) {
      setError('Bu kelime sözlükte zaten var. Önce düzenle veya pending listesinden sil.')
      return
    }

    const { error: insertError } = await supabase.from('words').insert({
      turkish: cleanWord.turkish,
      english: cleanWord.english,
      syriac: cleanWord.syriac,
      transliteration: cleanWord.transliteration,
      word_type: cleanWord.word_type,
    })

    if (insertError) {
      setError(insertError.message)
      return
    }

    const { error: deleteError } = await supabase
      .from('pending_words')
      .delete()
      .eq('id', word.id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    setMessage('Kelime sözlüğe aktarıldı.')
    setEditingWord(null)
    load()
  }

  async function saveEditedWord() {
    if (!editingWord) return

    setSavingEdit(true)
    setError('')
    setMessage('')

    const cleanWord = normalizePendingWord(editingWord)

    const { error } = await supabase
      .from('pending_words')
      .update({
        word_tr: cleanWord.turkish,
        word_en: cleanWord.english,
        word_syc: cleanWord.syriac,
        transliteration: cleanWord.transliteration,
        pos: cleanWord.word_type,
      })
      .eq('id', editingWord.id)

    if (error) {
      setError(error.message)
      setSavingEdit(false)
      return
    }

    setMessage('Pending kelime güncellendi.')
    setEditingWord(null)
    setSavingEdit(false)
    load()
  }

  async function deleteWord(id: string) {
    setError('')
    setMessage('')

    const { error } = await supabase
      .from('pending_words')
      .delete()
      .eq('id', id)

    if (error) {
      setError(error.message)
      return
    }

    if (editingWord?.id === id) {
      setEditingWord(null)
    }

    setMessage('Kelime pending listesinden silindi.')
    load()
  }

  async function approveGrammar(g: PendingGrammar) {
    setError('')
    setMessage('')

    const rawLang = (g.language || '').toLowerCase().trim()

    let normalizedLanguage = 'turkish'
    if (rawLang.includes('turk') || rawLang === 'tr') normalizedLanguage = 'turkish'
    else if (rawLang.includes('eng') || rawLang === 'en') normalizedLanguage = 'english'
    else if (rawLang.includes('syr') || rawLang === 'syc') normalizedLanguage = 'syriac'
    else if (rawLang.includes('ger')) normalizedLanguage = 'german'
    else if (rawLang.includes('fr')) normalizedLanguage = 'french'

    const lower = (g.language || '').toLowerCase().trim()
    const validCategories = ['noun', 'verb', 'pronoun', 'sentence', 'number']
    const normalizedCategory = validCategories.includes(lower) ? lower : 'other'

    const { error: insertError } = await supabase.from('grammar_rules').insert({
      language: normalizedLanguage,
      category: normalizedCategory,
      tense: '',
      person: '',
      rule_title: g.rule_name,
      rule_description: g.description || '',
      structure_pattern: '',
      example_tr: '',
      example_sy: '',
      example_en: g.example || '',
      example_de: '',
      example_fr: '',
      notes: '',
      source_file_id: null,
      is_approved: true,
      approved_by: null,
      approved_at: new Date().toISOString(),
      order_index: 0,
    })

    if (insertError) {
      setError(insertError.message)
      return
    }

    const { error: deleteError } = await supabase
      .from('pending_grammar')
      .delete()
      .eq('id', g.id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    setMessage('Gramer kuralı gramer tablosuna aktarıldı.')
    load()
  }

  async function deleteGrammar(id: string) {
    setError('')
    setMessage('')

    const { error } = await supabase
      .from('pending_grammar')
      .delete()
      .eq('id', id)

    if (error) {
      setError(error.message)
      return
    }

    setMessage('Gramer kuralı pending listesinden silindi.')
    load()
  }

  return (
    <div className="container" style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '1rem' }}>
        Pending İçerikler
      </h1>

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
          }}
        >
          {message}
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
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <button onClick={() => setTab('words')}>
          Kelimeler ({words.length})
        </button>
        <button onClick={() => setTab('grammar')}>
          Gramer ({grammar.length})
        </button>
      </div>

      {loading && <p>Yükleniyor...</p>}

      {tab === 'words' && !loading && (
        <div>
          {editingWord && (
            <div
              className="card"
              style={{
                padding: '1rem',
                marginBottom: '1rem',
                border: '1px solid #d8d8d8',
              }}
            >
              <h3 style={{ marginTop: 0 }}>Kelime Düzenle</h3>

              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <input
                  className="input"
                  value={editingWord.word_tr}
                  onChange={(e) =>
                    setEditingWord({ ...editingWord, word_tr: e.target.value })
                  }
                  placeholder="Türkçe"
                />

                <input
                  className="input"
                  value={editingWord.word_en}
                  onChange={(e) =>
                    setEditingWord({ ...editingWord, word_en: e.target.value })
                  }
                  placeholder="İngilizce"
                />

                <input
                  className="input"
                  value={editingWord.word_syc}
                  onChange={(e) =>
                    setEditingWord({ ...editingWord, word_syc: e.target.value })
                  }
                  placeholder="Süryanice"
                  style={{ direction: 'rtl' }}
                />

                <input
                  className="input"
                  value={editingWord.transliteration}
                  onChange={(e) =>
                    setEditingWord({ ...editingWord, transliteration: e.target.value })
                  }
                  placeholder="Transliterasyon"
                />

                <input
                  className="input"
                  value={editingWord.pos}
                  onChange={(e) =>
                    setEditingWord({ ...editingWord, pos: e.target.value })
                  }
                  placeholder="Kelime türü"
                />
              </div>

              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                <button onClick={saveEditedWord} disabled={savingEdit}>
                  {savingEdit ? 'Kaydediliyor...' : '💾 Kaydet'}
                </button>
                <button onClick={() => setEditingWord(null)}>İptal</button>
              </div>
            </div>
          )}

          {words.map((w) => (
            <div
              key={w.id}
              style={{
                border: '1px solid #ddd',
                padding: '1rem',
                borderRadius: 10,
                marginBottom: '0.5rem',
              }}
            >
              <b>{w.word_tr}</b> — {w.word_en}
              <div style={{ direction: 'rtl' }}>{w.word_syc}</div>
              <div
                style={{
                  fontSize: '0.85rem',
                  color: '#666',
                  marginTop: '0.35rem',
                }}
              >
                {w.transliteration} · {w.pos}
              </div>

              <div
                style={{
                  marginTop: '0.75rem',
                  display: 'flex',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                }}
              >
                <button onClick={() => approveWord(w)}>✅ Onayla</button>
                <button onClick={() => setEditingWord(w)}>✏️ Düzenle</button>
                <button onClick={() => deleteWord(w.id)}>❌ Sil</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'grammar' && !loading && (
        <div>
          {grammar.map((g) => (
            <div
              key={g.id}
              style={{
                border: '1px solid #ddd',
                padding: '1rem',
                borderRadius: 10,
                marginBottom: '0.5rem',
              }}
            >
              <b>{g.rule_name}</b>
              <p style={{ marginTop: '0.5rem' }}>{g.description}</p>
              <i>{g.example}</i>
              <div
                style={{
                  fontSize: '0.85rem',
                  color: '#666',
                  marginTop: '0.35rem',
                }}
              >
                Dil/Kategori kaynağı: {g.language || 'general'}
              </div>

              <div
                style={{
                  marginTop: '0.75rem',
                  display: 'flex',
                  gap: '0.5rem',
                }}
              >
                <button onClick={() => approveGrammar(g)}>✅ Onayla</button>
                <button onClick={() => deleteGrammar(g.id)}>❌ Sil</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}