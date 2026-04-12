'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import NavBar from '../NavBar'
import { createClient } from '@/lib/supabase'

type Category = {
  id: string
  name: string
}

type SentenceMode = 'multiple_choice' | 'fill_blank'
type SentenceLang = 'tr' | 'sy' | 'en'

const QUESTION_COUNT_OPTIONS = [10, 20, 30, 50]

export default function LearnSentencesPage() {
  const locale = useLocale()
  const supabase = createClient()

  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  const [mode, setMode] = useState<SentenceMode>('multiple_choice')
  const [questionLang, setQuestionLang] = useState<SentenceLang>('sy')
  const [answerLang, setAnswerLang] = useState<SentenceLang>('tr')
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [questionCount, setQuestionCount] = useState<number>(10)
  const [examMode, setExamMode] = useState(false)

  useEffect(() => {
    loadCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadCategories() {
    setLoadingCategories(true)

    const { data } = await supabase
      .from('categories')
      .select('id, name')
      .eq('type', 'sentence')
      .order('name', { ascending: true })

    setCategories(data || [])
    setLoadingCategories(false)
  }

  function toggleCategory(categoryId: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const startHref = useMemo(() => {
    const params = new URLSearchParams()
    params.set('mode', mode)
    params.set('q', questionLang)
    params.set('a', answerLang)
    params.set('exam', examMode ? '1' : '0')
    params.set('count', String(questionCount))

    if (selectedCategoryIds.length > 0) {
      params.set('categories', selectedCategoryIds.join(','))
    }

    return `/${locale}/learn-sentences/session?${params.toString()}`
  }, [locale, mode, questionLang, answerLang, examMode, questionCount, selectedCategoryIds])

  const selectedCategoryLabels = selectedCategoryIds
    .map((id) => categories.find((c) => c.id === id)?.name)
    .filter(Boolean) as string[]

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
              Öğrenme Sınıfı
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
              Cümle öğrenme motoru
            </h1>

            <p
              style={{
                color: 'rgba(255,255,255,0.86)',
                fontSize: '0.98rem',
                lineHeight: 1.7,
                maxWidth: 780,
              }}
            >
              Doğrulanmış cümle havuzundan çalışma oturumu oluştur. Cümleyi bir dilde gör,
              diğer dilde tanı veya boşluk doldurarak öğren.
            </p>
          </div>
        </section>

        <div className="container" style={{ padding: '2rem 1.5rem 3rem' }}>
          <div
            className="card"
            style={{
              padding: 0,
              overflow: 'hidden',
              marginBottom: '1.25rem',
            }}
          >
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
                Cümle Oturumu Ayarları
              </div>
            </div>

            <div style={{ padding: '1.2rem' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                  gap: '0.9rem',
                  marginBottom: '1rem',
                }}
              >
                <Field label="Mod">
                  <select
                    className="input"
                    value={mode}
                    onChange={(e) => setMode(e.target.value as SentenceMode)}
                  >
                    <option value="multiple_choice">Çoktan Seçmeli</option>
                    <option value="fill_blank">Boşluk Doldurma</option>
                  </select>
                </Field>

                <Field label="Soru Dili">
                  <select
                    className="input"
                    value={questionLang}
                    onChange={(e) => setQuestionLang(e.target.value as SentenceLang)}
                  >
                    <option value="sy">Süryanice</option>
                    <option value="tr">Türkçe</option>
                    <option value="en">İngilizce</option>
                  </select>
                </Field>

                <Field label="Cevap Dili">
                  <select
                    className="input"
                    value={answerLang}
                    onChange={(e) => setAnswerLang(e.target.value as SentenceLang)}
                  >
                    <option value="tr">Türkçe</option>
                    <option value="sy">Süryanice</option>
                    <option value="en">İngilizce</option>
                  </select>
                </Field>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text)',
                    fontWeight: 700,
                    marginBottom: '0.5rem',
                  }}
                >
                  Kategoriler
                </label>

                {loadingCategories ? (
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    Kategoriler yükleniyor...
                  </div>
                ) : categories.length === 0 ? (
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    Kategori bulunamadı.
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem' }}>
                      {categories.map((category) => {
                        const isSelected = selectedCategoryIds.includes(category.id)

                        return (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => toggleCategory(category.id)}
                            className="btn btn-sm"
                            style={{
                              border: '1px solid var(--color-border)',
                              background: isSelected ? 'var(--color-primary)' : 'white',
                              color: isSelected ? 'white' : 'var(--color-text)',
                              fontWeight: 600,
                            }}
                          >
                            {category.name}
                          </button>
                        )
                      })}
                    </div>

                    <div
                      style={{
                        marginTop: '0.55rem',
                        fontSize: '0.82rem',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      Seçim yapılmazsa tüm cümle kategorileri gelir.
                    </div>
                  </>
                )}
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text)',
                    fontWeight: 700,
                    marginBottom: '0.5rem',
                  }}
                >
                  Soru Sayısı
                </label>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem' }}>
                  {QUESTION_COUNT_OPTIONS.map((count) => {
                    const isSelected = questionCount === count

                    return (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setQuestionCount(count)}
                        className="btn btn-sm"
                        style={{
                          minWidth: 56,
                          border: '1px solid var(--color-border)',
                          background: isSelected ? '#8E6810' : 'white',
                          color: isSelected ? 'white' : 'var(--color-text)',
                          fontWeight: 700,
                        }}
                      >
                        {count}
                      </button>
                    )
                  })}
                </div>
              </div>

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
                  onClick={() => setExamMode((v) => !v)}
                  className="btn"
                  style={{
                    border: '1px solid #A67C18',
                    background: examMode ? '#8E6810' : 'transparent',
                    color: examMode ? 'white' : '#8E6810',
                    fontWeight: 700,
                  }}
                >
                  🎯 Sınav Modu: {examMode ? 'Açık' : 'Kapalı'}
                </button>

                <Link href={startHref} className="btn btn-secondary">
                  ▶ Başla
                </Link>
              </div>
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '1.25rem',
              marginBottom: '1.25rem',
              background: 'linear-gradient(135deg, var(--color-primary-light), white)',
              borderColor: 'rgba(26, 95, 110, 0.15)',
            }}
          >
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--color-text)',
                marginBottom: '0.45rem',
              }}
            >
              Geçerli oturum özeti
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
              }}
            >
              <InfoBox label="Mod" value={mode === 'multiple_choice' ? 'Çoktan Seçmeli' : 'Boşluk Doldurma'} />
              <InfoBox label="Soru dili" value={langLabel(questionLang)} />
              <InfoBox label="Cevap dili" value={langLabel(answerLang)} />
              <InfoBox
                label="Kategoriler"
                value={selectedCategoryLabels.length > 0 ? `${selectedCategoryLabels.length} seçildi` : 'Tümü'}
              />
              <InfoBox label="Soru sayısı" value={String(questionCount)} />
              <InfoBox label="Sınav modu" value={examMode ? 'Açık' : 'Kapalı'} />
            </div>

            {selectedCategoryLabels.length > 0 && (
              <div
                style={{
                  marginTop: '0.65rem',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.45rem',
                }}
              >
                {selectedCategoryLabels.map((label) => (
                  <span key={label} className="badge badge-primary">
                    {label}
                  </span>
                ))}
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
        padding: '0.8rem 0.9rem',
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
        }}
      >
        {value}
      </div>
    </div>
  )
}

function langLabel(value: SentenceLang) {
  if (value === 'tr') return 'Türkçe'
  if (value === 'sy') return 'Süryanice'
  return 'İngilizce'
}