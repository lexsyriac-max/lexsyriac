'use client'

import { useMemo, useState } from 'react'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase'

type ExtractedWord = {
  word: string
  lang: string
  pos: string
  freq: number
  word_tr?: string
  word_en?: string
  word_syc?: string
  transliteration?: string
  confidence?: number
  source_excerpt?: string
}

type ExtractedGrammar = {
  rule: string
  category?: string
  description: string
  example?: string
  language?: string
  confidence?: number
  source_excerpt?: string
}

type AnalysisResult = {
  docTypeLabel: string
  summary: string
  languages: { code: string; name: string; percent: number }[]
  words: ExtractedWord[]
  grammarRules: ExtractedGrammar[]
  totalWordCount: number
  uniqueWordCount: number
}

export default function LexScanPage() {
  const supabase = createClient()

  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)

  const [selectedWords, setSelectedWords] = useState<Set<number>>(new Set())
  const [selectedGrammar, setSelectedGrammar] = useState<Set<number>>(new Set())
  const [filterLang, setFilterLang] = useState('all')

  const filteredWords = useMemo(() => {
    if (!result) return []
    return result.words.filter((w) => filterLang === 'all' || w.lang === filterLang)
  }, [result, filterLang])

  async function extractText(f: File): Promise<string> {
    const name = f.name.toLowerCase()

    if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.csv')) {
      return await f.text()
    }

    if (name.endsWith('.docx')) {
      const ab = await f.arrayBuffer()
      const r = await mammoth.extractRawText({ arrayBuffer: ab })
      return r.value
    }

    if (
      name.endsWith('.xlsx') ||
      name.endsWith('.xls') ||
      name.endsWith('.xlsm') ||
      name.endsWith('.xlsb')
    ) {
      const ab = await f.arrayBuffer()
      const wb = XLSX.read(ab, { type: 'array' })
      return wb.SheetNames.map((n) => XLSX.utils.sheet_to_csv(wb.Sheets[n])).join('\n')
    }

    throw new Error('Desteklenmeyen dosya türü. TXT, CSV, DOCX veya XLSX kullan.')
  }

  async function handleAnalyze() {
    if (!file) return

    setError('')
    setSavedMessage('')
    setResult(null)
    setSelectedWords(new Set())
    setSelectedGrammar(new Set())

    try {
      setProgress('Dosya okunuyor...')
      const text = await extractText(file)

      if (!text.trim()) {
        throw new Error('Dosya boş görünüyor.')
      }

      setProgress('Claude ile analiz ediliyor...')

      const excerpt = text.slice(0, 12000)

      const prompt = `
Sen çok dilli sözlük ve dilbilgisi içerik ayrıştırma uzmanısın.
SADECE geçerli JSON döndür. Açıklama yazma. Markdown yazma.

Görev:
1. Metnin belge türünü tahmin et
2. Kısa özet çıkar
3. Dilleri yüzde olarak tahmin et
4. En fazla 80 önemli kelime çıkar
5. Eğer gramer/dilbilgisi kuralı varsa en fazla 30 kural çıkar
6. Kelimeleri olabildiğince yapılandır:
   - word
   - lang
   - pos
   - freq
   - word_tr
   - word_en
   - word_syc
   - transliteration
   - confidence
   - source_excerpt
7. Gramer kurallarını yapılandır:
   - rule
   - category
   - description
   - example
   - language
   - confidence
   - source_excerpt

Dil kodları:
- tr = Türkçe
- en = İngilizce
- syc = Süryanice
- other = diğer

Kelime türleri örnek:
isim, fiil, sıfat, zarf, zamir, edat, bağlaç, ünlem, diğer

JSON şeması:
{
  "docTypeLabel": "string",
  "summary": "string",
  "languages": [{"code":"tr","name":"Türkçe","percent":50}],
  "words": [
    {
      "word":"string",
      "lang":"tr",
      "pos":"isim",
      "freq":3,
      "word_tr":"string",
      "word_en":"string",
      "word_syc":"string",
      "transliteration":"string",
      "confidence":0.82,
      "source_excerpt":"string"
    }
  ],
  "grammarRules": [
    {
      "rule":"string",
      "category":"string",
      "description":"string",
      "example":"string",
      "language":"syc",
      "confidence":0.76,
      "source_excerpt":"string"
    }
  ],
  "totalWordCount": 1000,
  "uniqueWordCount": 400
}

Dosya adı: ${file.name}

Metin:
"""
${excerpt}
"""
`.trim()

      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      if (!res.ok) {
        throw new Error(`Claude API hatası: ${res.status}`)
      }

      const data = await res.json()

      let raw = ''
      if (typeof data === 'string') {
        raw = data
      } else if (typeof data?.text === 'string') {
        raw = data.text
      } else if (typeof data?.content === 'string') {
        raw = data.content
      } else if (Array.isArray(data?.content) && typeof data.content[0]?.text === 'string') {
        raw = data.content[0].text
      } else {
        raw = JSON.stringify(data)
      }

      raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim()

      const parsed: AnalysisResult = JSON.parse(raw)

      setResult(parsed)
      setSelectedWords(new Set(parsed.words.map((_, i) => i)))
      setSelectedGrammar(new Set(parsed.grammarRules.map((_, i) => i)))
      setProgress('')
    } catch (e) {
      setProgress('')
      setError(e instanceof Error ? e.message : 'Analiz sırasında hata oluştu.')
    }
  }

  function toggleWord(index: number) {
    const s = new Set(selectedWords)
    if (s.has(index)) s.delete(index)
    else s.add(index)
    setSelectedWords(s)
  }

  function toggleGrammar(index: number) {
    const s = new Set(selectedGrammar)
    if (s.has(index)) s.delete(index)
    else s.add(index)
    setSelectedGrammar(s)
  }

  async function handleSaveToPending() {
    if (!file || !result) return

    setSaving(true)
    setError('')
    setSavedMessage('')

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data: ingestionRow, error: ingestionError } = await supabase
        .from('ingestion_files')
        .insert({
          file_name: file.name,
          file_type: file.name.split('.').pop()?.toLowerCase() || '',
          source_kind: 'upload',
          uploaded_by: user?.id ?? null,
          doc_type_label: result.docTypeLabel,
          summary: result.summary,
          total_word_count: result.totalWordCount || 0,
          unique_word_count: result.uniqueWordCount || 0,
          extracted_word_count: result.words.filter((_, i) => selectedWords.has(i)).length,
          extracted_grammar_count: result.grammarRules.filter((_, i) => selectedGrammar.has(i)).length,
          language_stats: result.languages,
          analysis_status: 'completed',
          analysis_model: 'claude-via-proxy',
        })
        .select('id')
        .single()

      if (ingestionError || !ingestionRow) {
        throw new Error(ingestionError?.message || 'Dosya kaydı oluşturulamadı.')
      }

      const pendingWords = result.words
        .filter((_, i) => selectedWords.has(i))
        .map((w) => ({
          ingestion_file_id: ingestionRow.id,
          word_tr: w.word_tr || (w.lang === 'tr' ? w.word : ''),
          word_en: w.word_en || (w.lang === 'en' ? w.word : ''),
          word_syc: w.word_syc || (w.lang === 'syc' ? w.word : ''),
          transliteration: w.transliteration || '',
          pos: w.pos || '',
          language_detected: w.lang || 'other',
          source_excerpt: w.source_excerpt || '',
          confidence: w.confidence ?? null,
          status: 'pending',
        }))

      const pendingGrammar = result.grammarRules
        .filter((_, i) => selectedGrammar.has(i))
        .map((g) => ({
          ingestion_file_id: ingestionRow.id,
          rule_name: g.rule,
          category: g.category || '',
          language: g.language || '',
          description: g.description || '',
          example: g.example || '',
          source_excerpt: g.source_excerpt || '',
          confidence: g.confidence ?? null,
          status: 'pending',
        }))

      if (pendingWords.length > 0) {
        const { error: wErr } = await supabase.from('pending_words').insert(pendingWords)
        if (wErr) throw new Error(`Kelime ön havuzu hatası: ${wErr.message}`)
      }

      if (pendingGrammar.length > 0) {
        const { error: gErr } = await supabase.from('pending_grammar').insert(pendingGrammar)
        if (gErr) throw new Error(`Gramer ön havuzu hatası: ${gErr.message}`)
      }

      setSavedMessage(
        `✓ Ön havuza kaydedildi. ${pendingWords.length} kelime, ${pendingGrammar.length} gramer kuralı.`
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydetme sırasında hata oluştu.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main style={{ padding: '2rem 0 4rem' }}>
      <div className="container">
        <div style={{ marginBottom: '2rem' }}>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text)',
            }}
          >
            LexScan
          </h1>
          <p
            style={{
              color: 'var(--color-text-muted)',
              fontSize: '0.875rem',
              marginTop: '0.25rem',
            }}
          >
            Dosya yükle → analiz et → ön havuza gönder → admin onayıyla sisteme aktar
          </p>
        </div>

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

        {savedMessage && (
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
            {savedMessage}
          </div>
        )}

        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div
            style={{
              border: '2px dashed var(--color-border)',
              borderRadius: 16,
              padding: '2rem',
              textAlign: 'center',
              background: 'var(--color-bg)',
            }}
          >
            <input
              type="file"
              accept=".txt,.md,.csv,.docx,.xlsx,.xls,.xlsm,.xlsb"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null)
                setResult(null)
                setError('')
                setSavedMessage('')
              }}
            />

            <div style={{ marginTop: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              Desteklenen: TXT, MD, CSV, DOCX, XLSX
            </div>

            {file && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                  Seçilen dosya: <strong>{file.name}</strong>
                </div>
                <button className="btn btn-primary" onClick={handleAnalyze} disabled={!!progress}>
                  {progress ? progress : '🔍 Analiz Et'}
                </button>
              </div>
            )}
          </div>
        </div>

        {result && (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              {[
                { label: 'Belge Türü', value: result.docTypeLabel },
                { label: 'Toplam Kelime', value: result.totalWordCount },
                { label: 'Benzersiz', value: result.uniqueWordCount },
                { label: 'Kelime Çıkışı', value: result.words.length },
                { label: 'Gramer Kuralı', value: result.grammarRules.length },
              ].map((item) => (
                <div key={item.label} className="card" style={{ padding: '1rem' }}>
                  <div
                    style={{
                      fontSize: '1.3rem',
                      fontWeight: 700,
                      color: 'var(--color-primary)',
                    }}
                  >
                    {item.value}
                  </div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      letterSpacing: '0.06em',
                      color: 'var(--color-text-muted)',
                      marginTop: '0.3rem',
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  marginBottom: '0.5rem',
                }}
              >
                İçerik Özeti
              </div>
              <p style={{ margin: 0, lineHeight: 1.6 }}>{result.summary}</p>
            </div>

            <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                }}
              >
                <strong>Kelimeler</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {selectedWords.size} seçili
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                {['all', 'tr', 'en', 'syc', 'other'].map((l) => (
                  <button
                    key={l}
                    onClick={() => setFilterLang(l)}
                    className="btn btn-secondary"
                    style={{
                      padding: '0.3rem 0.75rem',
                      fontSize: '0.78rem',
                      opacity: filterLang === l ? 1 : 0.7,
                    }}
                  >
                    {{ all: 'Tümü', tr: 'TR', en: 'EN', syc: 'SYC', other: 'Diğer' }[l]}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {filteredWords.map((w) => {
                  const idx = result.words.indexOf(w)
                  const selected = selectedWords.has(idx)

                  return (
                    <button
                      key={idx}
                      onClick={() => toggleWord(idx)}
                      title={`${w.pos} · ${w.freq}x`}
                      style={{
                        padding: '0.35rem 0.7rem',
                        borderRadius: 999,
                        border: '2px solid',
                        borderColor: selected ? 'var(--color-primary)' : 'transparent',
                        background: 'var(--color-bg)',
                        cursor: 'pointer',
                        opacity: selected ? 1 : 0.5,
                        fontSize: '0.78rem',
                      }}
                    >
                      {w.word}
                    </button>
                  )
                })}
              </div>
            </div>

            {result.grammarRules.length > 0 && (
              <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
                <div
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    marginBottom: '0.75rem',
                  }}
                >
                  <strong>Gramer Kuralları</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {selectedGrammar.size} seçili
                  </span>
                </div>

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {result.grammarRules.map((g, i) => {
                    const selected = selectedGrammar.has(i)

                    return (
                      <div
                        key={i}
                        onClick={() => toggleGrammar(i)}
                        style={{
                          padding: '1rem',
                          border: '1px solid var(--color-border)',
                          borderRadius: 12,
                          background: selected ? 'white' : '#FAFAF8',
                          cursor: 'pointer',
                          opacity: selected ? 1 : 0.55,
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>{g.rule}</div>
                        <div style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
                          {g.description}
                        </div>
                        {g.example && (
                          <div style={{ marginTop: '0.4rem', fontSize: '0.82rem' }}>
                            <strong>Örnek:</strong> {g.example}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleSaveToPending}
              disabled={saving || (selectedWords.size === 0 && selectedGrammar.size === 0)}
              style={{ width: '100%' }}
            >
              {saving
                ? 'Kaydediliyor...'
                : `➕ Ön havuza gönder (${selectedWords.size} kelime · ${selectedGrammar.size} kural)`}
            </button>
          </>
        )}
      </div>
    </main>
  )
}