'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import Link from 'next/link'

type Step = 'basic' | 'languages' | 'properties' | 'rules' | 'examples' | 'metadata' | 'confirm'

interface LanguageFields {
  en: boolean
  tr: boolean
  syc: boolean
  de: boolean
  fr: boolean
}

interface RuleData {
  name: string
  description: string
  category: string
  
  // Multi-Language Rule Text
  rule_text_en: string
  rule_text_tr: string
  rule_text_syc: string
  rule_text_de: string
  rule_text_fr: string
  supported_languages: string[]
  
  // Grammar Properties
  tense: string
  mood: string
  aspect: string
  person: string
  number: string
  gender: string
  polarity: string
  voice: string
  word_order: string
  
  // Examples
  example_input: string
  example_output_en: string
  example_output_tr: string
  example_output_syc: string
  example_output_de: string
  example_output_fr: string
  example_explanation_en: string
  example_explanation_tr: string
  example_explanation_syc: string
  
  // Metadata
  difficulty_level: number
  is_extensible: boolean
  source: string
  is_active: boolean
}

const LANGUAGES = {
  en: 'English',
  tr: 'Türkçe',
  syc: 'Süryanice',
  de: 'Deutsch',
  fr: 'Français',
}

const CATEGORIES = [
  'VERB',
  'NOUN',
  'ADJECTIVE',
  'SENTENCE_STRUCTURE',
  'AGREEMENT',
  'WORD_FORMATION',
  'PHONETIC',
]

const TENSE_OPTIONS = ['Past', 'Present', 'Future', 'Perfect', 'Imperfect']
const MOOD_OPTIONS = ['Indicative', 'Subjunctive', 'Imperative', 'Conditional']
const ASPECT_OPTIONS = ['Perfective', 'Imperfective', 'Habitual']
const PERSON_OPTIONS = ['1st', '2nd', '3rd', 'Any']
const NUMBER_OPTIONS = ['Singular', 'Plural', 'Dual', 'Any']
const GENDER_OPTIONS = ['Masculine', 'Feminine', 'Neutral', 'Any']
const POLARITY_OPTIONS = ['Positive', 'Negative', 'Both']
const VOICE_OPTIONS = ['Active', 'Passive', 'Middle']
const WORD_ORDER_OPTIONS = ['SVO', 'SOV', 'VSO', 'OVS', 'OSV', 'VOS']

export default function RulesPage() {
  const locale = useLocale()
  const [step, setStep] = useState<Step>('basic')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  
  const [selectedLanguages, setSelectedLanguages] = useState<LanguageFields>({
    en: true,
    tr: true,
    syc: true,
    de: false,
    fr: false,
  })

  const [ruleData, setRuleData] = useState<RuleData>({
    name: '',
    description: '',
    category: 'VERB',
    rule_text_en: '',
    rule_text_tr: '',
    rule_text_syc: '',
    rule_text_de: '',
    rule_text_fr: '',
    supported_languages: ['en', 'tr', 'syc'],
    tense: '',
    mood: '',
    aspect: '',
    person: '',
    number: '',
    gender: '',
    polarity: '',
    voice: '',
    word_order: '',
    example_input: '',
    example_output_en: '',
    example_output_tr: '',
    example_output_syc: '',
    example_output_de: '',
    example_output_fr: '',
    example_explanation_en: '',
    example_explanation_tr: '',
    example_explanation_syc: '',
    difficulty_level: 1,
    is_extensible: true,
    source: 'manual',
    is_active: true,
  })

  const steps: Step[] = ['basic', 'languages', 'properties', 'rules', 'examples', 'metadata', 'confirm']
  const currentIndex = steps.indexOf(step)

  const nextStep = () => {
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1])
    }
  }

  const prevStep = () => {
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1])
    }
  }

  const handleLanguageChange = (lang: keyof LanguageFields) => {
    const newSelected = { ...selectedLanguages, [lang]: !selectedLanguages[lang] }
    setSelectedLanguages(newSelected)
    setRuleData({
      ...ruleData,
      supported_languages: Object.keys(newSelected).filter(k => newSelected[k as keyof LanguageFields]),
    })
  }

  async function saveRule() {
    setSaving(true)
    setMessage('')

    try {
      const payload = {
        name: ruleData.name,
        description: ruleData.description,
        category: ruleData.category,
        rule_text_en: ruleData.rule_text_en || null,
        rule_text_tr: ruleData.rule_text_tr || null,
        rule_text_syc: ruleData.rule_text_syc || null,
        rule_text_de: ruleData.rule_text_de || null,
        rule_text_fr: ruleData.rule_text_fr || null,
        supported_languages: ruleData.supported_languages,
        tense: ruleData.tense || null,
        mood: ruleData.mood || null,
        aspect: ruleData.aspect || null,
        person: ruleData.person || null,
        number: ruleData.number || null,
        gender: ruleData.gender || null,
        polarity: ruleData.polarity || null,
        voice: ruleData.voice || null,
        word_order: ruleData.word_order || null,
        example_input: ruleData.example_input || null,
        example_output_en: ruleData.example_output_en || null,
        example_output_tr: ruleData.example_output_tr || null,
        example_output_syc: ruleData.example_output_syc || null,
        example_output_de: ruleData.example_output_de || null,
        example_output_fr: ruleData.example_output_fr || null,
        example_explanation_en: ruleData.example_explanation_en || null,
        example_explanation_tr: ruleData.example_explanation_tr || null,
        example_explanation_syc: ruleData.example_explanation_syc || null,
        difficulty_level: ruleData.difficulty_level,
        is_extensible: ruleData.is_extensible,
        source: ruleData.source,
        is_active: ruleData.is_active,
      }

      const response = await fetch('/api/grammar-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save rule')
      }

      setMessage(`✅ Kural başarıyla kaydedildi: ${result.data?.name || ruleData.name}`)

      // Reset
      setRuleData({
        name: '',
        description: '',
        category: 'VERB',
        rule_text_en: '',
        rule_text_tr: '',
        rule_text_syc: '',
        rule_text_de: '',
        rule_text_fr: '',
        supported_languages: ['en', 'tr', 'syc'],
        tense: '',
        mood: '',
        aspect: '',
        person: '',
        number: '',
        gender: '',
        polarity: '',
        voice: '',
        word_order: '',
        example_input: '',
        example_output_en: '',
        example_output_tr: '',
        example_output_syc: '',
        example_output_de: '',
        example_output_fr: '',
        example_explanation_en: '',
        example_explanation_tr: '',
        example_explanation_syc: '',
        difficulty_level: 1,
        is_extensible: true,
        source: 'manual',
        is_active: true,
      })
      setStep('basic')
    } catch (err) {
      setMessage(`❌ Hata: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#4b5563',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    minHeight: '42px',
    border: '1.5px solid #e5e7eb',
    borderRadius: '8px',
    padding: '0.75rem 12px',
    fontSize: '0.95rem',
    fontFamily: 'inherit',
  }

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: '100px',
    resize: 'vertical',
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, #0F3D47 100%)',
          padding: '2.5rem 0',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}
      >
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', margin: 0 }}>
                📚 Sistem Kalbi
              </p>
              <h1 style={{ color: 'white', fontSize: '2.5rem', fontWeight: 800, margin: '0.5rem 0 0 0' }}>
                Grammar Rule Builder (Multi-Language)
              </h1>
            </div>
            <Link
              href={`/${locale}/admin`}
              style={{
                color: 'white',
                border: '1px solid rgba(255,255,255,0.4)',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                textDecoration: 'none',
              }}
            >
              ← Admin Panele Dön
            </Link>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="container" style={{ padding: '2rem 1.5rem 0' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
          {steps.map((s, idx) => (
            <button
              key={s}
              onClick={() => idx <= currentIndex && setStep(s)}
              style={{
                flex: '1 1 auto',
                minWidth: '80px',
                padding: '0.75rem 0.5rem',
                borderRadius: '8px',
                border: 'none',
                background: idx <= currentIndex ? '#3b82f6' : '#e5e7eb',
                color: idx <= currentIndex ? '#fff' : '#6b7280',
                cursor: idx <= currentIndex ? 'pointer' : 'default',
                fontWeight: idx === currentIndex ? 'bold' : '600',
                fontSize: '0.75rem',
              }}
            >
              {idx + 1}. {s === 'basic' && 'Temel'}
              {s === 'languages' && 'Diller'}
              {s === 'properties' && 'Özellikler'}
              {s === 'rules' && 'Kurallar'}
              {s === 'examples' && 'Örnekler'}
              {s === 'metadata' && 'Metadata'}
              {s === 'confirm' && 'Kaydet'}
            </button>
          ))}
        </div>

        {message && (
          <div
            style={{
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              background: message.includes('✅') ? '#dcfce7' : '#fee2e2',
              border: `1px solid ${message.includes('✅') ? '#86efac' : '#fca5a5'}`,
              color: message.includes('✅') ? '#166534' : '#991b1b',
              fontWeight: 500,
            }}
          >
            {message}
          </div>
        )}

        {/* STEP 1: BASIC */}
        {step === 'basic' && (
          <div className="card" style={{ background: '#fff', padding: '2rem', borderRadius: '12px' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Step 1: Temel Bilgiler</h2>

            <label style={labelStyle}>
              Kural Adı *
              <input
                type="text"
                value={ruleData.name}
                onChange={(e) => setRuleData({ ...ruleData, name: e.target.value })}
                placeholder="Örn: Past Tense Suffix"
                style={inputStyle}
              />
            </label>

            <label style={{ ...labelStyle, marginTop: '1.5rem' }}>
              Açıklama
              <textarea
                value={ruleData.description}
                onChange={(e) => setRuleData({ ...ruleData, description: e.target.value })}
                placeholder="Bu kuralın ne yaptığını detaylı olarak açıkla..."
                style={textareaStyle}
              />
            </label>

            <label style={{ ...labelStyle, marginTop: '1.5rem' }}>
              Kategori *
              <select
                value={ruleData.category}
                onChange={(e) => setRuleData({ ...ruleData, category: e.target.value })}
                style={inputStyle}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </label>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button
                onClick={nextStep}
                disabled={!ruleData.name}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: ruleData.name ? '#3b82f6' : '#d1d5db',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: ruleData.name ? 'pointer' : 'not-allowed',
                  fontWeight: 'bold',
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: LANGUAGES */}
        {step === 'languages' && (
          <div className="card" style={{ background: '#fff', padding: '2rem', borderRadius: '12px' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Step 2: Dil Seçimi</h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Kural için hangi dillerde giriş yapacaksın? (En az 1 dil seçmeli)
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {(Object.keys(LANGUAGES) as Array<keyof typeof LANGUAGES>).map(lang => (
                <label key={lang} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', border: '1.5px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', background: selectedLanguages[lang] ? '#f0f9ff' : '#fff' }}>
                  <input
                    type="checkbox"
                    checked={selectedLanguages[lang]}
                    onChange={() => handleLanguageChange(lang)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 500, color: '#374151' }}>{LANGUAGES[lang]}</span>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button
                onClick={prevStep}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                ← Back
              </button>
              <button
                onClick={nextStep}
                disabled={ruleData.supported_languages.length === 0}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: ruleData.supported_languages.length > 0 ? '#3b82f6' : '#d1d5db',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: ruleData.supported_languages.length > 0 ? 'pointer' : 'not-allowed',
                  fontWeight: 'bold',
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PROPERTIES */}
        {step === 'properties' && (
          <div className="card" style={{ background: '#fff', padding: '2rem', borderRadius: '12px' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Step 3: Gramer Özellikleri</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <label style={labelStyle}>
                Zaman (Tense)
                <select
                  value={ruleData.tense}
                  onChange={(e) => setRuleData({ ...ruleData, tense: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">Seçiniz</option>
                  {TENSE_OPTIONS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle}>
                Kip (Mood)
                <select
                  value={ruleData.mood}
                  onChange={(e) => setRuleData({ ...ruleData, mood: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">Seçiniz</option>
                  {MOOD_OPTIONS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle}>
                Görünüş (Aspect)
                <select
                  value={ruleData.aspect}
                  onChange={(e) => setRuleData({ ...ruleData, aspect: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">Seçiniz</option>
                  {ASPECT_OPTIONS.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle}>
                Kişi (Person)
                <select
                  value={ruleData.person}
                  onChange={(e) => setRuleData({ ...ruleData, person: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">Seçiniz</option>
                  {PERSON_OPTIONS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle}>
                Sayı (Number)
                <select
                  value={ruleData.number}
                  onChange={(e) => setRuleData({ ...ruleData, number: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">Seçiniz</option>
                  {NUMBER_OPTIONS.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle}>
                Cinsiyet (Gender)
                <select
                  value={ruleData.gender}
                  onChange={(e) => setRuleData({ ...ruleData, gender: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">Seçiniz</option>
                  {GENDER_OPTIONS.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle}>
                Polarite (Polarity)
                <select
                  value={ruleData.polarity}
                  onChange={(e) => setRuleData({ ...ruleData, polarity: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">Seçiniz</option>
                  {POLARITY_OPTIONS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle}>
                Ses (Voice)
                <select
                  value={ruleData.voice}
                  onChange={(e) => setRuleData({ ...ruleData, voice: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">Seçiniz</option>
                  {VOICE_OPTIONS.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle}>
                Sözcük Sırası (Word Order)
                <select
                  value={ruleData.word_order}
                  onChange={(e) => setRuleData({ ...ruleData, word_order: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">Seçiniz</option>
                  {WORD_ORDER_OPTIONS.map(wo => (
                    <option key={wo} value={wo}>{wo}</option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button
                onClick={prevStep}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                ← Back
              </button>
              <button
                onClick={nextStep}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: RULES (Multi-Language) */}
        {step === 'rules' && (
          <div className="card" style={{ background: '#fff', padding: '2rem', borderRadius: '12px' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Step 4: Kural Metni (Seçili Diller)</h2>

            {selectedLanguages.en && (
              <label style={{ ...labelStyle, marginBottom: '1rem' }}>
                🇬🇧 English Rule
                <textarea
                  value={ruleData.rule_text_en}
                  onChange={(e) => setRuleData({ ...ruleData, rule_text_en: e.target.value })}
                  placeholder="İngilizce kural açıklaması..."
                  style={textareaStyle}
                />
              </label>
            )}

            {selectedLanguages.tr && (
              <label style={{ ...labelStyle, marginBottom: '1rem' }}>
                🇹🇷 Türkçe Kural
                <textarea
                  value={ruleData.rule_text_tr}
                  onChange={(e) => setRuleData({ ...ruleData, rule_text_tr: e.target.value })}
                  placeholder="Türkçe kural açıklaması..."
                  style={textareaStyle}
                />
              </label>
            )}

            {selectedLanguages.syc && (
              <label style={{ ...labelStyle, marginBottom: '1rem' }}>
                🆎 Süryanice Kural
                <textarea
                  value={ruleData.rule_text_syc}
                  onChange={(e) => setRuleData({ ...ruleData, rule_text_syc: e.target.value })}
                  placeholder="Süryanice kural açıklaması..."
                  style={{...textareaStyle, direction: 'rtl', textAlign: 'right'}}
                />
              </label>
            )}

            {selectedLanguages.de && (
              <label style={{ ...labelStyle, marginBottom: '1rem' }}>
                🇩🇪 Deutsch Regel
                <textarea
                  value={ruleData.rule_text_de}
                  onChange={(e) => setRuleData({ ...ruleData, rule_text_de: e.target.value })}
                  placeholder="Deutsche Regeldarstellung..."
                  style={textareaStyle}
                />
              </label>
            )}

            {selectedLanguages.fr && (
              <label style={{ ...labelStyle, marginBottom: '1rem' }}>
                🇫🇷 Règle Française
                <textarea
                  value={ruleData.rule_text_fr}
                  onChange={(e) => setRuleData({ ...ruleData, rule_text_fr: e.target.value })}
                  placeholder="Description de la règle en français..."
                  style={textareaStyle}
                />
              </label>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button
                onClick={prevStep}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                ← Back
              </button>
              <button
                onClick={nextStep}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: EXAMPLES */}
        {step === 'examples' && (
          <div className="card" style={{ background: '#fff', padding: '2rem', borderRadius: '12px' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Step 5: Örnekler</h2>

            <label style={labelStyle}>
              Example Input (Base/Root) *
              <input
                type="text"
                value={ruleData.example_input}
                onChange={(e) => setRuleData({ ...ruleData, example_input: e.target.value })}
                placeholder="e.g., كتب (root)"
                style={inputStyle}
              />
            </label>

            {selectedLanguages.en && (
              <div style={{ marginTop: '1.5rem' }}>
                <label style={labelStyle}>
                  🇬🇧 English Output
                  <input
                    type="text"
                    value={ruleData.example_output_en}
                    onChange={(e) => setRuleData({ ...ruleData, example_output_en: e.target.value })}
                    placeholder="he wrote"
                    style={inputStyle}
                  />
                </label>
                <label style={{ ...labelStyle, marginTop: '1rem' }}>
                  English Explanation
                  <textarea
                    value={ruleData.example_explanation_en}
                    onChange={(e) => setRuleData({ ...ruleData, example_explanation_en: e.target.value })}
                    placeholder="Açıklama..."
                    style={{ ...textareaStyle, minHeight: '60px' }}
                  />
                </label>
              </div>
            )}

            {selectedLanguages.tr && (
              <div style={{ marginTop: '1.5rem' }}>
                <label style={labelStyle}>
                  🇹🇷 Türkçe Output
                  <input
                    type="text"
                    value={ruleData.example_output_tr}
                    onChange={(e) => setRuleData({ ...ruleData, example_output_tr: e.target.value })}
                    placeholder="yazdı"
                    style={inputStyle}
                  />
                </label>
                <label style={{ ...labelStyle, marginTop: '1rem' }}>
                  Türkçe Açıklama
                  <textarea
                    value={ruleData.example_explanation_tr}
                    onChange={(e) => setRuleData({ ...ruleData, example_explanation_tr: e.target.value })}
                    placeholder="Açıklama..."
                    style={{ ...textareaStyle, minHeight: '60px' }}
                  />
                </label>
              </div>
            )}

            {selectedLanguages.syc && (
              <div style={{ marginTop: '1.5rem' }}>
                <label style={labelStyle}>
                  🆎 Süryanice Output
                  <input
                    type="text"
                    value={ruleData.example_output_syc}
                    onChange={(e) => setRuleData({ ...ruleData, example_output_syc: e.target.value })}
                    placeholder="ܟܬܒܘ"
                    style={{...inputStyle, direction: 'rtl', textAlign: 'right'}}
                  />
                </label>
                <label style={{ ...labelStyle, marginTop: '1rem' }}>
                  Süryanice Açıklama
                  <textarea
                    value={ruleData.example_explanation_syc}
                    onChange={(e) => setRuleData({ ...ruleData, example_explanation_syc: e.target.value })}
                    placeholder="Açıklama..."
                    style={{ ...textareaStyle, minHeight: '60px', direction: 'rtl', textAlign: 'right' }}
                  />
                </label>
              </div>
            )}

            {selectedLanguages.de && (
              <div style={{ marginTop: '1.5rem' }}>
                <label style={labelStyle}>
                  🇩🇪 Deutsch Output
                  <input
                    type="text"
                    value={ruleData.example_output_de}
                    onChange={(e) => setRuleData({ ...ruleData, example_output_de: e.target.value })}
                    placeholder="er schrieb"
                    style={inputStyle}
                  />
                </label>
              </div>
            )}

            {selectedLanguages.fr && (
              <div style={{ marginTop: '1.5rem' }}>
                <label style={labelStyle}>
                  🇫🇷 Français Output
                  <input
                    type="text"
                    value={ruleData.example_output_fr}
                    onChange={(e) => setRuleData({ ...ruleData, example_output_fr: e.target.value })}
                    placeholder="il a écrit"
                    style={inputStyle}
                  />
                </label>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button
                onClick={prevStep}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                ← Back
              </button>
              <button
                onClick={nextStep}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: METADATA */}
        {step === 'metadata' && (
          <div className="card" style={{ background: '#fff', padding: '2rem', borderRadius: '12px' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Step 6: Metadata & Ayarlar</h2>

            <label style={labelStyle}>
              Zorluk Seviyesi (1-5)
              <input
                type="number"
                min="1"
                max="5"
                value={ruleData.difficulty_level}
                onChange={(e) => setRuleData({ ...ruleData, difficulty_level: parseInt(e.target.value) })}
                style={inputStyle}
              />
            </label>

            <label style={{ ...labelStyle, marginTop: '1.5rem' }}>
              Kaynak
              <select
                value={ruleData.source}
                onChange={(e) => setRuleData({ ...ruleData, source: e.target.value })}
                style={inputStyle}
              >
                <option value="manual">Manual (El ile yazıldı)</option>
                <option value="imported">Imported (Kitaptan alındı)</option>
                <option value="ai_generated">AI Generated (AI tarafından oluşturuldu)</option>
              </select>
            </label>

            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="checkbox"
                  checked={ruleData.is_extensible}
                  onChange={(e) => setRuleData({ ...ruleData, is_extensible: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontSize: '0.95rem', color: '#374151', fontWeight: 500 }}>
                  İleride genişletilebilir (is_extensible)
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="checkbox"
                  checked={ruleData.is_active}
                  onChange={(e) => setRuleData({ ...ruleData, is_active: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontSize: '0.95rem', color: '#374151', fontWeight: 500 }}>
                  Hemen aktif et (is_active)
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button
                onClick={prevStep}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                ← Back
              </button>
              <button
                onClick={nextStep}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* STEP 7: CONFIRM */}
        {step === 'confirm' && (
          <div className="card" style={{ background: '#fff', padding: '2rem', borderRadius: '12px' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Step 7: Kontrol & Kaydet</h2>

            <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.75rem 0' }}>📋 Kural Özeti</h3>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
                <li><strong>Adı:</strong> {ruleData.name || '(boş)'}</li>
                <li><strong>Kategori:</strong> {ruleData.category}</li>
                <li><strong>Diller:</strong> {ruleData.supported_languages.map(l => LANGUAGES[l as keyof typeof LANGUAGES]).join(', ')}</li>
                <li><strong>Zaman:</strong> {ruleData.tense || '(seçilmedi)'}</li>
                <li><strong>Kip:</strong> {ruleData.mood || '(seçilmedi)'}</li>
                <li><strong>Zorluk:</strong> {ruleData.difficulty_level}/5</li>
                <li><strong>Kaynak:</strong> {ruleData.source}</li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button
                onClick={prevStep}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                ← Back
              </button>
              <button
                onClick={saveRule}
                disabled={saving || !ruleData.name}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: saving || !ruleData.name ? '#d1d5db' : '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: saving || !ruleData.name ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                }}
              >
                {saving ? '⏳ Kaydediliyor...' : '✅ SAVE RULE'}
              </button>
            </div>
          </div>
        )}

        <div style={{ height: '4rem' }} />
      </div>
    </main>
  )
}