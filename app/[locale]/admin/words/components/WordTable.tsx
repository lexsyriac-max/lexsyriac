'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase'
import { Word, TYPE_OPTIONS, EKSIK_OPTIONS } from '@/lib/types/words'
import DeleteAllButton from './DeleteAllButton'

interface Props {
  locale: string
  words: Word[]
  onEdit: (word: Word) => void
  onDetail: (word: Word) => void
  onDelete: (id: string, name: string) => Promise<void>
  onDeleteAll: () => Promise<void>
  onFillSyriac?: () => Promise<void>
  filling?: boolean
  onBulkDelete?: (ids: string[]) => Promise<void>
  onBulkFill?: (ids: string[]) => Promise<void>
}

type WordForm = {
  id: string
  word_id: string
  form_text: string
  transliteration: string | null
  language: string | null
  form_type: string | null
  tense: string | null
  person: string | null
  polarity: string | null
}

type WordMeta = Word & {
  source?: 'manual' | 'database' | 'sedra' | 'ai' | string | null
  is_verified?: boolean | null
  sedra_verified?: boolean | null
  notes?: string | null
  root?: string | null
}

const FILTER_TABS = [
  'Tümü',
  'Türkçe',
  'Süryanice',
  'İngilizce',
  'Türe Göre',
  'Eksik Tamamla',
] as const

export default function WordTable({
  locale,
  words,
  onEdit,
  onDetail,
  onDelete,
  onDeleteAll,
  onFillSyriac,
  filling = false,
}: Props) {
  const supabase = createClient()

  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<(typeof FILTER_TABS)[number]>('Tümü')
  const [typeFilter, setTypeFilter] = useState('')
  const [eksikFilter, setEksik] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [bulkFilling, setBulkFilling] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [formsMap, setFormsMap] = useState<Record<string, WordForm[]>>({})
  const [expandedWordId, setExpandedWordId] = useState<string | null>(null)
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null)
  const [formText, setFormText] = useState('')
  const [formType, setFormType] = useState('')
  const [formLanguage, setFormLanguage] = useState('turkish')
  const [formTransliteration, setFormTransliteration] = useState('')
  const [savingForm, setSavingForm] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  async function loadForms() {
    const { data, error } = await supabase
      .from('word_forms')
      .select('*')
      .order('created_at', { ascending: true })

    if (error || !data) {
      setFormsMap({})
      return
    }

    const grouped: Record<string, WordForm[]> = {}

    for (const form of data as WordForm[]) {
      if (!grouped[form.word_id]) grouped[form.word_id] = []
      grouped[form.word_id].push(form)
    }

    setFormsMap(grouped)
  }

  useEffect(() => {
    void loadForms()
  }, [words])

  const filtered = useMemo(() => {
    const list = words.filter((word) => {
      const w = word as WordMeta
      const q = search.toLowerCase()

      const matchSearch =
        !q ||
        [
          w.turkish,
          w.english,
          w.syriac,
          w.transliteration,
          w.root || '',
          w.word_type,
          w.source || '',
          w.notes || '',
        ].some((v) => String(v || '').toLowerCase().includes(q))

      let matchTab = true

      if (tab === 'Türkçe') matchTab = !!w.turkish
      if (tab === 'Süryanice') matchTab = !!w.syriac
      if (tab === 'İngilizce') matchTab = !!w.english
      if (tab === 'Türe Göre') matchTab = typeFilter ? w.word_type === typeFilter : true

      if (tab === 'Eksik Tamamla') {
        const missingMap: Record<string, boolean> = {
          eksik_sy: !w.syriac,
          eksik_tr: !w.turkish,
          eksik_en: !w.english,
          eksik_img: !w.image_url,
          eksik_audio: !w.audio_url,
          eksik_trans: !w.transliteration,
          eksik_root: !w.root,
        }

        matchTab = eksikFilter
          ? (missingMap[eksikFilter] ?? true)
          : Object.values(missingMap).some(Boolean)
      }

      return matchSearch && matchTab
    })
    return [...list].sort((a, b) => {
      const ta = (a.turkish || '').toLowerCase()
      const tb = (b.turkish || '').toLowerCase()
      return sortDir === 'asc' ? ta.localeCompare(tb, 'tr') : tb.localeCompare(ta, 'tr')
    })
  }, [words, search, tab, typeFilter, eksikFilter, sortDir])

  function exportCSV() {
    const headers = [
      'Türkçe',
      'İngilizce',
      'Süryanice',
      'Transliterasyon',
      'Kök',
      'Kelime Türü',
      'Kaynak',
      'Doğrulandı',
      'Sedra Doğrulandı',
      'Notlar',
      'Görsel URL',
      'Ses URL',
      'Eklenme',
    ]

    const rows = filtered.map((word) => {
      const w = word as WordMeta
      return [
        w.turkish,
        w.english,
        w.syriac,
        w.transliteration,
        w.root || '',
        w.word_type,
        w.source || '',
        w.is_verified ? 'Evet' : 'Hayır',
        w.sedra_verified ? 'Evet' : 'Hayır',
        w.notes || '',
        w.image_url || '',
        w.audio_url || '',
        new Date(w.created_at).toLocaleDateString('tr-TR'),
      ]
    })

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `lexsyriac-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function exportExcel() {
    const rows = filtered.map((word) => {
      const w = word as WordMeta
      return {
        Türkçe: w.turkish || '',
        İngilizce: w.english || '',
        Süryanice: w.syriac || '',
        Transliterasyon: w.transliteration || '',
        Kök: w.root || '',
        'Kelime Türü': w.word_type || '',
        Kaynak: w.source || '',
        Doğrulandı: w.is_verified ? 'Evet' : 'Hayır',
        'Sedra Doğrulandı': w.sedra_verified ? 'Evet' : 'Hayır',
        Notlar: w.notes || '',
        'Görsel URL': w.image_url || '',
        'Ses URL': w.audio_url || '',
        Eklenme: new Date(w.created_at).toLocaleDateString('tr-TR'),
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Kelimeler')
    XLSX.writeFile(workbook, `lexsyriac-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  function exportPDF() {
    const rows = filtered
      .map((word, i) => {
        const w = word as WordMeta
        return `
      <tr style="background:${i % 2 === 0 ? '#f9f9f9' : 'white'}">
        <td>${i + 1}</td>
        <td>${escapeHtml(w.turkish || '')}</td>
        <td style="direction:rtl;font-family:serif;font-size:1.1em">${escapeHtml(w.syriac || '')}</td>
        <td>${escapeHtml(w.transliteration || '')}</td>
        <td>${escapeHtml(w.root || '')}</td>
        <td>${escapeHtml(w.english || '')}</td>
        <td>${escapeHtml(w.word_type || '')}</td>
        <td>${escapeHtml(w.source || '')}</td>
      </tr>`
      })
      .join('')

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>LexSyriac</title>
<style>
  body { font-family: Arial, sans-serif; padding: 20px; }
  h1 { color: #1A5F6E; }
  table { width: 100%; border-collapse: collapse; font-size: .85em; }
  th { background: #1A5F6E; color: white; padding: 8px; text-align: left; }
  td { padding: 6px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
</style>
</head>
<body>
  <h1>🔤 LexSyriac Sözlük</h1>
  <p style="color:#666;font-size:.85em">
    ${filtered.length} kelime · ${new Date().toLocaleDateString('tr-TR')}
  </p>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Türkçe</th>
        <th>Süryanice</th>
        <th>Translit.</th>
        <th>Kök</th>
        <th>İngilizce</th>
        <th>Tür</th>
        <th>Kaynak</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      win.print()
    }
  }

  function playAudio(url: string, id: string) {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    if (playingId === id) {
      setPlayingId(null)
      return
    }

    const audio = new Audio(url)
    audioRef.current = audio
    void audio.play()
    setPlayingId(id)

    audio.onended = () => {
      setPlayingId(null)
      audioRef.current = null
    }
  }

  function toggleForms(wordId: string) {
    setExpandedWordId((prev) => (prev === wordId ? null : wordId))
  }

  function openAddForm(wordId: string) {
    setSelectedWordId(wordId)
    setFormText('')
    setFormType('')
    setFormLanguage('turkish')
    setFormTransliteration('')
  }

  function closeAddForm() {
    setSelectedWordId(null)
    setFormText('')
    setFormType('')
    setFormLanguage('turkish')
    setFormTransliteration('')
  }

  async function saveForm() {
    if (!selectedWordId || !formText.trim()) return

    setSavingForm(true)

    const { error } = await supabase.from('word_forms').insert({
      word_id: selectedWordId,
      form_text: formText.trim(),
      form_type: formType.trim() || null,
      language: formLanguage,
      transliteration: formTransliteration.trim() || null,
    })

    setSavingForm(false)

    if (error) {
      alert(error.message)
      return
    }

    await loadForms()
    setExpandedWordId(selectedWordId)
    closeAddForm()
  }

  async function copyText(value: string, label: string) {
    if (!value.trim()) return
    try {
      await navigator.clipboard.writeText(value)
      alert(`${label} kopyalandı.`)
    } catch {
      alert(`${label} kopyalanamadı.`)
    }
  }

  function openSedra(word: WordMeta) {
    const query = word.syriac || word.transliteration || word.turkish || ''
    window.open('https://sedra.bethmardutho.org/', '_blank', 'noopener,noreferrer')
    if (query) {
      void navigator.clipboard.writeText(query)
    }
  }

  function openDukhrana(word: WordMeta) {
    const query = encodeURIComponent(word.syriac || word.transliteration || word.turkish || '')
    window.open(`https://dukhrana.com/lexicon/search.php?term=${query}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: '0.6rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <Link
          href={`/${locale}/admin/import`}
          className="btn btn-secondary"
          style={{ textDecoration: 'none' }}
        >
          ⬆ Toplu Yükle
        </Link>

        <button className="btn btn-secondary" onClick={exportCSV}>
          ⬇ CSV İndir
        </button>

        <button className="btn btn-secondary" onClick={exportExcel}>
          ⬇ Excel İndir
        </button>

        <button className="btn btn-secondary" onClick={exportPDF}>
          📄 PDF İndir
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {onFillSyriac && (
            <button
              onClick={onFillSyriac}
              disabled={filling}
              style={{
                padding: '0.4rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-primary)',
                background: filling ? 'var(--color-bg-subtle)' : 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: filling ? 'not-allowed' : 'pointer',
              }}
            >
              {filling ? '⏳ Tamamlanıyor...' : '🤖 AI ile Tamamla'}
            </button>
          )}
          <DeleteAllButton onDelete={onDeleteAll} />
        </div>
      </div>

      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          marginBottom: 0,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          borderBottom: 'none',
        }}
      >
        <div style={{ marginBottom: '0.75rem' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            placeholder="🔍  Kelime ara — tüm dillerde ve kökte..."
          />
        </div>

        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {FILTER_TABS.map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t)
                setTypeFilter('')
                setEksik('')
              }}
              style={{
                padding: '0.3rem 0.85rem',
                borderRadius: 20,
                fontSize: '0.8rem',
                border: '1.5px solid',
                borderColor: tab === t ? 'var(--color-primary)' : 'var(--color-border)',
                background: tab === t ? 'var(--color-primary)' : 'transparent',
                color: tab === t ? 'white' : 'var(--color-text)',
                cursor: 'pointer',
                fontWeight: tab === t ? 600 : 400,
              }}
            >
              {t}
            </button>
          ))}

          {tab === 'Türe Göre' && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input"
              style={{
                maxWidth: 180,
                padding: '0.3rem 0.6rem',
                fontSize: '0.82rem',
              }}
            >
              <option value="">— Tüm türler —</option>
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          )}

          {tab === 'Eksik Tamamla' && (
            <select
              value={eksikFilter}
              onChange={(e) => setEksik(e.target.value)}
              className="input"
              style={{
                maxWidth: 210,
                padding: '0.3rem 0.6rem',
                fontSize: '0.82rem',
              }}
            >
              <option value="">— Tüm eksikler —</option>
              {EKSIK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div
        className="card"
        style={{
          padding: 0,
          overflow: 'hidden',
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.875rem 1.25rem',
            borderBottom: '1px solid var(--color-border)',
            background: '#FAFAF8',
          }}
        >
          {/* TOPLU İŞLEM BAR */}
          {selectedIds.size > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-primary)', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.75rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'white', fontWeight: 700 }}>
                {selectedIds.size} seçili
              </span>
              <button
                onClick={async () => {
                  if (!confirm(`${selectedIds.size} kelime silinsin mi?`)) return
                  for (const id of Array.from(selectedIds)) {
                    const word = words.find(w => w.id === id)
                    if (word) await onDelete(id, word.turkish || '')
                  }
                  setSelectedIds(new Set())
                }}
                style={{ padding: '0.25rem 0.6rem', borderRadius: 4, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '0.78rem', fontWeight: 600 }}
              >
                🗑 Seçilenleri Sil
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                style={{ padding: '0.25rem 0.6rem', borderRadius: 4, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: '0.78rem' }}
              >
                ✕ Temizle
              </button>
            </div>
          )}

          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
            }}
          >
            Kelime Listesi
          </span>
          <span
            style={{
              fontSize: '0.8rem',
              color: 'var(--color-text-muted)',
            }}
          >
            {filtered.length} kelime
          </span>
        </div>

        {filtered.length === 0 ? (
          <div
            style={{
              padding: '3rem',
              textAlign: 'center',
              color: 'var(--color-text-muted)',
            }}
          >
            {search
              ? 'Eşleşen kelime bulunamadı.'
              : tab === 'Eksik Tamamla'
                ? '✓ Bu kategoride eksik yok!'
                : 'Henüz kelime eklenmedi.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.875rem',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    background: '#FAFAF8',
                  }}
                >
                  <th style={{ padding: '0.625rem 0.75rem', width: 36 }}>
                      <input type="checkbox"
                        checked={filtered.length > 0 && filtered.every(w => selectedIds.has(w.id))}
                        onChange={e => {
                          if (e.target.checked) setSelectedIds(new Set(filtered.map(w => w.id)))
                          else setSelectedIds(new Set())
                        }}
                      />
                    </th>
                  {[
                    '#',
                    'Görsel',
                  ].map((h) => (
                    <th key={h} style={{ padding: '0.625rem 0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.05em', color: 'var(--color-text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                  <th style={{ padding: '0.625rem 0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.05em', color: 'var(--color-text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: 'pointer' }}
                    onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>
                    Türkçe {sortDir === 'asc' ? '↑' : '↓'}
                  </th>
                  {['Süryanice', 'İngilizce', 'Tür', 'Ses', 'İşlemler'].map((h) => (
                    <th key={h} style={{ padding: '0.625rem 0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.05em', color: 'var(--color-text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.map((word, i) => {
                  const w = word as WordMeta
                  const forms = formsMap[w.id] || []
                  const isExpanded = expandedWordId === w.id
                  const isAddingForm = selectedWordId === w.id

                  return (
                    <tr
                      key={w.id}
                      style={{ borderBottom: '1px solid var(--color-border)', background: selectedIds.has(w.id) ? 'var(--color-primary-light)' : undefined }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#FAFAF8'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <td style={{ padding: '0.5rem 0.75rem', verticalAlign: 'top', width: 36 }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(w.id)}
                          onChange={e => {
                            const next = new Set(selectedIds)
                            if (e.target.checked) next.add(w.id)
                            else next.delete(w.id)
                            setSelectedIds(next)
                          }}
                        />
                      </td>
                      <td
                        style={{
                          padding: '0.5rem 0.75rem',
                          color: 'var(--color-text-muted)',
                          fontSize: '0.8rem',
                          verticalAlign: 'top',
                        }}
                      >
                        {i + 1}
                      </td>

                      <td style={{ padding: '0.4rem 0.75rem', verticalAlign: 'top' }}>
                        {w.image_url ? (
                          <Image
                            src={w.image_url}
                            alt={w.turkish}
                            width={40}
                            height={40}
                            unoptimized
                            style={{
                              width: 40,
                              height: 40,
                              objectFit: 'cover',
                              borderRadius: 6,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 6,
                              background: '#EEEEE8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.65rem',
                              color: '#AAA',
                            }}
                          >
                            —
                          </div>
                        )}
                      </td>

                      <td
                        style={{
                          padding: '0.5rem 0.75rem',
                          fontWeight: 500,
                          verticalAlign: 'top',
                          minWidth: 180,
                        }}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                          {w.turkish}
                        </div>

                        <div
                          style={{
                            marginTop: '0.45rem',
                            display: 'flex',
                            gap: '0.35rem',
                            flexWrap: 'wrap',
                          }}
                        >
                          <MetaPill>Kaynak: {w.source || 'manual'}</MetaPill>

                          {w.is_verified ? (
                            <MetaPill color="#166534" bg="#ecfdf5" border="#bbf7d0">
                              Doğrulandı
                            </MetaPill>
                          ) : (
                            <MetaPill>Doğrulanmadı</MetaPill>
                          )}

                          {w.sedra_verified && (
                            <MetaPill color="#1d4ed8" bg="#eff6ff" border="#bfdbfe">
                              Sedra doğrulandı
                            </MetaPill>
                          )}

                          {!!w.root && (
                            <MetaPill color="#92400e" bg="#fffbeb" border="#fde68a">
                              Kök: {w.root}
                            </MetaPill>
                          )}
                        </div>

                        {!!w.notes && (
                          <div
                            style={{
                              marginTop: '0.5rem',
                              fontSize: '0.76rem',
                              lineHeight: 1.45,
                              color: 'var(--color-text-muted)',
                              background: '#F8F8F4',
                              border: '1px solid var(--color-border)',
                              borderRadius: 8,
                              padding: '0.45rem 0.6rem',
                            }}
                          >
                            <strong style={{ color: 'var(--color-text)' }}>Not:</strong> {w.notes}
                          </div>
                        )}

                        <div
                          style={{
                            marginTop: '0.5rem',
                            display: 'flex',
                            gap: '0.4rem',
                            flexWrap: 'wrap',
                          }}
                        >
                          {forms.length > 0 && (
                            <button onClick={() => toggleForms(w.id)} style={smallBtn}>
                              {isExpanded ? '− Çekimleri Gizle' : `+ Çekimleri Göster (${forms.length})`}
                            </button>
                          )}

                          {(w.word_type === 'verb' || w.word_type === 'fiil') && w.syriac && (
                            <button
                              onClick={() => router.push(`/${locale}/admin/grammar-engine?verb=${encodeURIComponent(w.syriac)}`)}
                              style={{ ...smallBtn, background: 'var(--color-primary-light)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', fontWeight: 600 }}
                            >
                              ⚙️ Çekim Üret
                            </button>
                          )}

                          {!!w.syriac && (
                            <button
                              onClick={() => void copyText(w.syriac || '', 'Süryanice kelime')}
                              style={smallBtn}
                            >
                              Kopyala
                            </button>
                          )}

                          <button onClick={() => openSedra(w)} style={smallBtn}>
                            Sedra
                          </button>

                          <button onClick={() => openDukhrana(w)} style={smallBtn}>
                            Dukhrana
                          </button>
                        </div>

                        {isExpanded && forms.length > 0 && (
                          <div
                            style={{
                              marginTop: '0.6rem',
                              fontSize: '0.78rem',
                              color: 'var(--color-text-muted)',
                              background: '#F8F8F4',
                              border: '1px solid var(--color-border)',
                              borderRadius: 8,
                              padding: '0.6rem 0.75rem',
                            }}
                          >
                            <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>
                              Çekimler
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                              {forms.map((f) => (
                                <li key={f.id} style={{ marginBottom: '0.15rem' }}>
                                  {f.form_text}
                                  {f.form_type ? ` (${f.form_type})` : ''}
                                  {f.transliteration ? ` — ${f.transliteration}` : ''}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {isAddingForm && (
                          <div
                            style={{
                              marginTop: '0.6rem',
                              background: '#F8F8F4',
                              border: '1px solid var(--color-border)',
                              borderRadius: 8,
                              padding: '0.75rem',
                              display: 'grid',
                              gap: '0.45rem',
                            }}
                          >
                            <input
                              className="input"
                              placeholder="Çekim metni"
                              value={formText}
                              onChange={(e) => setFormText(e.target.value)}
                            />

                            <input
                              className="input"
                              placeholder="Form türü (örn: present)"
                              value={formType}
                              onChange={(e) => setFormType(e.target.value)}
                            />

                            <input
                              className="input"
                              placeholder="Transliterasyon"
                              value={formTransliteration}
                              onChange={(e) => setFormTransliteration(e.target.value)}
                            />

                            <select
                              className="input"
                              value={formLanguage}
                              onChange={(e) => setFormLanguage(e.target.value)}
                            >
                              <option value="turkish">Türkçe</option>
                              <option value="english">İngilizce</option>
                              <option value="syriac">Süryanice</option>
                            </select>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button onClick={saveForm} disabled={savingForm} style={smallBtn}>
                                {savingForm ? 'Kaydediliyor...' : 'Kaydet'}
                              </button>
                              <button onClick={closeAddForm} style={smallBtnSecondary}>
                                İptal
                              </button>
                            </div>
                          </div>
                        )}
                      </td>

                      <td
                        style={{
                          padding: '0.5rem 0.75rem',
                          direction: 'rtl',
                          fontFamily: 'serif',
                          fontSize: '1.05rem',
                          verticalAlign: 'top',
                          minWidth: 140,
                        }}
                      >
                        {w.syriac}
                        {!!w.transliteration && (
                          <div
                            style={{
                              direction: 'ltr',
                              fontFamily: 'inherit',
                              fontSize: '0.72rem',
                              color: 'var(--color-text-muted)',
                              marginTop: '0.35rem',
                            }}
                          >
                            {w.transliteration}
                          </div>
                        )}
                      </td>

                      <td
                        style={{
                          padding: '0.5rem 0.75rem',
                          color: 'var(--color-text-muted)',
                          verticalAlign: 'top',
                          minWidth: 160,
                        }}
                      >
                        {w.english}
                      </td>

                      <td style={{ padding: '0.5rem 0.75rem', verticalAlign: 'top' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: 20,
                            fontSize: '0.7rem',
                            background: 'var(--color-bg)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-muted)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {w.word_type}
                        </span>
                      </td>

                      <td style={{ padding: '0.5rem 0.75rem', verticalAlign: 'top' }}>
                        {w.audio_url ? (
                          <button
                            onClick={() => playAudio(w.audio_url!, w.id)}
                            title="Dinle"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '1.1rem',
                              padding: '0.1rem',
                            }}
                          >
                            {playingId === w.id ? '⏸' : '🔊'}
                          </button>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              color: '#CCC',
                            }}
                          >
                            —
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '0.4rem 0.75rem', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button onClick={() => onDetail(w)} title="Detay" style={IB}>
                            👁
                          </button>
                          <button onClick={() => onEdit(w)} title="Düzenle" style={IB}>
                            ✏️
                          </button>
                          <button
                            onClick={() => onDelete(w.id, w.turkish)}
                            title="Sil"
                            style={{ ...IB, color: '#C0392B' }}
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function MetaPill({
  children,
  color = 'var(--color-text-muted)',
  bg = 'var(--color-bg)',
  border = 'var(--color-border)',
}: {
  children: React.ReactNode
  color?: string
  bg?: string
  border?: string
}) {
  return (
    <span
      style={{
        padding: '0.2rem 0.5rem',
        borderRadius: 999,
        fontSize: '0.68rem',
        lineHeight: 1.2,
        border: `1px solid ${border}`,
        background: bg,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

const IB: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '1rem',
  padding: '0.15rem',
}

const smallBtn: React.CSSProperties = {
  background: '#EEF2F3',
  border: '1px solid #D8DFE2',
  borderRadius: 6,
  padding: '0.25rem 0.5rem',
  fontSize: '0.72rem',
  cursor: 'pointer',
}

const smallBtnSecondary: React.CSSProperties = {
  background: 'white',
  border: '1px solid #D8DFE2',
  borderRadius: 6,
  padding: '0.25rem 0.5rem',
  fontSize: '0.72rem',
  cursor: 'pointer',
}