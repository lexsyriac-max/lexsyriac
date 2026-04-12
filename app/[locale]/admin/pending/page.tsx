'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase'

// ─── TYPES ─────────────────────────────────────────────────

type PendingWord = {
  id: string
  word_tr?: string
  word_en?: string
  word_syc?: string
  transliteration?: string
  pos?: string
  lemma?: string
  surface_form?: string
  normalized_form?: string
  context_sentence?: string
  language_detected?: string
  language?: string
  status: string
}

type PendingGrammar = {
  id: string
  rule_name?: string
  description?: string
  example?: string
  language?: string
  category_id?: string
  status: string
}

type PendingSentence = {
  id: string
  sentence_syc?: string
  sentence_tr?: string
  sentence_en?: string
  base_language?: string
  notes?: string
  source?: string
  category_id?: string
  needs_review?: boolean
  status: string
}

type ActionStatus = 'ok' | 'duplicate' | 'error'

// ─── HELPERS ───────────────────────────────────────────────

function norm(v: string) {
  return (v || '').trim().toLowerCase()
}

function normalizeWordType(value: string) {
  const v = (value || '').trim().toLowerCase()
  if (['isim', 'noun', 'ad'].includes(v)) return 'noun'
  if (['fiil', 'verb'].includes(v)) return 'verb'
  if (['sifat', 'sıfat', 'adjective'].includes(v)) return 'adjective'
  if (['zarf', 'adverb'].includes(v)) return 'adjective'
  if (['zamir', 'pronoun'].includes(v)) return 'pronoun'
  if (['edat', 'preposition'].includes(v)) return 'other'
  if (['baglac', 'bağlaç', 'conjunction'].includes(v)) return 'other'
  if (['unlem', 'ünlem', 'interjection'].includes(v)) return 'other'
  return 'noun'
}

function normalizeGrammarLanguage(lang?: string) {
  const v = (lang || '').trim().toLowerCase()
  if (['tr', 'turkish', 'türkçe'].includes(v)) return 'turkish'
  if (['en', 'english', 'ingilizce'].includes(v)) return 'english'
  if (['syc', 'syr', 'syriac', 'süryanice', 'arc', 'aramaic', 'aramice'].includes(v)) return 'syriac'
  if (['de', 'german', 'almanca'].includes(v)) return 'german'
  return 'turkish'
}

// ─── STYLES ────────────────────────────────────────────────

const styles = {
  container: { maxWidth: 1100, margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif' },
  title: { fontSize: '1.8rem', fontWeight: 800, color: '#1A2B3C', marginBottom: '1.5rem' },
  tabBar: { display: 'flex', gap: 10, marginBottom: '2rem' },
  tabBtn: (active: boolean) => ({
    padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
    background: active ? '#1A5F6E' : '#E0E6E9', color: active ? 'white' : '#556677',
    fontWeight: 700, fontSize: 14, transition: '0.2s'
  }),
  actionBar: {
    display: 'flex', gap: 12, alignItems: 'center', background: '#F0F4F7',
    padding: '12px 16px', borderRadius: 12, marginBottom: '1rem', border: '1px solid #D1D9E0', flexWrap: 'wrap' as const
  },
  card: {
    background: 'white', border: '1px solid #E0E6ED', borderRadius: 16,
    padding: '1.5rem', marginBottom: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
    display: 'flex', gap: 16, transition: '0.3s'
  },
  editPanel: {
    background: '#F8FBFC', border: '2px solid #1A5F6E', borderRadius: 16,
    padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 10px 25px rgba(26, 95, 110, 0.1)'
  },
  input: { width: '100%', padding: '10px', borderRadius: 8, border: '1.5px solid #D0E8ED', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const },
  filterInput: { padding: '8px 12px', borderRadius: 8, border: '1.5px solid #D0E8ED', fontSize: 13, outline: 'none' },
  label: { fontSize: 11, fontWeight: 800, color: '#1A5F6E', display: 'block', marginBottom: 4, textTransform: 'uppercase' as const },
  btnApprove: { padding: '8px 16px', background: '#216A3A', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  btnEdit: { padding: '8px 16px', background: '#F0F8FA', color: '#1A5F6E', border: '1px solid #B0D8E0', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  btnDelete: { padding: '8px 16px', background: 'white', color: '#A94442', border: '1px solid #E5C7C7', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  btnGhost: { padding: '4px 8px', background: 'white', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', fontSize: 12 }
}

// ─── EDIT PANELS ───────────────────────────────────────────

function WordEditPanel({ word, onChange, onSave, onApprove, onCancel, onDelete, saving }: any) {
  return (
    <div style={styles.editPanel}>
      <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#1A5F6E' }}>✏️ Kelime Düzenle</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1rem' }}>
        <div><label style={styles.label}>Türkçe</label><input style={styles.input} value={word.word_tr || ''} onChange={(e) => onChange({ ...word, word_tr: e.target.value })} /></div>
        <div><label style={styles.label}>İngilizce</label><input style={styles.input} value={word.word_en || ''} onChange={(e) => onChange({ ...word, word_en: e.target.value })} /></div>
        <div><label style={styles.label}>Süryanice</label><input style={{ ...styles.input, direction: 'rtl' }} value={word.word_syc || ''} onChange={(e) => onChange({ ...word, word_syc: e.target.value })} /></div>
        <div><label style={styles.label}>Transliteration</label><input style={styles.input} value={word.transliteration || ''} onChange={(e) => onChange({ ...word, transliteration: e.target.value })} /></div>
        <div><label style={styles.label}>Tür</label><input style={styles.input} value={word.pos || ''} onChange={(e) => onChange({ ...word, pos: e.target.value })} /></div>
        <div><label style={styles.label}>Lemma</label><input style={styles.input} value={word.lemma || ''} onChange={(e) => onChange({ ...word, lemma: e.target.value })} /></div>
        <div><label style={styles.label}>Surface Form</label><input style={styles.input} value={word.surface_form || ''} onChange={(e) => onChange({ ...word, surface_form: e.target.value })} /></div>
        <div><label style={styles.label}>Normalized</label><input style={styles.input} value={word.normalized_form || ''} onChange={(e) => onChange({ ...word, normalized_form: e.target.value })} /></div>
        <div><label style={styles.label}>Dil</label><input style={styles.input} value={word.language || word.language_detected || ''} onChange={(e) => onChange({ ...word, language: e.target.value })} /></div>
      </div>
      <div style={{ marginBottom: '1rem' }}><label style={styles.label}>Context Sentence</label><textarea style={styles.input} rows={2} value={word.context_sentence || ''} onChange={(e) => onChange({ ...word, context_sentence: e.target.value })} /></div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onSave} disabled={saving} style={styles.btnEdit}>💾 Kaydet</button>
        <button onClick={onApprove} disabled={saving} style={styles.btnApprove}>✅ Kaydet & Onayla</button>
        <button onClick={onCancel} style={{ ...styles.btnDelete, color: '#666' }}>İptal</button>
        <button onClick={onDelete} style={{ ...styles.btnDelete, marginLeft: 'auto' }}>🗑 Sil</button>
      </div>
    </div>
  )
}

function GrammarEditPanel({ grammar, categories, onChange, onSave, onApprove, onCancel, onDelete, saving }: any) {
  return (
    <div style={styles.editPanel}>
      <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#1A5F6E' }}>✏️ Gramer Düzenle</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1rem' }}>
        <div><label style={styles.label}>Kural Adı</label><input style={styles.input} value={grammar.rule_name || ''} onChange={(e) => onChange({ ...grammar, rule_name: e.target.value })} /></div>
        <div>
          <label style={styles.label}>Kategori</label>
          <select
            style={styles.input}
            value={grammar.category_id || ''}
            onChange={(e) => onChange({ ...grammar, category_id: e.target.value })}
          >
            <option value="">Kategori seç</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div><label style={styles.label}>Dil</label><input style={styles.input} value={grammar.language || ''} onChange={(e) => onChange({ ...grammar, language: e.target.value })} /></div>
      </div>
      <div style={{ marginBottom: '1rem' }}><label style={styles.label}>Açıklama</label><textarea style={styles.input} rows={3} value={grammar.description || ''} onChange={(e) => onChange({ ...grammar, description: e.target.value })} /></div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onSave} disabled={saving} style={styles.btnEdit}>💾 Kaydet</button>
        <button onClick={onApprove} disabled={saving} style={styles.btnApprove}>✅ Kaydet & Onayla</button>
        <button onClick={onCancel} style={{ ...styles.btnDelete, color: '#666' }}>İptal</button>
        <button onClick={onDelete} style={{ ...styles.btnDelete, marginLeft: 'auto' }}>🗑 Sil</button>
      </div>
    </div>
  )
}

function SentenceEditPanel({ sentence, categories, onChange, onSave, onApprove, onCancel, onDelete, saving }: any) {
  return (
    <div style={styles.editPanel}>
      <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#1A5F6E' }}>✏️ Cümle Düzenle</h3>
      <div style={{ display: 'grid', gap: 12, marginBottom: '1rem' }}>
        <div><label style={styles.label}>Süryanice</label><textarea style={{ ...styles.input, direction: 'rtl', fontSize: 18, fontFamily: 'serif' }} rows={2} value={sentence.sentence_syc || ''} onChange={(e) => onChange({ ...sentence, sentence_syc: e.target.value })} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={styles.label}>Türkçe</label><textarea style={styles.input} rows={2} value={sentence.sentence_tr || ''} onChange={(e) => onChange({ ...sentence, sentence_tr: e.target.value })} /></div>
          <div><label style={styles.label}>İngilizce</label><textarea style={styles.input} rows={2} value={sentence.sentence_en || ''} onChange={(e) => onChange({ ...sentence, sentence_en: e.target.value })} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div><label style={styles.label}>Kaynak</label><input style={styles.input} value={sentence.source || ''} onChange={(e) => onChange({ ...sentence, source: e.target.value })} /></div>
          <div>
            <label style={styles.label}>Kategori</label>
            <select
              style={styles.input}
              value={sentence.category_id || ''}
              onChange={(e) => onChange({ ...sentence, category_id: e.target.value })}
            >
              <option value="">Kategori seç</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div><label style={styles.label}>Notlar</label><input style={styles.input} value={sentence.notes || ''} onChange={(e) => onChange({ ...sentence, notes: e.target.value })} /></div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={sentence.needs_review || false} onChange={e => onChange({...sentence, needs_review: e.target.checked})} />
          İnceleme gerekiyor olarak işaretle
        </label>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onSave} disabled={saving} style={styles.btnEdit}>💾 Kaydet</button>
        <button onClick={onApprove} disabled={saving} style={styles.btnApprove}>✅ Kaydet & Onayla</button>
        <button onClick={onCancel} style={{ ...styles.btnDelete, color: '#666' }}>İptal</button>
        <button onClick={onDelete} style={{ ...styles.btnDelete, marginLeft: 'auto' }}>🗑 Sil</button>
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ────────────────────────────────────────

export default function PendingPage() {
  const supabase = createClient()
  const router = useRouter()
  const locale = useLocale()
  const [tab, setTab] = useState<'words' | 'grammar' | 'sentences'>('words')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [words, setWords] = useState<PendingWord[]>([])
  const [grammar, setGrammar] = useState<PendingGrammar[]>([])
  const [sentences, setSentences] = useState<PendingSentence[]>([])
  const [grammarCategories, setGrammarCategories] = useState<{ id: string; name: string }[]>([])
  const [sentenceCategories, setSentenceCategories] = useState<{ id: string; name: string }[]>([])

  const [editingWord, setEditingWord] = useState<PendingWord | null>(null)
  const [editingGrammar, setEditingGrammar] = useState<PendingGrammar | null>(null)
  const [editingSentence, setEditingSentence] = useState<PendingSentence | null>(null)
  const [saving, setSaving] = useState(false)

  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set())
  const [selectedGrammar, setSelectedGrammar] = useState<Set<string>>(new Set())
  const [selectedSentences, setSelectedSentences] = useState<Set<string>>(new Set())

  // Words Local Filter States
  const [wordSearch, setWordSearch] = useState('')
  const [wordLangFilter, setWordLangFilter] = useState('all')
  const [wordPosFilter, setWordPosFilter] = useState('all')

  // Grammar Local Filter States
  const [grammarSearch, setGrammarSearch] = useState('')
  const [grammarLangFilter, setGrammarLangFilter] = useState('all')
  const [grammarCategoryFilter, setGrammarCategoryFilter] = useState('all')

  // Sentences Local Filter States
  const [sentenceSearch, setSentenceSearch] = useState('')
  const [sentenceLangFilter, setSentenceLangFilter] = useState('all')
  const [sentenceCategoryFilter, setSentenceCategoryFilter] = useState('all')

  async function load() {
    setLoading(true)
    const [{ data: w }, { data: g }, { data: s }, { data: gc }, { data: sc }] = await Promise.all([
      supabase.from('pending_words').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('pending_grammar').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('pending_sentences').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('categories').select('id,name').eq('type', 'grammar').order('name', { ascending: true }),
      supabase.from('categories').select('id,name').eq('type', 'sentence').order('name', { ascending: true })
    ])
    setWords(w || [])
    setGrammar(g || [])
    setSentences(s || [])
    setGrammarCategories(gc || [])
    setSentenceCategories(sc || [])
    setSelectedWords(new Set())
    setSelectedGrammar(new Set())
    setSelectedSentences(new Set())
    setLoading(false)
  }

  useEffect(() => { load() }, [tab]) // Sadece tab değiştiğinde load çağrılır. ReferenceError engellendi.

  // ─── SAFE APPROVE LOGIC ──────────────────────────────────

  async function approveWordSingle(w: PendingWord): Promise<ActionStatus> {
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'word', item: w })
      })
      const data = await res.json()
      return (data.result as ActionStatus) || 'error'
    } catch { return 'error' }
  }

  async function approveGrammarSingle(g: PendingGrammar): Promise<ActionStatus> {
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'grammar', item: g })
      })
      const data = await res.json()
      return (data.result as ActionStatus) || 'error'
    } catch { return 'error' }
  }

  async function approveSentenceSingle(s: PendingSentence): Promise<ActionStatus> {
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'sentence', item: s })
      })
      const data = await res.json()
      return (data.result as ActionStatus) || 'error'
    } catch { return 'error' }
  }

  // ─── UI FEEDBACK ─────────────────────────────────────────

  const setFeedback = (res: ActionStatus, type: 'word' | 'grammar' | 'sentence') => {
    const labels = { word: 'Kelime', grammar: 'Gramer', sentence: 'Cümle' }
    if (res === 'ok') setMessage(`✅ ${labels[type]} aktarıldı`)
    else if (res === 'duplicate') setError(`⏭ ${labels[type]} zaten mevcut, atlandı`)
    else setError(`⚠ ${labels[type]} aktarılırken hata oluştu`)
  }

  // ─── SAVE EDIT HANDLERS ──────────────────────────────────

  async function saveEditedWord(andApprove = false) {
    if (!editingWord) return
    setSaving(true)
    const { error: upE } = await supabase.from('pending_words').update(editingWord).eq('id', editingWord.id)
    if (upE) { setError(upE.message); setSaving(false); return }
    if (andApprove) {
      const res = await approveWordSingle(editingWord)
      setFeedback(res, 'word')
    } else setMessage('✅ Güncellendi')
    setEditingWord(null); setSaving(false); load()
  }

  async function saveEditedGrammar(andApprove = false) {
    if (!editingGrammar) return
    setSaving(true)
    const { error: upE } = await supabase.from('pending_grammar').update(editingGrammar).eq('id', editingGrammar.id)
    if (upE) { setError(upE.message); setSaving(false); return }
    if (andApprove) {
      const res = await approveGrammarSingle(editingGrammar)
      setFeedback(res, 'grammar')
    } else setMessage('✅ Güncellendi')
    setEditingGrammar(null); setSaving(false); load()
  }

  async function saveEditedSentence(andApprove = false) {
    if (!editingSentence) return
    const syc = (editingSentence.sentence_syc || '').trim()
    const tr = (editingSentence.sentence_tr || '').trim()
    const en = (editingSentence.sentence_en || '').trim()
    if (!syc && !tr && !en) { setError('Cümle içeriği boş olamaz'); return }
    
    setSaving(true)
    const { error: upE } = await supabase.from('pending_sentences').update(editingSentence).eq('id', editingSentence.id)
    if (upE) { setError(upE.message); setSaving(false); return }
    
    if (andApprove) {
      const res = await approveSentenceSingle(editingSentence)
      setFeedback(res, 'sentence')
    } else setMessage('✅ Güncellendi')
    
    setEditingSentence(null); setSaving(false); load()
  }

  // ─── BULK ACTIONS ─────────────────────────────────────────

  async function handleBulk(action: 'approve' | 'delete') {
    const targetSet = tab === 'words' ? selectedWords : tab === 'grammar' ? selectedGrammar : selectedSentences
    if (targetSet.size === 0) return
    if (action === 'delete' && !confirm(`${targetSet.size} kayıt silinecek. Onaylıyor musunuz?`)) return

    setLoading(true)
    const ids = Array.from(targetSet)
    const table = tab === 'words' ? 'pending_words' : tab === 'grammar' ? 'pending_grammar' : 'pending_sentences'

    if (action === 'delete') {
      await supabase.from(table).delete().in('id', ids)
      setMessage(`✅ ${ids.length} kayıt silindi`)
    } else {
      let ok = 0, skip = 0, err = 0
      for (const id of ids) {
        const item = tab === 'words' ? words.find(x => x.id === id) : tab === 'grammar' ? grammar.find(x => x.id === id) : sentences.find(x => x.id === id)
        if (item) {
          const res = tab === 'words' ? await approveWordSingle(item as PendingWord) : tab === 'grammar' ? await approveGrammarSingle(item as PendingGrammar) : await approveSentenceSingle(item as PendingSentence)
          if (res === 'ok') ok++
          else if (res === 'duplicate') skip++
          else err++
        }
      }
      setMessage(`✅ ${ok} onaylandı · ⏭ ${skip} atlandı · ⚠ ${err} hata`)
    }
    load()
  }

  // ─── FILTERING & HELPERS ─────────────────────────────────

  function getGrammarCategoryName(categoryId?: string) {
    const match = grammarCategories.find(c => c.id === categoryId)
    return match?.name || 'general'
  }

  function getSentenceCategoryName(categoryId?: string) {
    const match = sentenceCategories.find(c => c.id === categoryId)
    return match?.name || 'general'
  }

  const filteredWords = words.filter(w => {
    const matchesLang = wordLangFilter === 'all' || (w.language || w.language_detected || '').toLowerCase() === wordLangFilter
    const matchesPos = wordPosFilter === 'all' || (w.pos || '').toLowerCase() === wordPosFilter
    const q = wordSearch.toLowerCase()
    const matchesSearch = !wordSearch || 
      (w.word_tr || '').toLowerCase().includes(q) || 
      (w.word_en || '').toLowerCase().includes(q) || 
      (w.word_syc || '').toLowerCase().includes(q) || 
      (w.transliteration || '').toLowerCase().includes(q) || 
      (w.lemma || '').toLowerCase().includes(q) || 
      (w.surface_form || '').toLowerCase().includes(q) || 
      (w.normalized_form || '').toLowerCase().includes(q) || 
      (w.context_sentence || '').toLowerCase().includes(q)
    return matchesLang && matchesPos && matchesSearch
  })

  const filteredGrammar = grammar.filter(g => {
    const matchesLang = grammarLangFilter === 'all' || (g.language || '').toLowerCase() === grammarLangFilter
    const matchesCategory = grammarCategoryFilter === 'all' || (g.category_id || '') === grammarCategoryFilter
    const q = grammarSearch.toLowerCase()
    const categoryName = getGrammarCategoryName(g.category_id).toLowerCase()
    const matchesSearch = !grammarSearch || 
      (g.rule_name || '').toLowerCase().includes(q) || 
      (g.description || '').toLowerCase().includes(q) || 
      (g.example || '').toLowerCase().includes(q) || 
      categoryName.includes(q)
    return matchesLang && matchesCategory && matchesSearch
  })

  const filteredSentences = sentences.filter(s => {
    const matchesLang = sentenceLangFilter === 'all' || s.base_language === sentenceLangFilter
    const matchesCategory = sentenceCategoryFilter === 'all' || s.category_id === sentenceCategoryFilter
    const searchLow = sentenceSearch.toLowerCase()
    const categoryName = getSentenceCategoryName(s.category_id).toLowerCase()
    const matchesSearch = !sentenceSearch || 
      norm(s.sentence_syc || '').includes(searchLow) || 
      norm(s.sentence_tr || '').includes(searchLow) || 
      norm(s.sentence_en || '').includes(searchLow) || 
      norm(s.source || '').includes(searchLow) || 
      norm(s.notes || '').includes(searchLow) ||
      categoryName.includes(searchLow)
    return matchesLang && matchesCategory && matchesSearch
  })

  function toggleSelect(id: string, set: Set<string>, setter: any) {
    const n = new Set(set); n.has(id) ? n.delete(id) : n.add(id); setter(n)
  }

  const isEditing = editingWord || editingGrammar || editingSentence

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Pending Onay Paneli</h1>

      {message && <div style={{ background: '#EEF8F1', color: '#216A3A', padding: 14, borderRadius: 12, marginBottom: '1.5rem', fontWeight: 600 }}>{message}</div>}
      {error && <div style={{ background: '#FFF7F7', color: '#A94442', padding: 14, borderRadius: 12, marginBottom: '1.5rem', fontWeight: 600 }}>{error}</div>}

      <div style={styles.tabBar}>
        <button onClick={() => setTab('words')} style={styles.tabBtn(tab === 'words')}>WORDS ({words.length})</button>
        <button onClick={() => setTab('grammar')} style={styles.tabBtn(tab === 'grammar')}>GRAMMAR ({grammar.length})</button>
        <button onClick={() => setTab('sentences')} style={styles.tabBtn(tab === 'sentences')}>SENTENCES ({sentences.length})</button>
      </div>

      {tab === 'words' && editingWord && (
        <WordEditPanel 
          word={editingWord} 
          onChange={setEditingWord} 
          onSave={() => saveEditedWord(false)} 
          onApprove={() => saveEditedWord(true)} 
          onCancel={() => setEditingWord(null)} 
          onDelete={() => { 
            if(confirm('Silinsin mi?')) { 
              supabase.from('pending_words').delete().eq('id', editingWord.id).then(() => {
                setEditingWord(null); 
                load(); 
              }) 
            } 
          }} 
          saving={saving} 
        />
      )}
      {tab === 'grammar' && editingGrammar && (
        <GrammarEditPanel 
          grammar={editingGrammar} 
          categories={grammarCategories}
          onChange={setEditingGrammar} 
          onSave={() => saveEditedGrammar(false)} 
          onApprove={() => saveEditedGrammar(true)} 
          onCancel={() => setEditingGrammar(null)} 
          onDelete={() => { 
            if(confirm('Silinsin mi?')) { 
              supabase.from('pending_grammar').delete().eq('id', editingGrammar.id).then(() => {
                setEditingGrammar(null); 
                load(); 
              }) 
            } 
          }} 
          saving={saving} 
        />
      )}
      {tab === 'sentences' && editingSentence && (
        <SentenceEditPanel 
          sentence={editingSentence}
          categories={sentenceCategories}
          onChange={setEditingSentence} 
          onSave={() => saveEditedSentence(false)} 
          onApprove={() => saveEditedSentence(true)} 
          onCancel={() => setEditingSentence(null)} 
          onDelete={() => { 
            if(confirm('Silinsin mi?')) { 
              supabase.from('pending_sentences').delete().eq('id', editingSentence.id).then(() => {
                setEditingSentence(null); 
                load(); 
              }) 
            } 
          }} 
          saving={saving} 
        />
      )}

      <div style={styles.actionBar}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#556677' }}>
          {tab === 'words' ? selectedWords.size : tab === 'grammar' ? selectedGrammar.size : selectedSentences.size} kayıt seçildi
        </span>
        <button style={styles.btnGhost} onClick={() => {
          if (tab === 'words') setSelectedWords(new Set(filteredWords.map(x => x.id)))
          else if (tab === 'grammar') setSelectedGrammar(new Set(filteredGrammar.map(x => x.id)))
          else setSelectedSentences(new Set(filteredSentences.map(x => x.id)))
        }}>Tümünü Seç</button>
        <button style={styles.btnGhost} onClick={() => {
          if (tab === 'words') setSelectedWords(new Set())
          else if (tab === 'grammar') setSelectedGrammar(new Set())
          else setSelectedSentences(new Set())
        }}>Temizle</button>

        {tab === 'words' && (
          <>
            <div style={{ width: 1, height: 20, background: '#ddd', margin: '0 8px' }} />
            <input 
              placeholder="🔍 Ara (TR, EN, Süryanice, lemma...)" 
              value={wordSearch} 
              onChange={e => setWordSearch(e.target.value)} 
              style={styles.filterInput}
            />
            <select 
              value={wordLangFilter} 
              onChange={e => setWordLangFilter(e.target.value)} 
              style={styles.filterInput}
            >
              <option value="all">Tüm Diller</option>
              <option value="tr">Türkçe</option>
              <option value="en">İngilizce</option>
              <option value="syc">Süryanice</option>
              <option value="arc">Aramice</option>
              <option value="other">Diğer</option>
            </select>
            <select 
              value={wordPosFilter} 
              onChange={e => setWordPosFilter(e.target.value)} 
              style={styles.filterInput}
            >
              <option value="all">Tüm Türler</option>
              <option value="isim">İsim</option>
              <option value="fiil">Fiil</option>
              <option value="sıfat">Sıfat</option>
              <option value="zarf">Zarf</option>
              <option value="zamir">Zamir</option>
              <option value="edat">Edat</option>
              <option value="bağlaç">Bağlaç</option>
              <option value="ünlem">Ünlem</option>
              <option value="diğer">Diğer</option>
            </select>
          </>
        )}

        {tab === 'grammar' && (
          <>
            <div style={{ width: 1, height: 20, background: '#ddd', margin: '0 8px' }} />
            <input 
              placeholder="🔍 Ara (başlık, açıklama, kategori...)" 
              value={grammarSearch} 
              onChange={e => setGrammarSearch(e.target.value)} 
              style={styles.filterInput}
            />
            <select 
              value={grammarLangFilter} 
              onChange={e => setGrammarLangFilter(e.target.value)} 
              style={styles.filterInput}
            >
              <option value="all">Tüm Diller</option>
              <option value="turkish">Türkçe</option>
              <option value="english">İngilizce</option>
              <option value="syriac">Süryanice</option>
              <option value="german">Almanca</option>
            </select>
            <select 
              value={grammarCategoryFilter} 
              onChange={e => setGrammarCategoryFilter(e.target.value)} 
              style={styles.filterInput}
            >
              <option value="all">Tüm Kategoriler</option>
              {grammarCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </>
        )}

        {tab === 'sentences' && (
          <>
            <div style={{ width: 1, height: 20, background: '#ddd', margin: '0 8px' }} />
            <input 
              placeholder="🔍 Ara (Cümle, kaynak, not...)" 
              value={sentenceSearch} 
              onChange={e => setSentenceSearch(e.target.value)} 
              style={styles.filterInput}
            />
            <select 
              value={sentenceLangFilter} 
              onChange={e => setSentenceLangFilter(e.target.value)} 
              style={styles.filterInput}
            >
              <option value="all">Tüm Diller</option>
              <option value="syc">Süryanice</option>
              <option value="tr">Türkçe</option>
              <option value="en">İngilizce</option>
              <option value="arc">Aramice</option>
              <option value="de">Almanca</option>
            </select>
            <select 
              value={sentenceCategoryFilter} 
              onChange={e => setSentenceCategoryFilter(e.target.value)} 
              style={styles.filterInput}
            >
              <option value="all">Tüm Kategoriler</option>
              {sentenceCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </>
        )}

        <div style={{ flex: 1 }} />
        <button style={styles.btnApprove} onClick={() => handleBulk('approve')}>✅ Seçilenleri Onayla</button>
        <button style={styles.btnDelete} onClick={() => handleBulk('delete')}>🗑 Seçilenleri Sil</button>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '3rem', color: '#889' }}>Yükleniyor...</div> : (
        <div style={{ opacity: isEditing ? 0.4 : 1, pointerEvents: isEditing ? 'none' : 'auto', transition: '0.3s' }}>
          
          {tab === 'words' && filteredWords.map(w => (
            <div key={w.id} style={styles.card}>
              <input type="checkbox" checked={selectedWords.has(w.id)} onChange={() => toggleSelect(w.id, selectedWords, setSelectedWords)} style={{ width: 18, height: 18, accentColor: '#1A5F6E' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <b style={{ fontSize: 17, color: '#1A2B3C' }}>{w.word_tr || w.lemma || '—'}</b>
                  <span style={{ fontSize: 11, background: '#eee', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>{w.language_detected?.toUpperCase()}</span>
                </div>
                <div style={{ direction: 'rtl', fontSize: '1.5rem', fontFamily: 'serif', marginBottom: 8 }}>{w.word_syc}</div>
                <div style={{ color: '#556', fontSize: 14, marginBottom: 8 }}>EN: {w.word_en || '—'} | Trans: {w.transliteration || '—'} | POS: {w.pos || '—'}</div>
                <div style={{ fontSize: 12, color: '#999' }}>Lemma: {w.lemma} | Surface: {w.surface_form} | Norm: {w.normalized_form}</div>
                {w.context_sentence && <div style={{ marginTop: 8, fontSize: 13, fontStyle: 'italic', color: '#666', borderLeft: '3px solid #ddd', paddingLeft: 10 }}>"{w.context_sentence}"</div>}
                <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
                  <button style={styles.btnApprove} onClick={() => approveWordSingle(w).then(res => { setFeedback(res, 'word'); load(); })}>Hızlı Onay</button>
                  <button style={styles.btnEdit} onClick={() => router.push(`/${locale}/admin/words?pendingId=${w.id}`)}>Düzenle</button>
                  <button style={styles.btnDelete} onClick={() => { if(confirm('Silinsin mi?')) supabase.from('pending_words').delete().eq('id', w.id).then(load) }}>Sil</button>
                </div>
              </div>
            </div>
          ))}

          {tab === 'grammar' && filteredGrammar.map(g => (
            <div key={g.id} style={styles.card}>
              <input type="checkbox" checked={selectedGrammar.has(g.id)} onChange={() => toggleSelect(g.id, selectedGrammar, setSelectedGrammar)} style={{ width: 18, height: 18, accentColor: '#1A5F6E' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <b style={{ fontSize: 16 }}>{g.rule_name}</b>
                  <span style={{ fontSize: 11, background: '#E8F4F6', color: '#1A5F6E', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                    {getGrammarCategoryName(g.category_id).toUpperCase()}
                  </span>
                </div>
                <p style={{ margin: '0 0 10px 0', color: '#444', fontSize: 14 }}>{g.description}</p>
                <div style={{ fontSize: 12, color: '#888' }}>Dil: {g.language}</div>
                <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
                  <button style={styles.btnApprove} onClick={() => approveGrammarSingle(g).then(res => { setFeedback(res, 'grammar'); load(); })}>Onayla</button>
                  <button style={styles.btnEdit} onClick={() => setEditingGrammar(g)}>Düzenle</button>
                  <button style={styles.btnDelete} onClick={() => { if(confirm('Silinsin mi?')) supabase.from('pending_grammar').delete().eq('id', g.id).then(load) }}>Sil</button>
                </div>
              </div>
            </div>
          ))}

          {tab === 'sentences' && filteredSentences.map(s => (
            <div key={s.id} style={styles.card}>
              <input type="checkbox" checked={selectedSentences.has(s.id)} onChange={() => toggleSelect(s.id, selectedSentences, setSelectedSentences)} style={{ width: 18, height: 18, accentColor: '#1A5F6E' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <span style={{ fontSize: 11, background: '#F0F8FA', color: '#1A5F6E', border: '1px solid #B0D8E0', padding: '3px 8px', borderRadius: 99, fontWeight: 700, marginRight: 8 }}>{s.base_language?.toUpperCase()}</span>
                    <span style={{ fontSize: 11, background: '#F4F4F4', color: '#555', border: '1px solid #ddd', padding: '3px 8px', borderRadius: 99, fontWeight: 700 }}>{getSentenceCategoryName(s.category_id).toUpperCase()}</span>
                  </div>
                  <span style={{ fontSize: 11, color: '#999' }}>Kaynak: <b>{s.source}</b></span>
                </div>
                <div style={{ direction: 'rtl', fontSize: '1.4rem', fontFamily: 'serif', fontWeight: 600, color: '#1A2B3C', marginBottom: 10 }}>{s.sentence_syc}</div>
                <div style={{ fontSize: 14, color: '#444', marginBottom: 4 }}><b>TR:</b> {s.sentence_tr}</div>
                <div style={{ fontSize: 14, color: '#444', marginBottom: 8 }}><b>EN:</b> {s.sentence_en}</div>
                {s.needs_review && (
                  <div style={{ fontSize: 10, color: '#A94442', fontWeight: 800, background: '#FFF5F5', padding: '4px 10px', borderRadius: '6px', border: '1px solid #E5C7C7', width: 'fit-content', marginBottom: 8 }}>
                    ⚠️ İNCELEME GEREKLİ
                  </div>
                )}
                {s.notes && <div style={{ fontSize: 12, color: '#666', background: '#f9f9f9', padding: '6px 10px', borderRadius: 6, borderLeft: '3px solid #ddd' }}><b>NOT:</b> {s.notes}</div>}
                <div style={{ marginTop: 15, display: 'flex', gap: 10 }}>
                  <button style={styles.btnApprove} onClick={() => approveSentenceSingle(s).then(res => { setFeedback(res, 'sentence'); load(); })}>Hızlı Onay</button>
                  <button style={styles.btnEdit} onClick={() => setEditingSentence(s)}>Düzenle</button>
                  <button style={styles.btnDelete} onClick={() => { if(confirm('Silinsin mi?')) supabase.from('pending_sentences').delete().eq('id', s.id).then(load) }}>Sil</button>
                </div>
              </div>
            </div>
          ))}

          {tab === 'words' && filteredWords.length === 0 && <p style={{ textAlign: 'center', color: '#888', marginTop: '2rem' }}>Eşleşen kelime bulunamadı.</p>}
          {tab === 'grammar' && filteredGrammar.length === 0 && <p style={{ textAlign: 'center', color: '#888', marginTop: '2rem' }}>Eşleşen gramer bulunamadı.</p>}
          {tab === 'sentences' && filteredSentences.length === 0 && <p style={{ textAlign: 'center', color: '#888', marginTop: '2rem' }}>Eşleşen cümle bulunamadı.</p>}
        </div>
      )}
    </div>
  )
}