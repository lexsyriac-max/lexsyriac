'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import { createWorker } from 'tesseract.js'
import { createClient } from '@/lib/supabase'

type StatsState = {
  words: number
  grammar: number
  sentences: number
}

type CategoryRow = {
  id: string
  name: string
}

type ParsedWord = {
  surface_form?: string
  lemma?: string
  normalized_form?: string
  language?: string
  word_type?: string
  context_sentence?: string
}

type ParsedGrammar = {
  title?: string
  content?: string
  category?: string
  language?: string
}

type ParsedSentence = {
  sentence_syc?: string
  syriac?: string
  text?: string
  sentence_text?: string
  sentence_tr?: string
  translation_tr?: string
  sentence_en?: string
  translation_en?: string
  base_language?: string
  language?: string
}

type ParsedChunk = {
  words?: ParsedWord[]
  grammar?: ParsedGrammar[]
  sentences?: Array<ParsedSentence | string>
}

type PendingWordRow = {
  ingestion_file_id: string
  source_chunk_id: string
  surface_form: string
  lemma: string
  normalized_form: string
  context_sentence: string
  language_detected: string
  word_tr: string
  word_en: string
  word_syc: string
  pos: string
  status: 'pending'
}

type PendingGrammarRow = {
  ingestion_file_id: string
  source_chunk_id: string
  rule_name: string
  description: string
  language: string
  category_id: string | undefined
  status: 'pending'
}

type PendingSentenceRow = {
  ingestion_file_id: string
  source_chunk_id: string
  sentence_text: string
  sentence_syc: string
  sentence_tr: string
  sentence_en: string
  base_language: string
  category_id: string | undefined
  status: 'pending'
  needs_review: boolean
  source: 'word_context' | 'claude_sentence'
}

export default function LexScanPage() {
  const supabase = createClient()
  const router = useRouter()
  const locale = useLocale()

  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const [stats, setStats] = useState<StatsState>({ words: 0, grammar: 0, sentences: 0 })

  const addLog = (msg: string) => setLog((prev) => [...prev, msg])

  async function handleUpload() {
    if (!file) return

    setLoading(true)
    setDone(false)
    setLog([])
    setStats({ words: 0, grammar: 0, sentences: 0 })

    try {
      addLog('📦 yetki ve limit kontrolü yapılıyor...')

      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single()

      const isAdmin = profile?.role === 'admin'

      if (!isAdmin) {
        const { count } = await supabase
          .from('ingestion_files')
          .select('*', { count: 'exact', head: true })
          .eq('uploaded_by', user?.id)

        const LIMIT = 20

        if ((count || 0) >= LIMIT) {
          addLog(`⛔ kullanım limiti doldu (${LIMIT})`)
          setLoading(false)
          return
        }
      } else {
        addLog('⚡ admin yetkisi algılandı, limit uygulanmıyor')
      }

      addLog('📦 ingestion kaydı oluşturuluyor...')

      const { data: ingestion, error: ingestionError } = await supabase
        .from('ingestion_files')
        .insert({
          file_name: file.name,
          file_type: getFileType(file.name),
          source_kind: 'upload',
          uploaded_by: user?.id ?? null,
          analysis_status: 'processing',
          original_language_hint: detectLanguageHint(file.name),
        })
        .select()
        .single()

      if (ingestionError || !ingestion) {
        throw new Error(ingestionError?.message || 'ingestion kaydı oluşturulamadı')
      }

      const ingestionId = ingestion.id as string
      addLog(`✓ ingestion ID: ${ingestionId}`)

      addLog('🗂 kategori bilgileri çekiliyor...')

      const [{ data: grammarCategories }, { data: sentenceCategories }] = await Promise.all([
        supabase.from('categories').select('id,name').eq('type', 'grammar'),
        supabase.from('categories').select('id,name').eq('type', 'sentence'),
      ])

      const grammarCategoryMap = new Map<string, string>()
      if (grammarCategories) {
        ;(grammarCategories as CategoryRow[]).forEach((c) => {
          grammarCategoryMap.set(c.name.toLowerCase(), c.id)
        })
      }
      const defaultGrammarCategoryId = grammarCategoryMap.get('general')

      const sentenceCategoryMap = new Map<string, string>()
      if (sentenceCategories) {
        ;(sentenceCategories as CategoryRow[]).forEach((c) => {
          sentenceCategoryMap.set(c.name.toLowerCase(), c.id)
        })
      }
      const defaultSentenceCategoryId = sentenceCategoryMap.get('general')

      function detectSentenceCategory(text: string) {
        const t = text.toLowerCase()

        if (t.includes('?')) return sentenceCategoryMap.get('question') || defaultSentenceCategoryId
        if (t.includes('!')) return sentenceCategoryMap.get('exclamation') || defaultSentenceCategoryId
        if (t.includes('not') || t.includes('değil')) {
          return sentenceCategoryMap.get('negative') || defaultSentenceCategoryId
        }
        if (t.includes('mi ') || t.includes('mu ')) {
          return sentenceCategoryMap.get('question') || defaultSentenceCategoryId
        }

        return defaultSentenceCategoryId
      }

      addLog('📖 dosya okunuyor...')

      const text = await extractText(file, addLog)

      if (!text.trim()) {
        throw new Error('Dosyadan metin okunamadı veya dosya boş.')
      }

      addLog(`✓ ${text.length} karakter metin hazırlandı`)

      const chunks = splitText(text, 2000)
      addLog(`✂ ${chunks.length} chunk oluşturuldu`)

      let totalWords = 0
      let totalGrammar = 0
      let totalSentences = 0

      for (let i = 0; i < chunks.length; i += 1) {
        const chunk = chunks[i]
        addLog(`⚙ chunk ${i + 1}/${chunks.length} işleniyor...`)

        const { data: chunkRow, error: chunkError } = await supabase
          .from('source_chunks')
          .insert({
            ingestion_file_id: ingestionId,
            chunk_index: i,
            page_no: i + 1,
            raw_text: chunk,
            extraction_method: getExtractionMethod(file.name),
            confidence: 1.0,
          })
          .select()
          .single()

        if (chunkError || !chunkRow) {
          addLog(`⚠ chunk ${i + 1} kaydedilemedi, atlanıyor`)
          continue
        }

        const res = await fetch('/api/claude', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: buildPrompt(chunk) }),
        })

        const rawRes = (await res.json()) as { text?: string }
        const rawText =
          typeof rawRes?.text === 'string' ? rawRes.text : JSON.stringify(rawRes)
        const jsonText = extractJson(rawText)

        if (!jsonText) {
          addLog(`❌ chunk ${i + 1}: JSON bulunamadı`)
          continue
        }

        let parsed: ParsedChunk
        try {
          parsed = JSON.parse(jsonText) as ParsedChunk
        } catch {
          addLog(`❌ chunk ${i + 1}: JSON parse hatası`)
          continue
        }

        const isGrammarLike = (w: ParsedWord) => {
          const t = String(w.surface_form || w.lemma || '').toLowerCase()
          return (
            t.length > 30 ||
            t.includes('→') ||
            t.includes(' ') ||
            t.includes('kural') ||
            t.includes('yapı') ||
            t.includes('eki') ||
            t.includes('suffix') ||
            t.includes('pattern')
          )
        }

        if (Array.isArray(parsed.words) && parsed.words.length > 0) {
          const autoSentences: PendingSentenceRow[] = []

          const wordRows: PendingWordRow[] = parsed.words
            .filter((w) => (w.surface_form || w.lemma))
            .filter((w) => !isGrammarLike(w))
            .map((w) => {
              const ctx = String(w.context_sentence || '').trim()

              if (ctx && ctx.split(' ').length >= 3 && ctx.length < 200) {
                const autoCategory = detectSentenceCategory(ctx)
                autoSentences.push({
                  ingestion_file_id: ingestionId,
                  source_chunk_id: chunkRow.id as string,
                  sentence_text: ctx,
                  sentence_syc: ctx,
                  sentence_tr: '',
                  sentence_en: '',
                  base_language: w.language || 'syc',
                  category_id: autoCategory,
                  status: 'pending',
                  needs_review: true,
                  source: 'word_context',
                })
              }

              return {
                ingestion_file_id: ingestionId,
                source_chunk_id: chunkRow.id as string,
                surface_form: w.surface_form || w.lemma || '',
                lemma: w.lemma || w.surface_form || '',
                normalized_form: w.normalized_form || String(w.lemma || '').toLowerCase(),
                context_sentence: w.context_sentence || '',
                language_detected: w.language || 'other',
                word_tr: w.language === 'tr' ? w.lemma || w.surface_form || '' : '',
                word_en: w.language === 'en' ? w.lemma || w.surface_form || '' : '',
                word_syc:
                  w.language === 'syc' || w.language === 'arc'
                    ? w.lemma || w.surface_form || ''
                    : '',
                pos: w.word_type || '',
                status: 'pending',
              }
            })

          if (wordRows.length > 0) {
            const wordTexts = wordRows.map((w) => w.lemma).filter(Boolean)

            const { data: existingWords } = await supabase
              .from('pending_words')
              .select('lemma')
              .in('lemma', wordTexts)

            const existingWordSet = new Set(
              (existingWords || []).map((e: { lemma: string }) => e.lemma)
            )

            const finalWords = wordRows.filter((w) => !existingWordSet.has(w.lemma))

            if (finalWords.length > 0) {
              const { error: wErr } = await supabase.from('pending_words').insert(finalWords)
              if (!wErr) totalWords += finalWords.length
            }
          }

          if (autoSentences.length > 0) {
            const uniqueSentences = autoSentences.filter(
              (s, idx, arr) => arr.findIndex((x) => x.sentence_syc === s.sentence_syc) === idx
            )

            const sycTexts = uniqueSentences
              .map((s) => s.sentence_syc)
              .filter((v: string) => v.trim() !== '')

            const { data: existingS } = await supabase
              .from('pending_sentences')
              .select('sentence_syc')
              .in('sentence_syc', sycTexts)

            const existingSet = new Set(
              (existingS || []).map((e: { sentence_syc: string }) => e.sentence_syc)
            )

            const finalSentences = uniqueSentences.filter(
              (s) => !existingSet.has(s.sentence_syc)
            )

            if (finalSentences.length > 0) {
              const { error: csErr } = await supabase
                .from('pending_sentences')
                .insert(finalSentences)

              if (!csErr) totalSentences += finalSentences.length
            }
          }
        }

        if (Array.isArray(parsed.grammar) && parsed.grammar.length > 0) {
          const grammarRows: PendingGrammarRow[] = parsed.grammar
            .filter((g) => g.title || g.content)
            .map((g) => {
              const gCategory = String(g.category || '').toLowerCase()
              const categoryId =
                grammarCategoryMap.get(gCategory) || defaultGrammarCategoryId

              return {
                ingestion_file_id: ingestionId,
                source_chunk_id: chunkRow.id as string,
                rule_name: g.title || 'Kural',
                description: g.content || '',
                language: g.language || 'other',
                category_id: categoryId,
                status: 'pending',
              }
            })

          const ruleNames = grammarRows.map((g) => g.rule_name).filter(Boolean)

          const { data: existingG } = await supabase
            .from('pending_grammar')
            .select('rule_name')
            .in('rule_name', ruleNames)

          const existingGSet = new Set(
            (existingG || []).map((e: { rule_name: string }) => e.rule_name)
          )

          const finalGrammar = grammarRows.filter((g) => !existingGSet.has(g.rule_name))

          if (finalGrammar.length > 0) {
            const { error: gErr } = await supabase
              .from('pending_grammar')
              .insert(finalGrammar)

            if (!gErr) totalGrammar += finalGrammar.length
          }
        }

        if (Array.isArray(parsed.sentences) && parsed.sentences.length > 0) {
          const sentenceRows: PendingSentenceRow[] = parsed.sentences
            .map((s) => {
              const sycText =
                typeof s === 'string'
                  ? s.trim()
                  : String(
                      s.sentence_syc ||
                        s.syriac ||
                        s.text ||
                        s.sentence_text ||
                        ''
                    ).trim()

              if (!sycText) return null

              const categoryId = detectSentenceCategory(sycText)

              return {
                ingestion_file_id: ingestionId,
                source_chunk_id: chunkRow.id as string,
                sentence_text: sycText,
                sentence_syc: sycText,
                sentence_tr:
                  typeof s === 'string'
                    ? ''
                    : s.sentence_tr || s.translation_tr || '',
                sentence_en:
                  typeof s === 'string'
                    ? ''
                    : s.sentence_en || s.translation_en || '',
                base_language:
                  typeof s === 'string'
                    ? 'syc'
                    : s.base_language || s.language || 'syc',
                category_id: categoryId,
                status: 'pending',
                needs_review: true,
                source: 'claude_sentence',
              }
            })
            .filter((s): s is PendingSentenceRow => s !== null)

          const sycTexts = sentenceRows
            .map((s) => s.sentence_syc)
            .filter((v: string) => v !== '')

          const { data: existingSent } = await supabase
            .from('pending_sentences')
            .select('sentence_syc')
            .in('sentence_syc', sycTexts)

          const existingSentSet = new Set(
            (existingSent || []).map((e: { sentence_syc: string }) => e.sentence_syc)
          )

          const finalSentences = sentenceRows
            .filter((s) => !existingSentSet.has(s.sentence_syc))
            .filter(
              (s, idx, arr) => arr.findIndex((x) => x.sentence_syc === s.sentence_syc) === idx
            )

          if (finalSentences.length > 0) {
            const { error: sErr } = await supabase
              .from('pending_sentences')
              .insert(finalSentences)

            if (!sErr) totalSentences += finalSentences.length
          }
        }

        addLog(`✔ chunk ${i + 1} tamam`)
      }

      await supabase
        .from('ingestion_files')
        .update({
          analysis_status: 'completed',
          extracted_word_count: totalWords,
          extracted_grammar_count: totalGrammar,
        })
        .eq('id', ingestionId)

      addLog(`🎯 tamamlandı — ${totalWords} kelime · ${totalGrammar} kural · ${totalSentences} cümle`)
      setStats({ words: totalWords, grammar: totalGrammar, sentences: totalSentences })
      setDone(true)
    } catch (e) {
      console.error(e)
      addLog(`❌ hata: ${e instanceof Error ? e.message : 'bilinmeyen hata'}`)
    }

    setLoading(false)
  }

  return (
    <div
      style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: '2rem',
        fontFamily: 'sans-serif',
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, color: '#1A2B3C' }}>
        LexScan Pro
      </h1>
      <p style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>
        Dosya yükle ve AI analizi başlat
      </p>

      <details
        style={{
          marginBottom: 16,
          background: 'white',
          borderRadius: 12,
          border: '1px solid #eee',
          overflow: 'hidden',
        }}
      >
        <summary
          style={{
            padding: '14px 20px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
            userSelect: 'none',
            listStyle: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          📋 Sistem Sınırları ve Kullanım Detayları
        </summary>

        <div style={{ padding: '0 20px 20px', fontSize: 13, color: '#444', lineHeight: 1.8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 8, color: '#1a5f6e' }}>
                📁 Formatlar
              </div>
              <ul style={{ fontSize: 11, paddingLeft: 16 }}>
                <li>TXT / MD / CSV</li>
                <li>DOCX (mammoth.js)</li>
                <li>XLSX (SheetJS)</li>
                <li>JPG / PNG (OCR)</li>
              </ul>
            </div>

            <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 8, color: '#1a5f6e' }}>
                🤖 Analiz
              </div>
              <ul style={{ fontSize: 11, paddingLeft: 16 }}>
                <li>Claude analizi</li>
                <li>2000 kr. chunking</li>
                <li>Hibrid şema desteği</li>
              </ul>
            </div>
          </div>
        </div>
      </details>

      <div
        style={{
          background: 'white',
          borderRadius: 12,
          padding: 24,
          border: '2px solid #eee',
        }}
      >
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            border: '2px dashed #1a5f6e',
            borderRadius: 12,
            padding: '2rem',
            cursor: 'pointer',
            background: file ? '#f0f9f8' : '#f8fffe',
          }}
        >
          <input
            type="file"
            style={{ display: 'none' }}
            accept=".txt,.md,.csv,.docx,.xlsx,.xls,.xlsm,.xlsb,.jpg,.jpeg,.png"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null)
              setLog([])
              setDone(false)
            }}
          />
          {file ? (
            <div style={{ fontWeight: 600 }}>📄 {file.name}</div>
          ) : (
            <div style={{ color: '#1a5f6e' }}>⬆️ Dosya seçmek için tıkla</div>
          )}
        </label>

        <button
          onClick={handleUpload}
          disabled={!file || loading || log.some((l) => l.includes('limit'))}
          style={{
            marginTop: 16,
            width: '100%',
            padding: '14px',
            background:
              !file || loading || log.some((l) => l.includes('limit'))
                ? '#ccc'
                : '#1a5f6e',
            color: 'white',
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          {loading ? '⏳ İşleniyor...' : '🔍 Analizi Başlat'}
        </button>

        {done && (
          <div
            style={{
              marginTop: 16,
              padding: 16,
              background: '#eef8f1',
              borderRadius: 10,
              border: '1px solid #B7DEC2',
            }}
          >
            <div style={{ fontWeight: 700, color: '#216A3A' }}>
              ✅ Analiz bitti! {stats.words} kelime bulundu.
            </div>
            <button
              onClick={() => router.push(`/${locale}/admin/pending`)}
              style={{
                marginTop: 10,
                padding: '10px 14px',
                background: '#1a5f6e',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Pending Sayfasına Git
            </button>
          </div>
        )}
      </div>

      {log.length > 0 && (
        <div
          style={{
            background: '#111',
            color: '#4ade80',
            padding: 16,
            fontSize: 12,
            borderRadius: 10,
            marginTop: 16,
            maxHeight: 400,
            overflowY: 'auto',
            fontFamily: 'monospace',
            lineHeight: 1.6,
          }}
        >
          {log.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function isImageFile(name: string) {
  const n = name.toLowerCase()
  return n.endsWith('.jpg') || n.endsWith('.jpeg') || n.endsWith('.png')
}

async function extractText(file: File, addLog: (msg: string) => void): Promise<string> {
  const name = file.name.toLowerCase()

  if (isImageFile(name)) {
    addLog('🔎 OCR başlatılıyor (tur+eng)...')
    const worker = await createWorker('tur+eng')
    const {
      data: { text },
    } = await worker.recognize(file)
    await worker.terminate()
    return text
  }

  if (name.endsWith('.docx')) {
    const ab = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer: ab })
    return result.value
  }

  if (name.match(/\.xlsx?$/) || name.endsWith('.xlsm') || name.endsWith('.xlsb')) {
    const ab = await file.arrayBuffer()
    const wb = XLSX.read(ab, { type: 'array' })
    return wb.SheetNames.map((n) => XLSX.utils.sheet_to_csv(wb.Sheets[n])).join('\n')
  }

  return await file.text()
}

function splitText(text: string, size: number) {
  const arr: string[] = []
  for (let i = 0; i < text.length; i += size) {
    arr.push(text.slice(i, i + size))
  }
  return arr.filter((c) => c.trim().length > 0)
}

function extractJson(raw: string) {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  return start === -1 || end === -1 ? null : cleaned.slice(start, end + 1)
}

function getFileType(name: string) {
  const n = name.toLowerCase()
  if (n.endsWith('.txt')) return 'txt'
  if (n.endsWith('.md')) return 'md'
  if (n.endsWith('.csv')) return 'csv'
  if (n.endsWith('.docx')) return 'docx'
  if (n.match(/\.xlsx?$/) || n.endsWith('.xlsm') || n.endsWith('.xlsb')) return 'xlsx'
  if (n.endsWith('.png')) return 'png'
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'jpg'
  return 'unknown'
}

function getExtractionMethod(name: string) {
  const n = name.toLowerCase()
  if (isImageFile(n)) return 'tesseract'
  if (n.endsWith('.docx')) return 'mammoth'
  if (n.match(/\.xlsx?$/) || n.endsWith('.xlsm') || n.endsWith('.xlsb')) return 'sheetjs'
  return 'native'
}

function detectLanguageHint(name: string) {
  if (name.toLowerCase().includes('syriac')) return 'syc'
  return ''
}

function buildPrompt(text: string) {
  return `SADECE GEÇERLİ JSON DÖNDÜR. Markdown ve açıklama yazma.

Format:
{
  "words": [{"surface_form": "...", "lemma": "...", "normalized_form": "...", "language": "tr/en/syc", "word_type": "isim/fiil", "context_sentence": "..."}],
  "grammar": [{"title": "...", "content": "...", "category": "...", "language": "..."}],
  "sentences": [{"sentence_syc": "...", "sentence_tr": "...", "sentence_en": "...", "base_language": "..."}]
}

Max 15 words, 10 grammar, 10 sentences.
Metin: ${text}`
}