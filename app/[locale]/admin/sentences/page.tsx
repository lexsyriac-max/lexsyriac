'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/app/lib/supabase'

type Language = 'turkish' | 'english' | 'syriac'
type Tense = 'present' | 'past' | 'future' | 'aorist'
type SentenceType = 'positive' | 'negative' | 'question'

type Word = {
  id: string
  turkish: string
  english: string
  syriac: string
  transliteration?: string | null
  word_type: string
}

type WordForm = {
  id: string
  word_id: string
  form_text: string
  form_type: string | null
  language: string | null
  transliteration: string | null
}

function normalizeType(value?: string | null) {
  const v = (value || '').trim().toLowerCase()

  if (['isim', 'noun', 'ad'].includes(v)) return 'noun'
  if (['fiil', 'verb'].includes(v)) return 'verb'
  if (['zamir', 'pronoun'].includes(v)) return 'pronoun'
  if (['sıfat', 'sifat', 'adjective'].includes(v)) return 'adjective'
  if (['zarf', 'adverb'].includes(v)) return 'adverb'
  if (['edat', 'preposition'].includes(v)) return 'preposition'
  if (['bağlaç', 'baglac', 'conjunction'].includes(v)) return 'conjunction'
  if (['ünlem', 'unlem', 'interjection'].includes(v)) return 'interjection'

  return 'other'
}

function getWordLabel(word: Word, language: Language) {
  if (language === 'turkish') return word.turkish || '—'
  if (language === 'english') return word.english || '—'
  return word.syriac || '—'
}

export default function SentenceBuilderPage() {
  const supabase = createClient()

  const [language, setLanguage] = useState<Language>('turkish')
  const [tense, setTense] = useState<Tense>('present')
  const [sentenceType, setSentenceType] = useState<SentenceType>('positive')

  const [words, setWords] = useState<Word[]>([])
  const [verbForms, setVerbForms] = useState<WordForm[]>([])

  const [subjectId, setSubjectId] = useState('')
  const [verbId, setVerbId] = useState('')
  const [objectId, setObjectId] = useState('')
  const [formId, setFormId] = useState('')

  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [isCorrect, setIsCorrect] = useState<'yes' | 'no' | ''>('')
  const [correctedSentence, setCorrectedSentence] = useState('')
  const [notes, setNotes] = useState('')
  const [suggestedRuleTitle, setSuggestedRuleTitle] = useState('')
  const [suggestedRuleDescription, setSuggestedRuleDescription] = useState('')
  const [suggestedExample, setSuggestedExample] = useState('')
  const [savingFeedback, setSavingFeedback] = useState(false)

  useEffect(() => {
    loadWords()
  }, [])

  useEffect(() => {
    setFormId('')
    setVerbForms([])
    setOutput('')
    setMessage('')
    setError('')
  }, [language, tense, sentenceType])

  useEffect(() => {
    if (!verbId) {
      setVerbForms([])
      setFormId('')
      return
    }

    loadFormsForVerb(verbId)
    setFormId('')
    setOutput('')
  }, [verbId, language])

  async function loadWords() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('words')
      .select('*')
      .order('turkish')

    if (error) {
      setError(error.message)
      setWords([])
      setLoading(false)
      return
    }

    setWords(data || [])
    setLoading(false)
  }

  async function loadFormsForVerb(wordId: string) {
    const { data, error } = await supabase
      .from('word_forms')
      .select('*')
      .eq('word_id', wordId)
      .order('created_at')

    if (error) {
      setError(error.message)
      setVerbForms([])
      return
    }

    const filteredByLanguage =
      (data || []).filter((f) => !f.language || f.language === language)

    setVerbForms(filteredByLanguage)
  }

  const subjects = useMemo(
    () => words.filter((w) => normalizeType(w.word_type) === 'pronoun'),
    [words]
  )

  const verbs = useMemo(
    () => words.filter((w) => normalizeType(w.word_type) === 'verb'),
    [words]
  )

  const objects = useMemo(
    () => words.filter((w) => normalizeType(w.word_type) === 'noun'),
    [words]
  )

  const selectedSubject = subjects.find((w) => w.id === subjectId) || null
  const selectedVerb = verbs.find((w) => w.id === verbId) || null
  const selectedObject = objects.find((w) => w.id === objectId) || null
  const selectedForm = verbForms.find((f) => f.id === formId) || null

  function buildSentence() {
    setError('')
    setMessage('')

    if (!selectedSubject || !selectedVerb) {
      setError('En az özne ve fiil seçmelisin.')
      return
    }

    const subjectText = getWordLabel(selectedSubject, language)
    const objectText = selectedObject ? getWordLabel(selectedObject, language) : ''

    let verbText = selectedForm
      ? selectedForm.form_text
      : getWordLabel(selectedVerb, language)

    if (sentenceType === 'negative') {
      if (language === 'turkish') verbText = `not-${verbText}`
      if (language === 'english') verbText = `not ${verbText}`
      if (language === 'syriac') verbText = `لا ${verbText}`
    }

    let sentence = ''

    if (language === 'english') {
      sentence = [subjectText, verbText, objectText].filter(Boolean).join(' ')
    } else {
      sentence = [subjectText, objectText, verbText].filter(Boolean).join(' ')
    }

    if (sentenceType === 'question') {
      sentence += '?'
    } else {
      sentence += '.'
    }

    setOutput(sentence.trim())
    setIsCorrect('')
    setCorrectedSentence('')
    setNotes('')
    setSuggestedRuleTitle('')
    setSuggestedRuleDescription('')
    setSuggestedExample('')
  }

  async function saveFeedback() {
    if (!output.trim()) {
      setError('Önce bir cümle oluştur.')
      return
    }

    setSavingFeedback(true)
    setError('')
    setMessage('')

    const subjectText = selectedSubject ? getWordLabel(selectedSubject, language) : ''
    const verbText = selectedForm
      ? selectedForm.form_text
      : selectedVerb
      ? getWordLabel(selectedVerb, language)
      : ''
    const objectText = selectedObject ? getWordLabel(selectedObject, language) : ''

    const { error: feedbackError } = await supabase.from('sentence_feedback').insert({
      language,
      tense,
      sentence_type: sentenceType,
      subject_text: subjectText,
      verb_text: verbText,
      object_text: objectText,
      generated_sentence: output,
      corrected_sentence: correctedSentence.trim(),
      is_correct: isCorrect === 'yes' ? true : isCorrect === 'no' ? false : null,
      notes: notes.trim(),
      suggested_rule_title: suggestedRuleTitle.trim(),
      suggested_rule_description: suggestedRuleDescription.trim(),
      suggested_example: suggestedExample.trim(),
    })

    if (feedbackError) {
      setSavingFeedback(false)
      setError(feedbackError.message)
      return
    }

    const shouldCreatePendingRule =
      !!suggestedRuleTitle.trim() ||
      !!suggestedRuleDescription.trim() ||
      !!suggestedExample.trim()

    if (shouldCreatePendingRule) {
      const { error: pendingError } = await supabase.from('pending_grammar').insert({
        rule_name: suggestedRuleTitle.trim() || 'Cümle geri bildirimi kuralı',
        description:
          suggestedRuleDescription.trim() ||
          notes.trim() ||
          'Sentence Builder geri bildirimi üzerinden oluşturuldu.',
        example: suggestedExample.trim() || correctedSentence.trim() || output,
        language,
        status: 'pending',
      })

      if (pendingError) {
        setSavingFeedback(false)
        setError(pendingError.message)
        return
      }
    }

    setSavingFeedback(false)
    setMessage('Geri bildirim kaydedildi. Yeni kural önerisi varsa pending listesine gönderildi.')
  }

  function resetBuilder() {
    setSubjectId('')
    setVerbId('')
    setObjectId('')
    setFormId('')
    setVerbForms([])
    setOutput('')
    setMessage('')
    setError('')
    setIsCorrect('')
    setCorrectedSentence('')
    setNotes('')
    setSuggestedRuleTitle('')
    setSuggestedRuleDescription('')
    setSuggestedExample('')
  }

  return (
    <main style={{ padding: '2rem 0 4rem' }}>
      <div className="container">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
            }}
          >
            Cümle Oluşturucu
          </h1>
          <p
            style={{
              color: 'var(--color-text-muted)',
              fontSize: '0.9rem',
              marginTop: '0.25rem',
            }}
          >
            Dil, zaman ve cümle türünü seç. Motor uygun yapıyı kursun. Gerekirse hatayı kaydet ve yeni kural öner.
          </p>
        </div>

        {message && (
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
            {message}
          </div>
        )}

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

        {loading ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            Yükleniyor...
          </div>
        ) : (
          <>
            <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem', display: 'grid', gap: '0.9rem' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '0.9rem',
                }}
              >
                <div>
                  <label style={LS}>Dil</label>
                  <select
                    className="input"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as Language)}
                  >
                    <option value="turkish">Türkçe</option>
                    <option value="english">İngilizce</option>
                    <option value="syriac">Süryanice</option>
                  </select>
                </div>

                <div>
                  <label style={LS}>Zaman</label>
                  <select
                    className="input"
                    value={tense}
                    onChange={(e) => setTense(e.target.value as Tense)}
                  >
                    <option value="present">Şimdiki Zaman</option>
                    <option value="past">Geçmiş Zaman</option>
                    <option value="future">Gelecek Zaman</option>
                    <option value="aorist">Geniş Zaman</option>
                  </select>
                </div>

                <div>
                  <label style={LS}>Cümle Türü</label>
                  <select
                    className="input"
                    value={sentenceType}
                    onChange={(e) => setSentenceType(e.target.value as SentenceType)}
                  >
                    <option value="positive">Olumlu</option>
                    <option value="negative">Olumsuz</option>
                    <option value="question">Soru</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '0.9rem',
                }}
              >
                <div>
                  <label style={LS}>Özne</label>
                  <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                    <option value="">Seç</option>
                    {subjects.map((w) => (
                      <option key={w.id} value={w.id}>
                        {getWordLabel(w, language)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={LS}>Fiil</label>
                  <select className="input" value={verbId} onChange={(e) => setVerbId(e.target.value)}>
                    <option value="">Seç</option>
                    {verbs.map((w) => (
                      <option key={w.id} value={w.id}>
                        {getWordLabel(w, language)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={LS}>Nesne</label>
                  <select className="input" value={objectId} onChange={(e) => setObjectId(e.target.value)}>
                    <option value="">Seç</option>
                    {objects.map((w) => (
                      <option key={w.id} value={w.id}>
                        {getWordLabel(w, language)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={LS}>Fiil Çekimi</label>
                <select
                  className="input"
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                  disabled={!selectedVerb}
                >
                  <option value="">Yok / Ana fiil</option>
                  {verbForms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.form_text}
                      {f.form_type ? ` (${f.form_type})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={buildSentence}>
                  Cümle Oluştur
                </button>
                <button className="btn btn-ghost" onClick={resetBuilder}>
                  Temizle
                </button>
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
              <div style={LS}>Oluşan Cümle</div>
              <div
                style={{
                  minHeight: 48,
                  fontSize: language === 'syriac' ? '1.25rem' : '1rem',
                  direction: language === 'syriac' ? 'rtl' : 'ltr',
                  fontFamily: language === 'syriac' ? 'serif' : 'inherit',
                  color: output ? 'var(--color-text)' : 'var(--color-text-muted)',
                }}
              >
                {output || 'Henüz cümle oluşturulmadı.'}
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', display: 'grid', gap: '0.9rem' }}>
              <h2 style={{ margin: 0, fontSize: '1rem' }}>Öğrenme ve Düzeltme Alanı</h2>

              <div>
                <label style={LS}>Bu cümle doğru mu?</label>
                <select
                  className="input"
                  value={isCorrect}
                  onChange={(e) => setIsCorrect(e.target.value as 'yes' | 'no' | '')}
                >
                  <option value="">Seç</option>
                  <option value="yes">Doğru</option>
                  <option value="no">Hatalı</option>
                </select>
              </div>

              <div>
                <label style={LS}>Düzeltilmiş Cümle</label>
                <textarea
                  className="input"
                  rows={3}
                  value={correctedSentence}
                  onChange={(e) => setCorrectedSentence(e.target.value)}
                  placeholder="Motorun ürettiği cümle hatalıysa doğru halini yaz."
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              <div>
                <label style={LS}>Not</label>
                <textarea
                  className="input"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Hatanın nedenini ya da gözlemini yaz."
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '0.9rem',
                }}
              >
                <div>
                  <label style={LS}>Yeni Kural Başlığı</label>
                  <input
                    className="input"
                    value={suggestedRuleTitle}
                    onChange={(e) => setSuggestedRuleTitle(e.target.value)}
                    placeholder="Örn: Türkçede olumsuz şimdiki zaman"
                  />
                </div>

                <div>
                  <label style={LS}>Örnek Cümle</label>
                  <input
                    className="input"
                    value={suggestedExample}
                    onChange={(e) => setSuggestedExample(e.target.value)}
                    placeholder="Örn: Ben kitap yazmıyorum."
                  />
                </div>
              </div>

              <div>
                <label style={LS}>Yeni Kural Açıklaması</label>
                <textarea
                  className="input"
                  rows={4}
                  value={suggestedRuleDescription}
                  onChange={(e) => setSuggestedRuleDescription(e.target.value)}
                  placeholder="Kuralı kısa ve net anlat."
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={saveFeedback} disabled={savingFeedback}>
                  {savingFeedback ? 'Kaydediliyor...' : 'Geri Bildirimi Kaydet'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

const LS: React.CSSProperties = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: 600,
  marginBottom: '0.35rem',
  color: 'var(--color-text)',
}