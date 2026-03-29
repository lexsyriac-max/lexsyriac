'use client'

import { useEffect, useMemo, useState } from 'react'
import NavBar from '../NavBar'
import { createClient } from '../../lib/supabase'

type Language = 'all' | 'turkish' | 'english' | 'syriac' | 'german' | 'french'

type GrammarRule = {
  id: string
  language: string | null
  category: string | null
  tense: string | null
  person: string | null
  rule_title: string | null
  rule_description: string | null
  structure_pattern: string | null
  example_tr: string | null
  example_sy: string | null
  example_en: string | null
  example_de: string | null
  example_fr: string | null
  notes: string | null
  is_approved: boolean | null
  order_index: number | null
}

const LANGUAGE_OPTIONS = [
  { value: 'all', label: 'Tüm diller' },
  { value: 'turkish', label: 'Türkçe' },
  { value: 'english', label: 'İngilizce' },
  { value: 'syriac', label: 'Süryanice' },
  { value: 'german', label: 'Almanca' },
  { value: 'french', label: 'Fransızca' },
]

const CATEGORY_OPTIONS = [
  { value: '', label: 'Tüm kategoriler' },
  { value: 'noun', label: 'İsim' },
  { value: 'verb', label: 'Fiil' },
  { value: 'pronoun', label: 'Zamir' },
  { value: 'sentence', label: 'Cümle Yapısı' },
  { value: 'number', label: 'Sayılar' },
  { value: 'adjective', label: 'Sıfat' },
  { value: 'conjunction', label: 'Bağlaç' },
  { value: 'other', label: 'Diğer' },
]

function getLanguageLabel(lang: string | null) {
  switch (lang) {
    case 'turkish':
      return 'Türkçe'
    case 'english':
      return 'İngilizce'
    case 'syriac':
      return 'Süryanice'
    case 'german':
      return 'Almanca'
    case 'french':
      return 'Fransızca'
    default:
      return 'Belirsiz'
  }
}

export default function RulesPage() {
  const supabase = createClient()

  const [rules, setRules] = useState<GrammarRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [language, setLanguage] = useState<Language>('all')
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    loadRules()
  }, [])

  async function loadRules() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('grammar_rules')
      .select('*')
      .eq('is_approved', true)
      .order('language', { ascending: true })
      .order('order_index', { ascending: true })

    if (error) {
      setError(error.message)
      setRules([])
      setLoading(false)
      return
    }

    setRules(data || [])
    setLoading(false)
  }

  const filteredRules = useMemo(() => {
    const q = query.trim().toLowerCase()

    return rules.filter((rule) => {
      const matchesLanguage = language === 'all' ? true : (rule.language || '') === language
      const matchesCategory = category ? (rule.category || '') === category : true

      const title = (rule.rule_title || '').toLowerCase()
      const description = (rule.rule_description || '').toLowerCase()
      const notes = (rule.notes || '').toLowerCase()
      const structure = (rule.structure_pattern || '').toLowerCase()

      const matchesQuery =
        !q ||
        title.includes(q) ||
        description.includes(q) ||
        notes.includes(q) ||
        structure.includes(q)

      return matchesLanguage && matchesCategory && matchesQuery
    })
  }, [rules, language, category, query])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <NavBar />

      <main>
        <div
          style={{
            background: 'linear-gradient(135deg, var(--color-primary) 0%, #0F3D47 100%)',
            padding: '2.75rem 0',
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
              Kurallar
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
              Dil kurallarını incele
            </h1>

            <p
              style={{
                color: 'rgba(255,255,255,0.86)',
                fontSize: '0.98rem',
                lineHeight: 1.7,
                maxWidth: 760,
              }}
            >
              Dile ve kategoriye göre filtreleyerek gramer kurallarını, açıklamalarını
              ve örneklerini görüntüleyebilirsin.
            </p>
          </div>
        </div>

        <div className="container" style={{ padding: '2rem 1.5rem 3rem' }}>
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
            <div
              className="mobile-stack"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.5fr) minmax(180px, 1fr) minmax(180px, 1fr)',
                gap: '0.85rem',
                alignItems: 'end',
              }}
            >
              <div>
                <label style={LS}>Arama</label>
                <input
                  className="input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Kural ara..."
                />
              </div>

              <div>
                <label style={LS}>Dil</label>
                <select
                  className="input"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={LS}>Kategori</label>
                <select
                  className="input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              className="btn-group-mobile"
              style={{
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap',
                marginTop: '1rem',
              }}
            >
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setQuery('')
                  setLanguage('all')
                  setCategory('')
                }}
              >
                Filtreleri Temizle
              </button>

              <div
                style={{
                  fontSize: '0.88rem',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {filteredRules.length} kural
              </div>
            </div>
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

          {loading ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              Yükleniyor...
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '1rem',
                  color: 'var(--color-text)',
                  marginBottom: '0.35rem',
                  fontWeight: 600,
                }}
              >
                Kural bulunamadı
              </div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.92rem' }}>
                Arama veya filtreleri değiştir.
              </div>
            </div>
          ) : (
            <div
              className="responsive-grid-2"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1rem',
              }}
            >
              {filteredRules.map((rule) => (
                <div key={rule.id} className="card" style={{ padding: '1.25rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      marginBottom: '0.85rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '1rem',
                          fontWeight: 700,
                          color: 'var(--color-text)',
                          marginBottom: '0.25rem',
                        }}
                      >
                        {rule.rule_title || 'Başlıksız kural'}
                      </div>

                      <div
                        style={{
                          fontSize: '0.82rem',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        {getLanguageLabel(rule.language)} · {rule.category || 'diğer'}
                      </div>
                    </div>

                    {rule.tense && <span className="badge">{rule.tense}</span>}
                  </div>

                  <div
                    style={{
                      fontSize: '0.92rem',
                      color: 'var(--color-text)',
                      lineHeight: 1.65,
                      marginBottom: '0.85rem',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {rule.rule_description || 'Açıklama yok.'}
                  </div>

                  {rule.structure_pattern && (
                    <div style={{ marginBottom: '0.85rem' }}>
                      <div style={LabelMini}>Yapı</div>
                      <div style={BoxMini}>{rule.structure_pattern}</div>
                    </div>
                  )}

                  {(rule.example_tr || rule.example_sy || rule.example_en) && (
                    <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '0.85rem' }}>
                      {rule.example_tr && (
                        <div>
                          <div style={LabelMini}>TR Örnek</div>
                          <div style={BoxMini}>{rule.example_tr}</div>
                        </div>
                      )}

                      {rule.example_sy && (
                        <div>
                          <div style={LabelMini}>SY Örnek</div>
                          <div style={{ ...BoxMini, direction: 'rtl', fontFamily: 'serif' }}>
                            {rule.example_sy}
                          </div>
                        </div>
                      )}

                      {rule.example_en && (
                        <div>
                          <div style={LabelMini}>EN Örnek</div>
                          <div style={BoxMini}>{rule.example_en}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {rule.notes && (
                    <div>
                      <div style={LabelMini}>Not</div>
                      <div style={BoxMini}>{rule.notes}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

const LS: React.CSSProperties = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: 600,
  marginBottom: '0.35rem',
  color: 'var(--color-text)',
}

const LabelMini: React.CSSProperties = {
  fontSize: '0.78rem',
  color: 'var(--color-text-muted)',
  marginBottom: '0.2rem',
}

const BoxMini: React.CSSProperties = {
  fontSize: '0.9rem',
  color: 'var(--color-text)',
  background: 'var(--color-bg-subtle)',
  border: '1px solid var(--color-border)',
  borderRadius: 10,
  padding: '0.7rem 0.85rem',
}