'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import NavBar from '../../NavBar'
import { createClient } from '@/lib/supabase'

type LearnMode = 'normal' | 'image_to_syriac' | 'image_to_english'
type LearnLang = 'tr' | 'sy' | 'en'

type Word = {
  id: string
  turkish: string | null
  english: string | null
  syriac: string | null
  transliteration: string | null
  word_type: string | null
  category_id?: string | null
  image_url?: string | null
  audio_url?: string | null
  repeatCount?: number
}

type CategoryJoinRow = {
  word_id: string
  words: Word | Word[] | null
}

function SessionContent() {
  const locale = useLocale()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const mode = (searchParams.get('mode') || 'normal') as LearnMode
  const questionLang = (searchParams.get('q') || 'tr') as LearnLang
  const answerLang = (searchParams.get('a') || 'sy') as LearnLang
  const examMode = searchParams.get('exam') === '1'
  const questionCount = Number(searchParams.get('count') || '10')

  const categoryIds = (searchParams.get('categories') || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

  const typeFilters = (searchParams.get('type') || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

  const [words, setWords] = useState<Word[]>([])
  const [queue, setQueue] = useState<Word[]>([])
  const [phase, setPhase] = useState<'card' | 'test'>('card')
  const [completedCount, setCompletedCount] = useState(0)
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAnswer, setShowAnswer] = useState(false)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)

  const catDeps = categoryIds.join(',')
  const typeDeps = typeFilters.join(',')

  useEffect(() => {
    loadSessionWords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, questionLang, answerLang, examMode, questionCount, catDeps, typeDeps])

  async function loadSessionWords() {
    setLoading(true)
    setError('')
    setCompletedCount(0)
    setShowAnswer(false)
    setSelectedOption(null)
    setCorrectCount(0)
    setWrongCount(0)
    setPhase(examMode ? 'test' : 'card')

    try {
      let loadedWords: Word[] = []

      if (categoryIds.length > 0) {
        const { data, error } = await supabase
          .from('word_category_items')
          .select(`
            word_id,
            words (
              id,
              turkish,
              english,
              syriac,
              transliteration,
              word_type,
              category_id,
              image_url,
              audio_url
            )
          `)
          .in('category_id', categoryIds)

        if (error) {
          setError(error.message)
          setWords([])
          setQueue([])
          setLoading(false)
          return
        }

        const rawWords = ((data as CategoryJoinRow[] | null) || [])
          .map((row) => (Array.isArray(row.words) ? row.words[0] : row.words))
          .filter(Boolean) as Word[]

        const uniqueMap = new Map<string, Word>()
        rawWords.forEach((word) => {
          uniqueMap.set(word.id, word)
        })

        loadedWords = Array.from(uniqueMap.values())
      } else {
        const { data, error } = await supabase
          .from('words')
          .select('id,turkish,english,syriac,transliteration,word_type,category_id,image_url,audio_url')

        if (error) {
          setError(error.message)
          setWords([])
          setQueue([])
          setLoading(false)
          return
        }

        loadedWords = (data || []) as Word[]
      }

      if (typeFilters.length > 0) {
        loadedWords = loadedWords.filter((word) =>
          typeFilters.includes(word.word_type || '')
        )
      }

      if (mode === 'image_to_syriac' || mode === 'image_to_english') {
        loadedWords = loadedWords.filter((word) => !!word.image_url)
      }

      loadedWords = [...loadedWords]
        .map((word) => ({ word, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ word }) => word)
        .slice(0, questionCount)

      setWords(loadedWords)
      setQueue(loadedWords)
      setLoading(false)
    } catch {
      setError('Öğrenme oturumu yüklenemedi.')
      setWords([])
      setQueue([])
      setLoading(false)
    }
  }

  const currentWord = queue.length > 0 ? queue[0] : null

  const options = useMemo(() => {
    if (phase !== 'test' || !currentWord) return []

    const correct = getAnswerValue(currentWord, answerLang, mode)
    
    let poolWords = words.filter(w => w.category_id === currentWord.category_id && w.word_type === currentWord.word_type && w.id !== currentWord.id)
    
    if (poolWords.length < 3) {
      const catWords = words.filter(w => w.category_id === currentWord.category_id && w.id !== currentWord.id)
      const map = new Map<string, Word>()
      poolWords.forEach(w => map.set(w.id, w))
      catWords.forEach(w => map.set(w.id, w))
      poolWords = Array.from(map.values())
    }
    
    if (poolWords.length < 3) {
      const allWords = words.filter(w => w.id !== currentWord.id)
      const map = new Map<string, Word>()
      poolWords.forEach(w => map.set(w.id, w))
      allWords.forEach(w => map.set(w.id, w))
      poolWords = Array.from(map.values())
    }

    const pool = poolWords
      .map((word) => getAnswerValue(word, answerLang, mode))
      .filter((value): value is string => !!value && value !== correct)

    const uniqueWrong = Array.from(new Set(pool))
      .map((value) => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value)
      .slice(0, 3)

    return [correct, ...uniqueWrong]
      .filter(Boolean)
      .map((value) => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value)
  }, [phase, currentWord, words, answerLang, mode])

  function nextCard() {
    setQueue(prev => prev.slice(1))
    setCompletedCount(prev => prev + 1)
    setShowAnswer(false)
    setSelectedOption(null)
  }

  function handleOptionSelect(option: string) {
    if (!currentWord || selectedOption) return

    const correct = getAnswerValue(currentWord, answerLang, mode)
    setSelectedOption(option)

    if (option === correct) {
      setCorrectCount((prev) => prev + 1)
    } else {
      setWrongCount((prev) => prev + 1)
      const repeatInQueue = queue.filter(w => w.id === currentWord.id).length
      
      if (!examMode && repeatInQueue < 3) {
        setQueue(prev => [
          ...prev, 
          { ...currentWord, repeatCount: (currentWord.repeatCount || 0) + 1 }
        ])
      }
    }
  }

  function playAudio() {
    if (!currentWord?.audio_url) return
    const audio = new Audio(currentWord.audio_url)
    audio.play()
  }

  const progressText = words.length ? `${Math.min(completedCount + 1, words.length)} / ${words.length}` : '0 / 0'
  const repeatQueueCount = Math.max(queue.length - (words.length - completedCount), 0)

  const questionValue = currentWord ? getQuestionValue(currentWord, questionLang, mode) : ''
  const answerValue = currentWord ? getAnswerValue(currentWord, answerLang, mode) : ''
  const answerIsCorrect = !!selectedOption && selectedOption === answerValue

  let displayQuestionTitle = questionValue || '—'
  if (mode === 'image_to_syriac') displayQuestionTitle = "Bu görselin Süryanicesi nedir?"
  if (mode === 'image_to_english') displayQuestionTitle = "Bu görselin İngilizcesi nedir?"

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
                href={`/${locale}/learn`}
                style={{
                  color: 'rgba(255,255,255,0.78)',
                  textDecoration: 'none',
                  fontSize: '0.88rem',
                }}
              >
                ← Öğrenme Sınıfına Dön
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
              Öğrenme Oturumu
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
              {modeLabel(mode)}
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
          ) : !currentWord && !loading && !error && words.length > 0 ? (
            <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', animation: 'fadeIn 0.5s ease' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏆</div>
              <h2 style={{ fontSize: '2.2rem', color: 'var(--color-primary)', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>Öğrenme Tamamlandı!</h2>
              <p style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
                Harika iş! {examMode ? 'Testi başarıyla bitirdin.' : 'Yanlış yaptıklarını tekrar ederek bugün seçtiğin tüm kelimeleri hafızana kazıdın.'}
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <Link href={`/${locale}/learn`} className="btn btn-secondary">← Sınıfa Dön</Link>
                <button className="btn btn-primary" onClick={loadSessionWords}>🔄 Tekrar Başla</button>
              </div>
            </div>
          ) : !currentWord ? (
            <div className="card" style={{ padding: '1.5rem', textAlign: 'center', color: '#A94442' }}>
              Seçtiğin filtrelere uygun kelime bulunamadı. Kategori veya kelime türü filtresini azaltıp tekrar dene.
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
                  {repeatQueueCount > 0 && <span style={{ marginLeft: '10px', color: '#A94442', fontWeight: 600 }}>(Tekrar kuyruğu: {repeatQueueCount})</span>}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-primary">✓ {correctCount}</span>
                  <span className="badge" style={{ color: '#A94442', background: '#FFF7F7' }}>✗ {wrongCount}</span>
                </div>
              </div>

              <div
                className="card"
                style={{
                  padding: '1.3rem',
                  maxWidth: 760,
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
                  <span className="badge" style={{ background: phase === 'card' ? '#E0E6E9' : '#F4F1EA' }}>
                    {phase === 'card' ? 'Öğrenme Kartı' : 'Soru Testi'}
                  </span>
                  <span className="badge badge-primary">{currentWord.word_type || 'kelime'}</span>
                </div>

                {(mode === 'image_to_syriac' || mode === 'image_to_english') && (
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '16/9',
                      borderRadius: 12,
                      overflow: 'hidden',
                      border: '1px solid var(--color-border)',
                      background: '#F4F1EA',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {currentWord.image_url ? (
                      <img
                        src={currentWord.image_url}
                        alt={currentWord.turkish || 'word-image'}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '3rem' }}>🖼️</span>
                    )}
                  </div>
                )}

                <div
                  style={{
                    textAlign: 'center',
                    padding: '1rem 0',
                    minHeight: 120,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        questionLang === 'sy' || mode.startsWith('image_') ? '2rem' : '1.8rem',
                      color: questionLang === 'sy' ? 'var(--color-primary)' : 'var(--color-text)',
                      fontFamily: questionLang === 'sy' ? 'var(--font-display)' : 'inherit',
                      fontWeight: 700,
                    }}
                  >
                    {displayQuestionTitle}
                  </div>

                  {phase === 'card' &&
                    questionLang === 'sy' &&
                    currentWord.transliteration && (
                      <div
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--color-text-subtle)',
                        }}
                      >
                        {currentWord.transliteration}
                      </div>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                    marginBottom: '1rem',
                  }}
                >
                  {currentWord.audio_url && (
                    <button type="button" className="btn btn-primary" onClick={playAudio}>
                      🔊 Telaffuz
                    </button>
                  )}
                </div>

                {phase === 'card' ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowAnswer((v) => !v)}
                      >
                        {showAnswer ? 'Cevabı Gizle' : 'Cevabı Göster'}
                      </button>
                    </div>

                    {showAnswer && (
                      <div
                        className="card"
                        style={{
                          padding: '1rem',
                          background: '#FAFAF8',
                          border: '1px solid var(--color-border)',
                          marginBottom: '1rem',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--color-text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            marginBottom: '0.35rem',
                          }}
                        >
                          Cevap
                        </div>

                        <div
                          style={{
                            fontSize: answerLang === 'sy' ? '1.6rem' : '1.1rem',
                            fontFamily: answerLang === 'sy' ? 'var(--font-display)' : 'inherit',
                            color: answerLang === 'sy' ? 'var(--color-primary)' : 'var(--color-text)',
                            fontWeight: 700,
                            marginBottom: '0.4rem',
                          }}
                        >
                          {answerValue || '—'}
                        </div>

                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
                          Türkçe: {currentWord.turkish || '—'} · İngilizce: {currentWord.english || '—'}
                        </div>

                        {answerLang === 'sy' && currentWord.transliteration && (
                          <div
                            style={{
                              marginTop: '0.5rem',
                              fontSize: '0.86rem',
                              color: 'var(--color-text-subtle)',
                            }}
                          >
                            {currentWord.transliteration}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {options.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#A94442', padding: '1rem' }}>
                        <div style={{ marginBottom: '1rem' }}>Yeterli seçenek üretilemedi.</div>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            nextCard()
                            setPhase(examMode ? 'test' : 'card')
                          }}
                        >
                          Bu kelimeyi geç →
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
                          const isCorrect = option === answerValue

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
                          {answerIsCorrect ? 'Doğru! Kelime öğrenildi.' : 'Yanlış! Bu kelimeyi tekrar soracağız.'}
                        </div>
                        {!answerIsCorrect && <div>Doğru cevap: {answerValue || '—'}</div>}

                        {answerLang === 'sy' && currentWord.transliteration && (
                          <div
                            style={{
                              marginTop: '0.45rem',
                              fontSize: '0.86rem',
                              color: 'var(--color-text-subtle)',
                            }}
                          >
                            {currentWord.transliteration}
                          </div>
                        )}
                      </div>
                    )}
                  </>
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
                      if (phase === 'card') {
                        setPhase('test')
                        return
                      }

                      if (!selectedOption) return

                      nextCard()
                      setPhase(examMode ? 'test' : 'card')
                    }}
                  >
                    {phase === 'card' ? 'Teste Geç →' : 'Sonraki Kelime →'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  )
}

function getQuestionValue(word: Word, lang: LearnLang, mode: LearnMode) {
  if (mode === 'image_to_syriac') return word.image_url || '—'
  if (mode === 'image_to_english') return word.image_url || '—'
  if (lang === 'tr') return word.turkish || '—'
  if (lang === 'sy') return word.syriac || '—'
  return word.english || '—'
}

function getAnswerValue(word: Word, lang: LearnLang, mode: LearnMode) {
  if (mode === 'image_to_syriac') return word.syriac || '—'
  if (mode === 'image_to_english') return word.english || '—'
  if (lang === 'tr') return word.turkish || '—'
  if (lang === 'sy') return word.syriac || '—'
  return word.english || '—'
}

function langLabel(value: LearnLang) {
  if (value === 'tr') return 'Türkçe'
  if (value === 'sy') return 'Süryanice'
  return 'İngilizce'
}

function modeLabel(value: LearnMode) {
  if (value === 'normal') return 'Normal Mod'
  if (value === 'image_to_syriac') return 'Görselden → Süryanice'
  return 'Görselden → İngilizce'
}

export default function LearnSessionPageWrapper() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1A5F6E', fontWeight: 600 }}>
        Motor Hazırlanıyor...
      </div>
    }>
      <SessionContent />
    </Suspense>
  )
}