'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import NavBar from '../../NavBar'
import { createClient } from '@/lib/supabase'

type SentenceMode = 'multiple_choice' | 'fill_blank'
type SentenceLang = 'tr' | 'sy' | 'en'

type SentenceRow = {
  id: string
  sentence_syc: string | null
  sentence_tr: string | null
  sentence_en: string | null
  notes?: string | null
  needs_review?: boolean | null
  category_id?: string | null
  base_language?: string | null
  created_at?: string | null
}

function SessionContent() {
  const locale = useLocale()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const mode = (searchParams.get('mode') || 'multiple_choice') as SentenceMode
  const questionLang = (searchParams.get('q') || 'sy') as SentenceLang
  const answerLang = (searchParams.get('a') || 'tr') as SentenceLang
  const examMode = searchParams.get('exam') === '1'
  const questionCount = Number(searchParams.get('count') || '10')

  const categoryIds = (searchParams.get('categories') || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

  const [sentences, setSentences] = useState<SentenceRow[]>([])
  const [queue, setQueue] = useState<SentenceRow[]>([])
  const [completedCount, setCompletedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)

  const catDeps = categoryIds.join(',')

  useEffect(() => {
    loadSessionSentences()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, questionLang, answerLang, examMode, questionCount, catDeps])

  async function loadSessionSentences() {
    setLoading(true)
    setError('')
    setSelectedOption(null)
    setCorrectCount(0)
    setWrongCount(0)
    setCompletedCount(0)

    try {
      let query = supabase
        .from('sentences')
        .select('id,sentence_syc,sentence_tr,sentence_en,notes,needs_review,category_id,base_language,created_at')
        .eq('needs_review', false)
        .not('sentence_syc', 'is', null)
        .not('sentence_tr', 'is', null)

      if (categoryIds.length > 0) {
        query = query.in('category_id', categoryIds)
      }

      const { data, error } = await query

      if (error) {
        setError(error.message)
        setSentences([])
        setQueue([])
        setLoading(false)
        return
      }

      let rows = ((data || []) as SentenceRow[]).filter((row) => {
        const syc = (row.sentence_syc || '').trim()
        const tr = (row.sentence_tr || '').trim()
        const en = (row.sentence_en || '').trim()

        if (!syc) return false
        if (!tr && !en) return false

        if (syc.length < 4) return false
        if (tr && tr.length < 4) return false

        if (/[A-Za-z]/.test(syc)) return false
        if (/[0-9]/.test(syc)) return false
        if (/[<>@#$%^&*_=+\[\]{}\\|/~`]/.test(syc)) return false

        if (/sds|asd/i.test(syc)) return false
        if (/sds|asd/i.test(tr)) return false
        if (/sds|asd/i.test(en)) return false

        const q = getSentenceByLang(row, questionLang)
        const a = getSentenceByLang(row, answerLang)

        if (!q || !a) return false

        return true
      })

      if (mode === 'fill_blank') {
        rows = rows.filter((row) => {
          const a = getSentenceByLang(row, answerLang)
          return !!a && a.trim().includes(' ')
        })
      }

      rows = [...rows]
        .map((row) => ({ row, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ row }) => row)
        .slice(0, questionCount)

      setSentences(rows)
      setQueue(rows)
      setLoading(false)
    } catch {
      setError('Cümle öğrenme oturumu yüklenemedi.')
      setSentences([])
      setQueue([])
      setLoading(false)
    }
  }

  const currentSentence = queue.length > 0 ? queue[0] : null

  const correctAnswer = useMemo(() => {
    if (!currentSentence) return ''
    const answer = getSentenceByLang(currentSentence, answerLang)
    if (!answer) return ''
    if (mode === 'fill_blank') {
      return getBlankedAnswer(answer)
    }
    return answer
  }, [currentSentence, answerLang, mode])

  const questionText = useMemo(() => {
    if (!currentSentence) return ''
    const question = getSentenceByLang(currentSentence, questionLang)
    if (!question) return ''
    if (mode === 'fill_blank') {
      const answer = getSentenceByLang(currentSentence, answerLang)
      if (!answer) return question
      return buildBlankQuestion(question, answer)
    }
    return question
  }, [currentSentence, questionLang, answerLang, mode])

  const options = useMemo(() => {
    if (!currentSentence) return []
    if (mode === 'multiple_choice') {
      const correct = getSentenceByLang(currentSentence, answerLang)
      if (!correct) return []

      const pool = sentences
        .filter((row) => row.id !== currentSentence.id)
        .map((row) => getSentenceByLang(row, answerLang))
        .filter((value): value is string => !!value && value !== correct)

      const uniqueWrong = Array.from(new Set(pool))
        .map((value) => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value)
        .slice(0, 3)

      return [correct, ...uniqueWrong]
        .map((value) => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value)
    }

    const correct = correctAnswer
    if (!correct) return []

    const pool = sentences
      .filter((row) => row.id !== currentSentence.id)
      .map((row) => getSentenceByLang(row, answerLang))
      .filter((value): value is string => !!value)
      .map((value) => getBlankedAnswer(value))
      .filter((value) => !!value && value !== correct)

    const uniqueWrong = Array.from(new Set(pool))
      .map((value) => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value)
      .slice(0, 3)

    return [correct, ...uniqueWrong]
      .map((value) => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value)
  }, [currentSentence, sentences, answerLang, mode, correctAnswer])

  function handleOptionSelect(option: string) {
    if (!currentSentence || selectedOption) return
    setSelectedOption(option)

    if (option === correctAnswer) {
      setCorrectCount((prev) => prev + 1)
    } else {
      setWrongCount((prev) => prev + 1)
    }
  }

  function nextCard() {
    setQueue((prev) => prev.slice(1))
    setCompletedCount((prev) => prev + 1)
    setSelectedOption(null)
  }

  const progressText = sentences.length
    ? `${Math.min(completedCount + 1, sentences.length)} / ${sentences.length}`
    : '0 / 0'

  const answerIsCorrect = !!selectedOption && selectedOption === correctAnswer

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <NavBar />

      <main>
        <section
          style={{
            background: 'linear-gradient(135deg, var(--color-primary) 0%, #0F3D47 100%)',
            padding: '2.5rem 0',
          }}
        >
          <div className="container">
            <div style={{ marginBottom: '0.5rem' }}>
              <Link
                href={`/${locale}/learn-sentences`}
                style={{
                  color: 'rgba(255,255,255,0.78)',
                  textDecoration: 'none',
                  fontSize: '0.88rem',
                }}
              >
                ← Cümle Öğrenme Sınıfına Dön
              </Link>
            </div>

            <p
              style={{
                color: 'rgba(255,255,255,0.68)',
                fontSize: '0.8rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '0.35rem',
              }}
            >
              Cümle Öğrenme Oturumu
            </p>

            <h1
              style={{
                color: 'white',
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                fontWeight: 700,
                marginBottom: '0.55rem',
              }}
            >
              {mode === 'multiple_choice' ? 'Çoktan Seçmeli' : 'Boşluk Doldurma'}
            </h1>

            <p
              style={{
                color: 'rgba(255,255,255,0.82)',
                maxWidth: 760,
                lineHeight: 1.7,
              }}
            >
              Soru dili: {langLabel(questionLang)} · Cevap dili: {langLabel(answerLang)} · {examMode ? 'Sınav Modu' : 'Öğrenme Modu'}
            </p>
          </div>
        </section>

        <div className="container" style={{ padding: '2rem 1.5rem 3rem' }}>
          {loading ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              Yükleniyor...
            </div>
          ) : error ? (
            <div
              className="card"
              style={{
                padding: '1.25rem',
                color: '#A94442',
                border: '1px solid #E5C7C7',
                background: '#FFF7F7',
              }}
            >
              {error}
            </div>
          ) : !currentSentence && !loading && !error && sentences.length > 0 ? (
            <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏆</div>
              <h2
                style={{
                  fontSize: '2.2rem',
                  color: 'var(--color-primary)',
                  marginBottom: '1rem',
                  fontFamily: 'var(--font-display)',
                }}
              >
                Oturum Tamamlandı!
              </h2>
              <p
                style={{
                  fontSize: '1.1rem',
                  color: 'var(--color-text-muted)',
                  marginBottom: '2rem',
                  maxWidth: '500px',
                  margin: '0 auto 2rem',
                }}
              >
                Doğrulanmış cümle havuzundaki seçili oturum tamamlandı.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <Link href={`/${locale}/learn-sentences`} className="btn btn-secondary">
                  ← Sınıfa Dön
                </Link>
                <button className="btn btn-primary" onClick={loadSessionSentences}>
                  🔄 Tekrar Başla
                </button>
              </div>
            </div>
          ) : !currentSentence ? (
            <div className="card" style={{ padding: '1.5rem', textAlign: 'center', color: '#A94442' }}>
              Seçtiğin filtrelere uygun cümle bulunamadı.
            </div>
          ) : (
            <>
              <div
                className="card"
                style={{
                  padding: '1rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ fontSize: '0.92rem', color: 'var(--color-text-muted)' }}>
                  İlerleme: {progressText}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-primary">✓ {correctCount}</span>
                  <span className="badge" style={{ color: '#A94442', background: '#FFF7F7' }}>
                    ✗ {wrongCount}
                  </span>
                </div>
              </div>

              <div
                className="card"
                style={{
                  padding: '1.3rem',
                  maxWidth: 860,
                  margin: '0 auto',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    marginBottom: '1rem',
                  }}
                >
                  <span className="badge" style={{ background: '#F4F1EA' }}>
                    {mode === 'multiple_choice' ? 'Cümle Testi' : 'Boşluk Doldurma'}
                  </span>
                  <span className="badge badge-primary">
                    {langLabel(questionLang)} → {langLabel(answerLang)}
                  </span>
                </div>

                <div
                  style={{
                    textAlign: 'center',
                    padding: '1rem 0',
                    minHeight: 140,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div
                    style={{
                      fontSize: questionLang === 'sy' ? '1.9rem' : '1.25rem',
                      color: questionLang === 'sy' ? 'var(--color-primary)' : 'var(--color-text)',
                      fontFamily: questionLang === 'sy' ? 'var(--font-display)' : 'inherit',
                      fontWeight: 700,
                      lineHeight: 1.7,
                    }}
                  >
                    {questionText || '—'}
                  </div>
                </div>

                {options.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#A94442', padding: '1rem' }}>
                    <div style={{ marginBottom: '1rem' }}>Yeterli seçenek üretilemedi.</div>
                    <button type="button" className="btn btn-secondary" onClick={nextCard}>
                      Bu cümleyi geç →
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gap: '0.65rem',
                      marginBottom: '1rem',
                    }}
                  >
                    {options.map((option) => {
                      const isSelected = selectedOption === option
                      const isCorrect = option === correctAnswer

                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleOptionSelect(option)}
                          disabled={!!selectedOption}
                          className="btn"
                          style={{
                            justifyContent: 'flex-start',
                            textAlign: 'left',
                            border: '1px solid var(--color-border)',
                            background: isSelected
                              ? isCorrect
                                ? '#EAF4EE'
                                : '#FFF1F1'
                              : selectedOption && isCorrect
                                ? '#EAF4EE'
                                : 'white',
                            color: 'var(--color-text)',
                            padding: '0.9rem 1rem',
                            fontWeight: 600,
                            whiteSpace: 'normal',
                            lineHeight: 1.6,
                          }}
                        >
                          {option}
                        </button>
                      )
                    })}
                  </div>
                )}

                {selectedOption && (
                  <div
                    className="card"
                    style={{
                      padding: '1rem',
                      background: answerIsCorrect ? '#EEF8F1' : '#FFF7F7',
                      border: answerIsCorrect ? '1px solid #B7DEC2' : '1px solid #E5C7C7',
                      color: answerIsCorrect ? '#216A3A' : '#A94442',
                      marginBottom: '1rem',
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>
                      {answerIsCorrect ? 'Doğru!' : 'Yanlış!'}
                    </div>
                    {!answerIsCorrect && <div>Doğru cevap: {correctAnswer || '—'}</div>}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      if (!selectedOption) return
                      nextCard()
                    }}
                  >
                    Sonraki Cümle →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function getSentenceByLang(row: SentenceRow, lang: SentenceLang) {
  if (lang === 'sy') return row.sentence_syc?.trim() || ''
  if (lang === 'tr') return row.sentence_tr?.trim() || ''
  return row.sentence_en?.trim() || ''
}

function getBlankedAnswer(answer: string) {
  const words = answer.split(/\s+/).filter(Boolean)
  if (words.length < 2) return answer
  const index = Math.floor(words.length / 2)
  return words[index] || answer
}

function buildBlankQuestion(question: string, answer: string) {
  const answerWords = answer.split(/\s+/).filter(Boolean)
  if (answerWords.length < 2) return question
  const hiddenWord = answerWords[Math.floor(answerWords.length / 2)]
  if (!hiddenWord) return question
  return `${question}\n\nEksik kelimeyi seç.`
}

function langLabel(value: SentenceLang) {
  if (value === 'tr') return 'Türkçe'
  if (value === 'sy') return 'Süryanice'
  return 'İngilizce'
}

export default function LearnSentencesSessionPageWrapper() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1A5F6E',
            fontWeight: 600,
          }}
        >
          Motor Hazırlanıyor...
        </div>
      }
    >
      <SessionContent />
    </Suspense>
  )
}