'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Rule {
  id: string
  rule_title: string
  rule_description: string
  example_en: string
  category: string
  language: string
  order_index: number
}

const CATEGORIES = [
  { value: 'all', label: 'Tümü' },
  { value: 'noun', label: 'İsim' },
  { value: 'verb', label: 'Fiil' },
  { value: 'adjective', label: 'Sıfat' },
  { value: 'conjunction', label: 'Bağlaç' },
  { value: 'pronoun', label: 'Zamir' },
  { value: 'sentence', label: 'Cümle' },
  { value: 'number', label: 'Sayı' },
  { value: 'other', label: 'Diğer' },
]

const LANGUAGES = [
  { value: 'all', label: 'Tüm Diller' },
  { value: 'turkish', label: 'Türkçe' },
  { value: 'english', label: 'İngilizce' },
  { value: 'syriac', label: 'Süryanice' },
]

function getFlag(lang: string) {
  switch (lang) {
    case 'turkish': return '🇹🇷'
    case 'english': return '🇬🇧'
    case 'syriac': return '🟦' // Süryanice için sembolik (özel bayrak yok)
    default: return '🌐'
  }
}

export default function GrammarPage() {
  const supabase = createClient()

  const [rules, setRules] = useState<Rule[]>([])
  const [loaded, setLoaded] = useState(false)

  const [categoryFilter, setCategoryFilter] = useState('all')
  const [languageFilter, setLanguageFilter] = useState('all')

  const [editing, setEditing] = useState<Rule | null>(null)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [example, setExample] = useState('')
  const [category, setCategory] = useState('noun')
  const [language, setLanguage] = useState('turkish')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    const { data } = await supabase
      .from('grammar_rules')
      .select('*')
      .order('category')
      .order('order_index')

    setRules(data || [])
    setLoaded(true)
  }

  useEffect(() => {
    load()
  }, [])

  function openEdit(rule: Rule) {
    setEditing(rule)
    setTitle(rule.rule_title)
    setContent(rule.rule_description)
    setExample(rule.example_en || '')
    setCategory(rule.category)
    setLanguage(rule.language || 'turkish')
  }

  function resetForm() {
    setEditing(null)
    setTitle('')
    setContent('')
    setExample('')
    setCategory('noun')
    setLanguage('turkish')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim() || !content.trim()) {
      setError('Başlık ve içerik zorunlu')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    if (editing) {
      await supabase
        .from('grammar_rules')
        .update({
          rule_title: title,
          rule_description: content,
          example_en: example,
          category,
          language,
        })
        .eq('id', editing.id)
    } else {
      await supabase.from('grammar_rules').insert({
        rule_title: title,
        rule_description: content,
        example_en: example,
        category,
        language,
        order_index: 0,
      })
    }

    setMessage(editing ? 'Güncellendi' : 'Eklendi')
    resetForm()
    load()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Silinsin mi?')) return
    await supabase.from('grammar_rules').delete().eq('id', id)
    load()
  }

  if (!loaded) return <div style={{ padding: '2rem' }}>Yükleniyor...</div>

  const filtered = rules.filter((r) => {
    const catMatch = categoryFilter === 'all' || r.category === categoryFilter
    const langMatch = languageFilter === 'all' || r.language === languageFilter
    return catMatch && langMatch
  })

  return (
    <div className="container" style={{ padding: '2rem' }}>
      <h1>Gramer Kuralları</h1>

      {/* FILTERS */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="input">
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        <select value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)} className="input">
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
      </div>

      {/* FORM */}
      <form onSubmit={handleSave} style={{ display: 'grid', gap: '0.5rem', marginBottom: '2rem' }}>
        
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Kural başlığı"
          className="input"
        />

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Kural açıklaması"
          className="input"
        />

        <input
          value={example}
          onChange={(e) => setExample(e.target.value)}
          placeholder="Örnek cümle"
          className="input"
        />

        <select value={language} onChange={(e) => setLanguage(e.target.value)} className="input">
          {LANGUAGES.filter(l => l.value !== 'all').map(l => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>

        <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
          {CATEGORIES.filter(c => c.value !== 'all').map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        <button className="btn btn-primary">
          {editing ? 'Güncelle' : 'Kaydet'}
        </button>

        {editing && (
          <button type="button" className="btn btn-ghost" onClick={resetForm}>
            İptal
          </button>
        )}
      </form>

      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* LIST */}
      <div>
        {filtered.map((rule) => (
          <div key={rule.id} className="card" style={{ padding: '1rem', marginBottom: '0.5rem' }}>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>
                {rule.language} · {rule.category}
              </div>

              {/* 🔥 BAYRAK */}
              <div style={{ fontSize: '1.2rem' }}>
                {getFlag(rule.language)}
              </div>
            </div>

            <b>{rule.rule_title}</b>
            <p>{rule.rule_description}</p>
            <i>{rule.example_en}</i>

            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => openEdit(rule)}>✏️</button>
              <button onClick={() => handleDelete(rule.id)}>🗑</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}