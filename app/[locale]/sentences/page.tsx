'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import NavBar from '../NavBar'

type Word = {
  id: string
  turkish: string | null
  english?: string | null
  syriac: string | null
  transliteration?: string | null
  word_type: string | null
}

type AiCheckResult = {
  success?: boolean
  input?: {
    sentence?: string
    subject?: string | null
    verb?: string | null
    object?: string | null
  }
  analysis?: {
    root?: string | null
    prefix?: string | null
    expected?: string | null
    actual?: string | null
    isCorrect?: boolean
  }
  feedback?: string | null
  explanation?: string | null
  meta?: {
    person?: string | null
    number?: string | null
    tense?: string | null
  }
  error?: string
}

type TraceResult = {
  success?: boolean
  trace?: unknown
  error?: string
}

const SUBJECT_OPTIONS = [
  { value: 'ܐܢܐ', label: 'ܐܢܐ', desc: 'Ben' },
  { value: 'ܐܢܬ', label: 'ܐܢܬ', desc: 'Sen' },
  { value: 'ܗܘ', label: 'ܗܘ', desc: 'O' },
]

export default function SentenceBuilderAdvanced() {
  const locale = useLocale()

  const [words, setWords] = useState<Word[]>([])
  const [subject, setSubject] = useState('ܐܢܐ')
  const [verb, setVerb] = useState('')
  const [object, setObject] = useState('')
  const [sentence, setSentence] = useState('')
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const [aiLoading, setAiLoading] = useState(false)
  const [traceLoading, setTraceLoading] = useState(false)
  const [showTranslation, setShowTranslation] = useState(true)

  const [aiCheck, setAiCheck] = useState<AiCheckResult | null>(null)
  const [traceData, setTraceData] = useState<TraceResult | null>(null)

  useEffect(() => {
    async function loadWords() {
      try {
        setPageLoading(true)
        setError('')

        const res = await fetch('/api/words')
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data?.error || 'Kelime verileri yüklenemedi.')
        }

        setWords(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Kelime listesi alınamadı.')
        setWords([])
      } finally {
        setPageLoading(false)
      }
    }

    loadWords()
  }, [])

  async function buildSentence() {
    if (!verb) {
      setError('Önce bir fiil seç.')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSentence('')
      setAiCheck(null)
      setTraceData(null)

      const res = await fetch('/api/sentences/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          word_text: verb,
          object,
          tense: 'past',
          person: '1st',
          number: 'singular',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || 'Cümle oluşturulamadı.')
      }

      setSentence(data.sentence || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cümle oluşturulamadı.')
    } finally {
      setLoading(false)
    }
  }

  async function runAiCheck() {
    if (!sentence.trim()) {
      setError('Önce bir cümle üret.')
      return
    }

    try {
      setAiLoading(true)
      setError('')
      setAiCheck(null)

      const res = await fetch('/api/sentences/ai-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || 'AI Check çalıştırılamadı.')
      }

      setAiCheck(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI Check çalıştırılamadı.')
    } finally {
      setAiLoading(false)
    }
  }

  async function runTrace() {
    if (!sentence.trim()) {
      setError('Önce bir cümle üret.')
      return
    }

    try {
      setTraceLoading(true)
      setError('')
      setTraceData(null)

      const res = await fetch('/api/sentences/trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          word_text: verb,
          object,
          tense: 'past',
          person: '1st',
          number: 'singular',
          sentence,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || 'Trace çalıştırılamadı.')
      }

      setTraceData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Trace çalıştırılamadı.')
    } finally {
      setTraceLoading(false)
    }
  }

  async function copySentence() {
    if (!sentence.trim()) return

    try {
      await navigator.clipboard.writeText(sentence)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('Cümle kopyalanamadı.')
    }
  }

  const verbs = useMemo(
    () => words.filter((w) => w.word_type === 'verb' && w.syriac),
    [words]
  )

  const nouns = useMemo(
    () => words.filter((w) => w.word_type === 'noun' && w.syriac),
    [words]
  )

  const selectedVerb = verbs.find((v) => v.syriac === verb)
  const selectedObject = nouns.find((n) => n.syriac === object)
  const selectedSubject = SUBJECT_OPTIONS.find((s) => s.value === subject)

  const translationText = useMemo(() => {
    const parts = [
      selectedSubject?.desc || '',
      selectedVerb?.turkish || '',
      selectedObject?.turkish || '',
    ].filter(Boolean)

    return parts.length > 0 ? parts.join(' ') : '—'
  }, [selectedObject, selectedSubject, selectedVerb])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <NavBar />

      <main>
        <section
          style={{
            background: 'linear-gradient(135deg, var(--color-primary) 0%, #0F3D47 100%)',
            padding: '2.8rem 0',
          }}
        >
          <div className="container">
            <p
              style={{
                color: 'rgba(255,255,255,0.72)',
                fontSize: '0.82rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '0.45rem',
              }}
            >
              Cümle Alanı
            </p>

            <h1
              style={{
                color: 'white',
                fontFamily: 'var(--font-display)',
                fontSize: '2.1rem',
                fontWeight: 700,
                marginBottom: '0.65rem',
              }}
            >
              Cümle Kurma Motoru
            </h1>

            <p
              style={{
                color: 'rgba(255,255,255,0.86)',
                fontSize: '0.98rem',
                lineHeight: 1.7,
                maxWidth: 820,
              }}
            >
              Özne, fiil ve nesne seçerek Süryanice cümle üret. Sonrasında AI Check ve
              Trace ile yapıyı test et.
            </p>
          </div>
        </section>

        <div className="container" style={{ padding: '2rem 1.5rem 3rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.25rem',
              alignItems: 'start',
            }}
          >
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div
                style={{
                  padding: '0.95rem 1.2rem',
                  background: '#E7E3D8',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <div
                  style={{
                    fontSize: '0.84rem',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text)',
                    fontWeight: 700,
                  }}
                >
                  Cümle Ayarları
                </div>
              </div>

              <div style={{ padding: '1.2rem' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '0.9rem',
                    marginBottom: '1rem',
                  }}
                >
                  <Field label="Özne">
                    <select
                      className="input"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    >
                      {SUBJECT_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label} ({item.desc})
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Fiil">
                    <select
                      className="input"
                      value={verb}
                      onChange={(e) => setVerb(e.target.value)}
                      disabled={pageLoading}
                    >
                      <option value="">Fiil seç</option>
                      {verbs.map((v) => (
                        <option key={v.id} value={v.syriac || ''}>
                          {v.syriac} {v.turkish ? `(${v.turkish})` : ''}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Nesne">
                    <select
                      className="input"
                      value={object}
                      onChange={(e) => setObject(e.target.value)}
                      disabled={pageLoading}
                    >
                      <option value="">Nesne yok</option>
                      {nouns.map((n) => (
                        <option key={n.id} value={n.syriac || ''}>
                          {n.syriac} {n.turkish ? `(${n.turkish})` : ''}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                {error && (
                  <div
                    className="card"
                    style={{
                      padding: '0.9rem 1rem',
                      background: '#FFF7F7',
                      border: '1px solid #E5C7C7',
                      color: '#A94442',
                      marginBottom: '1rem',
                    }}
                  >
                    {error}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}
                >
                  <button
                    type="button"
                    onClick={buildSentence}
                    className="btn btn-secondary"
                    disabled={loading || pageLoading}
                  >
                    {loading ? 'Oluşturuluyor...' : 'Cümle Oluştur'}
                  </button>

                  <Link href={`/${locale}/learn-sentences`} className="btn btn-ghost">
                    Cümle Öğren
                  </Link>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '1.2rem' }}>
              <div
                style={{
                  fontSize: '0.84rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-muted)',
                  fontWeight: 700,
                  marginBottom: '0.9rem',
                }}
              >
                Seçili Parçalar
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: '0.75rem',
                }}
              >
                <InfoBox
                  label="Özne"
                  value={selectedSubject ? `${selectedSubject.label} (${selectedSubject.desc})` : '—'}
                />

                <InfoBox
                  label="Fiil"
                  value={
                    selectedVerb
                      ? `${selectedVerb.syriac || '—'}${selectedVerb.turkish ? ` · ${selectedVerb.turkish}` : ''}`
                      : 'Seçilmedi'
                  }
                />

                <InfoBox
                  label="Nesne"
                  value={
                    selectedObject
                      ? `${selectedObject.syriac || '—'}${selectedObject.turkish ? ` · ${selectedObject.turkish}` : ''}`
                      : 'Yok'
                  }
                />

                <InfoBox
                  label="Yüklenen fiil sayısı"
                  value={pageLoading ? 'Yükleniyor...' : String(verbs.length)}
                />

                <InfoBox
                  label="Yüklenen isim sayısı"
                  value={pageLoading ? 'Yükleniyor...' : String(nouns.length)}
                />
              </div>
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '1.25rem',
              marginTop: '1.25rem',
              background: 'linear-gradient(135deg, var(--color-primary-light), white)',
              borderColor: 'rgba(26, 95, 110, 0.15)',
            }}
          >
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--color-text)',
                marginBottom: '0.5rem',
              }}
            >
              Üretilen Sonuç
            </div>

            {sentence ? (
              <>
                <div
                  style={{
                    border: '1px solid var(--color-border)',
                    background: 'white',
                    borderRadius: 12,
                    padding: '1.2rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div
                    style={{
                      fontSize: '2rem',
                      direction: 'rtl',
                      textAlign: 'right',
                      color: 'var(--color-primary)',
                      fontFamily: 'var(--font-display)',
                      lineHeight: 1.8,
                    }}
                  >
                    {sentence}
                  </div>

                  {showTranslation && (
                    <div
                      style={{
                        marginTop: '0.85rem',
                        paddingTop: '0.85rem',
                        borderTop: '1px solid var(--color-border)',
                        color: 'var(--color-text-muted)',
                        fontSize: '0.95rem',
                      }}
                    >
                      Türkçe karşılık: {translationText}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                    marginBottom: '1rem',
                  }}
                >
                  <button type="button" className="btn btn-secondary" onClick={runAiCheck} disabled={aiLoading}>
                    {aiLoading ? 'AI Check çalışıyor...' : 'AI Check'}
                  </button>

                  <button type="button" className="btn btn-ghost" onClick={runTrace} disabled={traceLoading}>
                    {traceLoading ? 'Trace çalışıyor...' : 'Trace'}
                  </button>

                  <button type="button" className="btn btn-ghost" onClick={copySentence}>
                    {copied ? 'Kopyalandı' : 'Kopyala'}
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowTranslation((v) => !v)}
                  >
                    {showTranslation ? 'Türkçeyi Gizle' : 'Türkçe Karşılığı Göster'}
                  </button>
                </div>
              </>
            ) : (
              <div
                style={{
                  border: '1px dashed var(--color-border)',
                  background: 'rgba(255,255,255,0.65)',
                  borderRadius: 12,
                  padding: '1.2rem',
                  color: 'var(--color-text-muted)',
                }}
              >
                Henüz cümle üretilmedi. Özne, fiil ve gerekiyorsa nesne seçip
                “Cümle Oluştur” butonuna bas.
              </div>
            )}

            {aiCheck && (
              <div className="card" style={{ padding: '1rem', marginTop: '1rem' }}>
                <div
                  style={{
                    fontSize: '0.84rem',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-muted)',
                    fontWeight: 700,
                    marginBottom: '0.75rem',
                  }}
                >
                  AI Check Sonucu
                </div>

                <div style={{ display: 'grid', gap: '0.65rem' }}>
                  <InfoBox label="Geri Bildirim" value={aiCheck.feedback || '—'} />
                  <InfoBox
                    label="Doğruluk"
                    value={aiCheck.analysis?.isCorrect ? 'Doğru kullanım' : 'Kontrol gerekli'}
                  />
                  <InfoBox label="Beklenen" value={aiCheck.analysis?.expected || '—'} />
                  <InfoBox label="Gerçek" value={aiCheck.analysis?.actual || '—'} />
                  <InfoBox label="Kök" value={aiCheck.analysis?.root || '—'} />
                  <InfoBox label="Açıklama" value={aiCheck.explanation || '—'} />
                </div>
              </div>
            )}

            {traceData && (
              <div className="card" style={{ padding: '1rem', marginTop: '1rem' }}>
                <div
                  style={{
                    fontSize: '0.84rem',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-muted)',
                    fontWeight: 700,
                    marginBottom: '0.75rem',
                  }}
                >
                  Trace Sonucu
                </div>

                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    margin: 0,
                    fontSize: '0.88rem',
                    lineHeight: 1.6,
                    color: 'var(--color-text)',
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 10,
                    padding: '0.9rem',
                    overflowX: 'auto',
                  }}
                >
                  {JSON.stringify(traceData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: '0.78rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--color-text)',
          fontWeight: 700,
          marginBottom: '0.45rem',
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        padding: '0.85rem 0.9rem',
        background: 'var(--color-bg-card)',
      }}
    >
      <div
        style={{
          fontSize: '0.76rem',
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '0.25rem',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '0.95rem',
          fontWeight: 700,
          color: 'var(--color-text)',
          lineHeight: 1.5,
        }}
      >
        {value}
      </div>
    </div>
  )
}
