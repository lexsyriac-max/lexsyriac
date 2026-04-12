'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'

interface Rule {
  id: string
  rule_title: string
  rule_description: string
  example_en: string
  category_id: string | null
  language: string
  order_index: number
}

interface Category {
  id: string
  name: string
  type: string
}

const LANGUAGES = [
  { value: 'turkish', label: 'Türkçe', flag: '🇹🇷' },
  { value: 'english', label: 'İngilizce', flag: '🇬🇧' },
  { value: 'syriac', label: 'Süryanice', flag: '🟦' },
  { value: 'german', label: 'Almanca', flag: '🇩🇪' },
]

export default function GrammarAdminPage() {
  const supabase = createClient()

  const [rules, setRules] = useState<Rule[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Gelişmiş Filtre State'leri
  const [grammarSearch, setGrammarSearch] = useState('')
  const [grammarLangFilter, setGrammarLangFilter] = useState('all')
  const [grammarCategoryFilter, setGrammarCategoryFilter] = useState('all')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    rule_title: '',
    rule_description: '',
    example_en: '',
    category_id: '',
    language: 'turkish',
  })

  const [message, setMessage] = useState({ type: '', text: '' })

  function showStatus(type: 'success' | 'error', text: string) {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  function getDefaultGrammarCategoryId(list: Category[]) {
    return list.find(c => c.type === 'grammar' && c.name.toLowerCase() === 'general')?.id || ''
  }

  function getCategoryName(categoryId?: string | null) {
    const match = categories.find(c => c.id === categoryId)
    return match?.name || 'general'
  }

  async function loadRules() {
    setLoading(true)

    const [rulesRes, catRes] = await Promise.all([
      supabase
        .from('grammar_rules')
        .select('*')
        .order('language', { ascending: true })
        .order('order_index', { ascending: true }),
      supabase
        .from('categories')
        .select('id,name,type')
        .eq('type', 'grammar')
        .order('name', { ascending: true }),
    ])

    if (rulesRes.error) {
      showStatus('error', 'Veriler güncellenirken bir hata oluştu.')
    } else {
      setRules((rulesRes.data as Rule[]) || [])
    }

    if (!catRes.error) {
      const catData = (catRes.data as Category[]) || []
      setCategories(catData)

      if (!editingId) {
        const defaultId = getDefaultGrammarCategoryId(catData)
        setFormData(prev => ({
          ...prev,
          category_id: prev.category_id || defaultId,
        }))
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    loadRules()
  }, [])

  // Yerel Filtreleme Mantığı (Pending Paneli ile Aynı)
  const filteredRules = useMemo(() => {
    return rules.filter(r => {
      const matchesLang = grammarLangFilter === 'all' || r.language === grammarLangFilter
      const matchesCategory = grammarCategoryFilter === 'all' || r.category_id === grammarCategoryFilter
      
      const q = grammarSearch.toLowerCase()
      const categoryName = getCategoryName(r.category_id).toLowerCase()
      
      const matchesSearch = !grammarSearch || 
        r.rule_title.toLowerCase().includes(q) || 
        r.rule_description.toLowerCase().includes(q) || 
        (r.example_en || '').toLowerCase().includes(q) || 
        categoryName.includes(q)

      return matchesLang && matchesCategory && matchesSearch
    })
  }, [rules, grammarSearch, grammarLangFilter, grammarCategoryFilter, categories])

  function resetForm() {
    const defaultId = getDefaultGrammarCategoryId(categories)
    setEditingId(null)
    setFormData({
      rule_title: '',
      rule_description: '',
      example_en: '',
      category_id: defaultId,
      language: 'turkish',
    })
  }

  function handleEditInitiate(rule: Rule) {
    setEditingId(rule.id)
    setFormData({
      rule_title: rule.rule_title,
      rule_description: rule.rule_description,
      example_en: rule.example_en || '',
      category_id: rule.category_id || '',
      language: rule.language || 'turkish',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.rule_title.trim() || !formData.rule_description.trim()) {
      showStatus('error', 'Başlık ve açıklama zorunludur.')
      return
    }

    setSaving(true)

    const fallbackCategoryId =
      formData.category_id ||
      categories.find(c => c.type === 'grammar' && c.name.toLowerCase() === 'general')?.id ||
      null

    const payload = {
      rule_title: formData.rule_title.trim(),
      rule_description: formData.rule_description.trim(),
      example_en: formData.example_en.trim(),
      category_id: fallbackCategoryId,
      language: formData.language,
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('grammar_rules')
          .update(payload)
          .eq('id', editingId)

        if (error) throw error
        showStatus('success', 'Güncellendi.')
      } else {
        const { error } = await supabase
          .from('grammar_rules')
          .insert([{ ...payload, order_index: 0 }])

        if (error) throw error
        showStatus('success', 'Eklendi.')
      }

      resetForm()
      await loadRules()
    } catch (err: any) {
      showStatus('error', err.message || 'İşlem başarısız.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu kuralı silmek istediğinize emin misiniz?')) return

    const { error } = await supabase.from('grammar_rules').delete().eq('id', id)

    if (error) {
      showStatus('error', 'Silme başarısız.')
    } else {
      showStatus('success', 'Kural silindi.')
      if (editingId === id) resetForm()
      await loadRules()
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#1A2B3C', fontWeight: 700 }}>Gramer Yönetimi</h1>
      </header>

      {/* Kayıt / Düzenleme Formu */}
      <section
        style={{
          background: '#f8fbfc',
          padding: '1.5rem',
          borderRadius: '16px',
          border: '1px solid #e1e8ed',
          marginBottom: '2.5rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '1.25rem', color: '#1A5F6E' }}>
          {editingId ? '✏️ Kuralı Düzenle' : '➕ Yeni Gramer Kuralı'}
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <input
            value={formData.rule_title}
            onChange={e => setFormData({ ...formData, rule_title: e.target.value })}
            placeholder="Kural Başlığı"
            style={{ padding: '12px', borderRadius: '10px', border: '1px solid #D0E8ED', outline: 'none' }}
          />

          <textarea
            value={formData.rule_description}
            onChange={e => setFormData({ ...formData, rule_description: e.target.value })}
            placeholder="Kural Açıklaması"
            rows={4}
            style={{ padding: '12px', borderRadius: '10px', border: '1px solid #D0E8ED', outline: 'none', resize: 'vertical' }}
          />

          <input
            value={formData.example_en}
            onChange={e => setFormData({ ...formData, example_en: e.target.value })}
            placeholder="Örnek Cümle (Gramer yapısını gösteren)"
            style={{ padding: '12px', borderRadius: '10px', border: '1px solid #D0E8ED', outline: 'none' }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#1A5F6E' }}>AÇIKLAMA DİLİ</label>
              <select
                value={formData.language}
                onChange={e => setFormData({ ...formData, language: e.target.value })}
                style={{ padding: '11px', borderRadius: '10px', border: '1px solid #D0E8ED', background: 'white' }}
              >
                {LANGUAGES.map(l => (
                  <option key={l.value} value={l.value}>
                    {l.flag} {l.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#1A5F6E' }}>KATEGORİ</label>
              <select
                value={formData.category_id}
                onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                style={{ padding: '11px', borderRadius: '10px', border: '1px solid #D0E8ED', background: 'white' }}
              >
                <option value="">Kategori seçin</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 2,
                padding: '13px',
                background: '#1A5F6E',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '15px'
              }}
            >
              {saving ? '⏳ İşleniyor...' : editingId ? 'Güncelle' : 'Kaydet'}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                style={{
                  flex: 1,
                  padding: '13px',
                  background: '#eee',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                İptal
              </button>
            )}
          </div>
        </form>

        {message.text && (
          <div
            style={{
              marginTop: '1.25rem',
              padding: '12px',
              borderRadius: '10px',
              background: message.type === 'success' ? '#EEF8F1' : '#FFF7F7',
              color: message.type === 'success' ? '#216A3A' : '#A94442',
              fontSize: '14px',
              textAlign: 'center',
              fontWeight: 600,
              border: `1px solid ${message.type === 'success' ? '#B7DEC2' : '#E5C7C7'}`
            }}
          >
            {message.text}
          </div>
        )}
      </section>

      {/* Gelişmiş Filtre Alanı (Pending Paneli Tasarımı) */}
      <section
        style={{
          marginBottom: '2rem',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          background: '#F0F4F7',
          padding: '14px 18px',
          borderRadius: '14px',
          border: '1px solid #D1D9E0',
          flexWrap: 'wrap'
        }}
      >
        <input 
          placeholder="🔍 Ara (başlık, açıklama, kategori...)" 
          value={grammarSearch} 
          onChange={e => setGrammarSearch(e.target.value)} 
          style={{ 
            flex: 2, 
            minWidth: '240px',
            padding: '9px 14px', 
            borderRadius: '10px', 
            border: '1.5px solid #D0E8ED', 
            fontSize: '14px',
            outline: 'none'
          }}
        />

        <select
          value={grammarLangFilter}
          onChange={e => setGrammarLangFilter(e.target.value)}
          style={{ 
            padding: '9px', 
            borderRadius: '10px', 
            border: '1.5px solid #D0E8ED', 
            background: 'white',
            fontSize: '14px',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="all">Tüm Diller</option>
          {LANGUAGES.map(l => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>

        <select
          value={grammarCategoryFilter}
          onChange={e => setGrammarCategoryFilter(e.target.value)}
          style={{ 
            padding: '9px', 
            borderRadius: '10px', 
            border: '1.5px solid #D0E8ED', 
            background: 'white',
            fontSize: '14px',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="all">Tüm Kategoriler</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <div style={{ flex: 1, textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#1A5F6E' }}>
          {filteredRules.length} kural listeleniyor
        </div>
      </section>

      {/* Liste Alanı */}
      {loading && rules.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Veriler yükleniyor...</div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredRules.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '12px', border: '1px dashed #ccc', color: '#888' }}>
              Eşleşen gramer kuralı bulunamadı.
            </div>
          )}
          {filteredRules.map(rule => {
            const langInfo = LANGUAGES.find(l => l.value === rule.language)
            const categoryName = getCategoryName(rule.category_id)

            return (
              <div
                key={rule.id}
                style={{
                  border: '1px solid #e1e8ed',
                  padding: '1.25rem',
                  borderRadius: '16px',
                  background: editingId === rule.id ? '#F0F8FA' : 'white',
                  transition: '0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      background: '#1A5F6E',
                      color: 'white',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em'
                    }}
                  >
                    {categoryName}
                  </span>

                  <span style={{ fontSize: '1.2rem' }} title={langInfo?.label}>
                    {langInfo?.flag || '🌐'}
                  </span>
                </div>

                <h4 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: '#1A2B3C', fontWeight: 700 }}>
                  {rule.rule_title}
                </h4>
                <p style={{ margin: '0 0 14px 0', fontSize: '14.5px', color: '#444', lineHeight: '1.6' }}>
                  {rule.rule_description}
                </p>

                {rule.example_en && (
                  <div
                    style={{
                      background: '#F8FAFB',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      borderLeft: '4px solid #CBD5E0',
                      marginBottom: '14px',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Örnek</div>
                    <i style={{ fontSize: '13.5px', color: '#2D3748' }}>"{rule.example_en}"</i>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid #F0F4F8', paddingTop: '12px' }}>
                  <button
                    onClick={() => handleEditInitiate(rule)}
                    style={{
                      background: '#E6FFFA',
                      color: '#2C7A7B',
                      border: '1px solid #B2F5EA',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12.5px',
                      fontWeight: 700,
                    }}
                  >
                    ✏️ Düzenle
                  </button>

                  <button
                    onClick={() => handleDelete(rule.id)}
                    style={{
                      background: 'white',
                      color: '#C53030',
                      border: '1px solid #FEB2B2',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12.5px',
                      fontWeight: 700,
                    }}
                  >
                    🗑 Sil
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}