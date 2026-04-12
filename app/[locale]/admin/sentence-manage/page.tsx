'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase'

type Sentence = {
  id: string
  sentence_syc: string | null
  sentence_tr: string | null
  sentence_en: string | null
  sentence_text: string | null
  language: string | null
  base_language: string | null
  notes: string | null
  source: string | null
  needs_review: boolean
  category_id: string | null
  created_at: string
}

type Category = { id: string; name: string }

const EMPTY = {
  sentence_syc: '',
  sentence_tr: '',
  sentence_en: '',
  sentence_text: '',
  language: 'syc',
  base_language: 'syc',
  notes: '',
  source: 'manual',
  needs_review: false,
  category_id: null as string | null,
}

export default function SentenceManagePage() {
  const locale = useLocale()
  const supabase = createClient()

  const [sentences, setSentences] = useState<Sentence[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [langFilter, setLangFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [reviewFilter, setReviewFilter] = useState('all')
  const [editing, setEditing] = useState<Sentence | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ ...EMPTY })
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkCategoryId, setBulkCategoryId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: s }, { data: c }] = await Promise.all([
      supabase.from('sentences').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('id,name').eq('type', 'sentence').order('name'),
    ])
    setSentences(s || [])
    setCategories(c || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  async function generateSyriac() {
    const syc = (formData.sentence_syc || '').trim()
    const tr = (formData.sentence_tr || '').trim()
    const en = (formData.sentence_en || '').trim()

    if (!syc && !tr && !en) {
      setError('En az bir dilde cümle girin')
      return
    }

    setGenerating(true)
    setError('')

    try {
      let englishSource = en
      let sourceLang = en ? 'English' : tr ? 'Turkish' : 'Syriac'

      if (!en && (tr || syc)) {
        const sourceText = tr || syc
        const fromLang = tr ? 'Turkish' : 'Classical Syriac'
        const step1Res = await fetch('/api/claude', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `Translate this ${fromLang} sentence to English. Return ONLY JSON: {"english": "...", "notes": ""}\n\nSentence: "${sourceText}"`,
          }),
        })
        const step1Data = await step1Res.json()
        const step1Raw = (step1Data.text || '').replace(/\`\`\`json|\`\`\`/g, '').trim()
        const step1Parsed = JSON.parse(step1Raw)
        englishSource = step1Parsed.english || sourceText
        sourceLang = fromLang
      }

      const prompt = `You are a multilingual translation engine for Classical Syriac.

Given this English sentence, produce:
1. Classical Syriac translation (sentence_syc) in Syriac script
2. Turkish translation (sentence_tr) — only if not already provided
3. Confidence level
4. Detailed translation notes explaining each word and grammar

Source language: ${sourceLang}
English sentence: "${englishSource}"
Already have Turkish: ${tr ? 'YES: ' + tr : 'NO'}
Already have Syriac: ${syc ? 'YES: ' + syc : 'NO'}

Return ONLY valid JSON:
{
  "sentence_syc": "...",
  "sentence_tr": "...",
  "sentence_en": "${englishSource}",
  "confidence": "high|medium|low",
  "notes": "Detailed explanation of translation choices, word meanings, grammar notes"
}`

      const claudeRes = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const claudeData = await claudeRes.json()
      const raw = (claudeData.text || '').replace(/\`\`\`json|\`\`\`/g, '').trim()
      const parsed = JSON.parse(raw)

      if (!parsed.sentence_syc && !parsed.sentence_tr) {
        setError('Çeviri üretilemedi')
        return
      }

      const noteText = parsed.notes || ''

      setFormData((p) => ({
        ...p,
        sentence_syc: parsed.sentence_syc || p.sentence_syc,
        sentence_tr: tr || parsed.sentence_tr || p.sentence_tr,
        sentence_en: englishSource || p.sentence_en,
        notes: noteText,
      }))

      setMessage(`✅ Çeviri tamamlandı (güven: ${parsed.confidence}) — ${noteText}`)
    } catch (e) {
      setError('Claude API hatası: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setGenerating(false)
    }
  }

  async function translateSentence() {
    const syc = (formData.sentence_syc || '').trim()
    const tr = (formData.sentence_tr || '').trim()
    const en = (formData.sentence_en || '').trim()
    const text = syc || tr || en

    if (!text) {
      setError('Çevrilecek bir cümle girin')
      return
    }

    setTranslating(true)
    setError('')

    try {
      const sourceLang = syc ? 'ar' : tr ? 'tr' : 'en'
      const results: Record<string, string> = {}
      const targets =
        sourceLang === 'ar' ? ['tr', 'en'] : sourceLang === 'tr' ? ['en'] : ['tr']

      for (const target of targets) {
        const res = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${target}`
        )
        const data = await res.json()
        if (data.responseStatus === 200) results[target] = data.responseData.translatedText
      }

      setFormData((p) => ({
        ...p,
        sentence_tr: results['tr'] || p.sentence_tr,
        sentence_en: results['en'] || p.sentence_en,
      }))
      setMessage('✅ Çeviri tamamlandı. Kontrol edip kaydedin.')
    } catch {
      setError('Çeviri başarısız.')
    } finally {
      setTranslating(false)
    }
  }

  async function handleSave() {
    const syc = (formData.sentence_syc || '').trim()
    const tr = (formData.sentence_tr || '').trim()
    const en = (formData.sentence_en || '').trim()

    if (!syc && !tr && !en) {
      setError('En az bir dilde cümle girin')
      return
    }

    setSaving(true)
    const payload = {
      sentence_syc: syc || null,
      sentence_tr: tr || null,
      sentence_en: en || null,
      sentence_text: syc || tr || en,
      language: formData.base_language || 'syc',
      base_language: formData.base_language || 'syc',
      notes: formData.notes || '',
      source: formData.source || 'manual',
      needs_review: formData.needs_review,
      category_id: formData.category_id || null,
    }

    if (editing) {
      const { error: e } = await supabase.from('sentences').update(payload).eq('id', editing.id)
      if (e) {
        setError(e.message)
        setSaving(false)
        return
      }
      setMessage('✅ Cümle güncellendi.')
    } else {
      const { error: e } = await supabase.from('sentences').insert(payload)
      if (e) {
        setError(e.message)
        setSaving(false)
        return
      }
      setMessage('✅ Cümle eklendi.')
    }

    setSaving(false)
    setShowForm(false)
    setEditing(null)
    setFormData({ ...EMPTY })
    load()
  }

  async function handleDelete(id: string) {
    const first = confirm('Bu cümle silinsin mi?')
    if (!first) return

    const second = prompt('Silme işlemini onaylamak için SİL yazın:')
    if (second !== 'SİL') {
      setError('Silme işlemi iptal edildi. Doğru onay metni girilmedi.')
      return
    }

    const { error: e } = await supabase.from('sentences').delete().eq('id', id)
    if (e) {
      setError(e.message)
      return
    }

    setSelectedIds((prev) => prev.filter((x) => x !== id))
    setMessage('✅ Silindi.')
    load()
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) {
      setError('Önce silmek için en az bir cümle seçin.')
      return
    }

    const first = confirm(
      `${selectedIds.length} cümle seçildi.\n\nSilme işlemi kalıcıdır.\n\nDevam etmek istiyor musunuz?`
    )
    if (!first) return

    const second = prompt(
      `Toplu silmeyi onaylamak için kutuya tam olarak SİL yazın.\n\nSeçili kayıt sayısı: ${selectedIds.length}`
    )
    if (second !== 'SİL') {
      setError('Toplu silme iptal edildi. Doğru onay metni girilmedi.')
      return
    }

    const { error: e } = await supabase.from('sentences').delete().in('id', selectedIds)
    if (e) {
      setError(e.message)
      return
    }

    setMessage(`✅ ${selectedIds.length} cümle silindi.`)
    setSelectedIds([])
    load()
  }

  async function handleBulkReview(value: boolean) {
    if (selectedIds.length === 0) {
      setError('Önce işlem yapmak için en az bir cümle seçin.')
      return
    }

    const { error: e } = await supabase
      .from('sentences')
      .update({ needs_review: value })
      .in('id', selectedIds)

    if (e) {
      setError(e.message)
      return
    }

    setMessage(
      value
        ? `✅ ${selectedIds.length} cümle incelemeye alındı.`
        : `✅ ${selectedIds.length} cümle onaylı yapıldı.`
    )
    setSelectedIds([])
    load()
  }

  async function handleBulkCategoryAssign() {
    if (selectedIds.length === 0) {
      setError('Önce işlem yapmak için en az bir cümle seçin.')
      return
    }

    if (!bulkCategoryId) {
      setError('Önce atanacak kategoriyi seçin.')
      return
    }

    const { error: e } = await supabase
      .from('sentences')
      .update({ category_id: bulkCategoryId })
      .in('id', selectedIds)

    if (e) {
      setError(e.message)
      return
    }

    const catName = categories.find((c) => c.id === bulkCategoryId)?.name || 'Seçilen kategori'
    setMessage(`✅ ${selectedIds.length} cümle "${catName}" kategorisine atandı.`)
    setSelectedIds([])
    setBulkCategoryId('')
    load()
  }

  function openEdit(s: Sentence) {
    setEditing(s)
    setFormData({
      sentence_syc: s.sentence_syc || '',
      sentence_tr: s.sentence_tr || '',
      sentence_en: s.sentence_en || '',
      sentence_text: s.sentence_text || '',
      language: s.language || 'syc',
      base_language: s.base_language || 'syc',
      notes: s.notes || '',
      source: s.source || 'manual',
      needs_review: s.needs_review,
      category_id: s.category_id,
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const filtered = sentences.filter((s) => {
    const q = search.toLowerCase()
    const matchSearch =
      !search ||
      [s.sentence_syc, s.sentence_tr, s.sentence_en, s.notes].some((v) =>
        (v || '').toLowerCase().includes(q)
      )
    const matchLang = langFilter === 'all' || s.base_language === langFilter
    const matchCat = categoryFilter === 'all' || s.category_id === categoryFilter
    const matchReview =
      reviewFilter === 'all' ||
      (reviewFilter === 'review' && s.needs_review) ||
      (reviewFilter === 'ok' && !s.needs_review)

    return matchSearch && matchLang && matchCat && matchReview
  })

  const allFilteredIds = filtered.map((s) => s.id)
  const allFilteredSelected =
    allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.includes(id))

  function toggleOne(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function toggleAllFiltered() {
    if (allFilteredIds.length === 0) return

    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)))
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])))
    }
  }

  function clearSelection() {
    setSelectedIds([])
  }

  const labelStyle = {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--color-primary)',
    display: 'block' as const,
    marginBottom: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
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
                Cümle Yönetimi
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          {[
            { label: 'TOPLAM CÜMLE', value: sentences.length },
            { label: 'İNCELEME GEREKLİ', value: sentences.filter((s) => s.needs_review).length },
            { label: 'SÜRYANİCE', value: sentences.filter((s) => s.base_language === 'syc').length },
            { label: 'TÜRKÇE', value: sentences.filter((s) => s.base_language === 'tr').length },
          ].map((c) => (
            <div key={c.label} className="card" style={{ padding: '1.25rem 1.5rem' }}>
              <div
                style={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {c.value}
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  letterSpacing: '0.08em',
                  color: 'var(--color-text-muted)',
                  marginTop: '0.25rem',
                }}
              >
                {c.label}
              </div>
            </div>
          ))}
        </div>

        {message && (
          <div
            style={{
              marginBottom: '1rem',
              background: '#EEF8F1',
              border: '1px solid #B7DEC2',
              color: '#216A3A',
              borderRadius: 'var(--radius-md)',
              padding: '0.875rem 1rem',
              fontSize: '0.9rem',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            {message}
            <button onClick={() => setMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
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
              color: 'var(--color-danger)',
              borderRadius: 'var(--radius-md)',
              padding: '0.875rem 1rem',
              fontSize: '0.9rem',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            {error}
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              ✕
            </button>
          </div>
        )}

        {showForm && (
          <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', border: '2px solid var(--color-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ color: 'var(--color-primary)' }}>
                {editing ? '✏️ Cümle Düzenle' : '➕ Yeni Cümle Ekle'}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); setEditing(null) }}>
                ✕ İptal
              </button>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Süryanice</label>
                <textarea
                  className="input"
                  rows={2}
                  style={{ direction: 'rtl', fontSize: '1.1rem', fontFamily: 'serif', width: '100%' }}
                  value={formData.sentence_syc || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, sentence_syc: e.target.value }))}
                  placeholder="ܣܘܪܝܝܐ..."
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button className="btn btn-accent" onClick={translateSentence} disabled={translating} style={{ minWidth: 160 }}>
                  {translating ? '⏳ Çevriliyor...' : '🌐 Üç Dile Çevir'}
                </button>

                <button className="btn btn-primary" onClick={generateSyriac} disabled={generating} style={{ minWidth: 180 }}>
                  {generating ? '⏳ Üretiliyor...' : '🤖 Süryanice Üret'}
                </button>

                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Dolu olan alanı kaynak dil olarak kullanır
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Türkçe</label>
                  <textarea
                    className="input"
                    rows={2}
                    style={{ width: '100%' }}
                    value={formData.sentence_tr || ''}
                    onChange={(e) => setFormData((p) => ({ ...p, sentence_tr: e.target.value }))}
                    placeholder="Türkçe çeviri..."
                  />
                </div>

                <div>
                  <label style={labelStyle}>İngilizce</label>
                  <textarea
                    className="input"
                    rows={2}
                    style={{ width: '100%' }}
                    value={formData.sentence_en || ''}
                    onChange={(e) => setFormData((p) => ({ ...p, sentence_en: e.target.value }))}
                    placeholder="English translation..."
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Temel Dil</label>
                  <select
                    className="input"
                    style={{ width: '100%' }}
                    value={formData.base_language || 'syc'}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        base_language: e.target.value,
                        language: e.target.value,
                      }))
                    }
                  >
                    <option value="syc">Süryanice</option>
                    <option value="tr">Türkçe</option>
                    <option value="en">İngilizce</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Kategori</label>
                  <select
                    className="input"
                    style={{ width: '100%' }}
                    value={formData.category_id || ''}
                    onChange={(e) => setFormData((p) => ({ ...p, category_id: e.target.value || null }))}
                  >
                    <option value="">Seçiniz</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Kaynak</label>
                  <input
                    className="input"
                    style={{ width: '100%' }}
                    value={formData.source || ''}
                    onChange={(e) => setFormData((p) => ({ ...p, source: e.target.value }))}
                    placeholder="manual, lexscan..."
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Notlar</label>
                <input
                  className="input"
                  style={{ width: '100%' }}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Opsiyonel not..."
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <input
                  type="checkbox"
                  checked={formData.needs_review}
                  onChange={(e) => setFormData((p) => ({ ...p, needs_review: e.target.checked }))}
                />
                İnceleme gerekiyor olarak işaretle
              </label>

              <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? '⏳ Kaydediliyor...' : editing ? '✅ Güncelle' : '✅ Kaydet'}
                </button>
                <button className="btn btn-ghost" onClick={() => { setShowForm(false); setEditing(null) }}>
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
          {!showForm && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditing(null)
                setFormData({ ...EMPTY })
                setShowForm(true)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            >
              + Cümle Ekle
            </button>
          )}

          <input
            className="input"
            style={{ flex: 1, minWidth: 200 }}
            placeholder="🔍 Ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select className="input" style={{ minWidth: 130 }} value={langFilter} onChange={(e) => setLangFilter(e.target.value)}>
            <option value="all">Tüm Diller</option>
            <option value="syc">Süryanice</option>
            <option value="tr">Türkçe</option>
            <option value="en">İngilizce</option>
          </select>

          <select className="input" style={{ minWidth: 150 }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">Tüm Kategoriler</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select className="input" style={{ minWidth: 140 }} value={reviewFilter} onChange={(e) => setReviewFilter(e.target.value)}>
            <option value="all">Tümü</option>
            <option value="review">İnceleme Gerekli</option>
            <option value="ok">Onaylı</option>
          </select>

          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
            {filtered.length} cümle
          </span>
        </div>

        {!loading && filtered.length > 0 && (
          <div
            className="card"
            style={{
              padding: '0.9rem 1rem',
              marginBottom: '1rem',
              display: 'grid',
              gap: '0.75rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <button className="btn btn-ghost btn-sm" onClick={toggleAllFiltered}>
                  {allFilteredSelected ? 'Tümünü Bırak' : 'Tümünü Seç'}
                </button>

                <button className="btn btn-ghost btn-sm" onClick={clearSelection} disabled={selectedIds.length === 0}>
                  Seçimi Temizle
                </button>

                <button className="btn btn-secondary btn-sm" onClick={() => handleBulkReview(true)} disabled={selectedIds.length === 0}>
                  İncelemeye Al
                </button>

                <button className="btn btn-ghost btn-sm" onClick={() => handleBulkReview(false)} disabled={selectedIds.length === 0}>
                  Onaylı Yap
                </button>

                <button
                  className="btn btn-sm"
                  onClick={handleBulkDelete}
                  disabled={selectedIds.length === 0}
                  style={{
                    border: '1px solid #E5C7C7',
                    background: selectedIds.length > 0 ? '#FFF7F7' : 'white',
                    color: selectedIds.length > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)',
                    fontWeight: 700,
                  }}
                >
                  Toplu Sil ({selectedIds.length})
                </button>
              </div>

              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                Filtrelenen kayıtlar içinde seçim yapılır.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                className="input"
                style={{ minWidth: 220 }}
                value={bulkCategoryId}
                onChange={(e) => setBulkCategoryId(e.target.value)}
              >
                <option value="">Kategori seçin</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <button className="btn btn-accent btn-sm" onClick={handleBulkCategoryAssign} disabled={selectedIds.length === 0 || !bulkCategoryId}>
                Seçilenleri Kategoriye Ata
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Yükleniyor...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Cümle bulunamadı.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {filtered.map((s) => {
              const isSelected = selectedIds.includes(s.id)

              return (
                <div
                  key={s.id}
                  className="card"
                  style={{
                    padding: '1.25rem 1.5rem',
                    border: isSelected ? '2px solid var(--color-primary)' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 10,
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: 'var(--color-text-muted)',
                          fontWeight: 600,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(s.id)}
                        />
                        Seç
                      </label>

                      {s.sentence_syc && (
                        <div style={{ direction: 'rtl', fontSize: '1.3rem', fontFamily: 'serif', fontWeight: 600, marginBottom: 6 }}>
                          {s.sentence_syc}
                        </div>
                      )}

                      {s.sentence_tr && (
                        <div style={{ fontSize: '0.9rem', marginBottom: 3 }}>
                          <span style={{ color: 'var(--color-text-muted)', fontWeight: 600, marginRight: 6 }}>TR:</span>
                          {s.sentence_tr}
                        </div>
                      )}

                      {s.sentence_en && (
                        <div style={{ fontSize: '0.9rem', marginBottom: 6 }}>
                          <span style={{ color: 'var(--color-text-muted)', fontWeight: 600, marginRight: 6 }}>EN:</span>
                          {s.sentence_en}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: 6 }}>
                        <span className="badge badge-primary">{s.base_language?.toUpperCase()}</span>

                        {s.category_id && (
                          <span
                            className="badge"
                            style={{
                              background: 'var(--color-bg-subtle)',
                              color: 'var(--color-text-muted)',
                              border: '1px solid var(--color-border)',
                            }}
                          >
                            {categories.find((c) => c.id === s.category_id)?.name}
                          </span>
                        )}

                        {s.source && (
                          <span
                            className="badge"
                            style={{
                              background: 'var(--color-bg-subtle)',
                              color: 'var(--color-text-subtle)',
                              border: '1px solid var(--color-border)',
                            }}
                          >
                            {s.source}
                          </span>
                        )}

                        {s.needs_review && (
                          <span
                            className="badge"
                            style={{
                              background: '#FFF5F5',
                              color: 'var(--color-danger)',
                              border: '1px solid #E5C7C7',
                            }}
                          >
                            ⚠️ İnceleme Gerekli
                          </span>
                        )}
                      </div>

                      {s.notes && (
                        <div style={{ marginTop: 6, fontSize: '0.8rem', color: 'var(--color-text-subtle)', fontStyle: 'italic' }}>
                          Not: {s.notes}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}>
                        ✏️ Düzenle
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--color-danger)' }}
                        onClick={() => handleDelete(s.id)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
