'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'

const SUBJECTS = [
  { syriac: 'ܐܢܐ', label: 'ܐܢܐ — Ben (1. tekil)', person: '1st', number: 'singular' },
  { syriac: 'ܐܢܬ', label: 'ܐܢܬ — Sen (2. tekil)', person: '2nd', number: 'singular' },
  { syriac: 'ܐܢܬܝ', label: 'ܐܢܬܝ — Sen/dişil (2. tekil)', person: '2nd', number: 'singular' },
  { syriac: 'ܗܘ', label: 'ܗܘ — O/eril (3. tekil)', person: '3rd', number: 'singular' },
  { syriac: 'ܗܝ', label: 'ܗܝ — O/dişil (3. tekil)', person: '3rd', number: 'singular' },
  { syriac: 'ܚܢܢ', label: 'ܚܢܢ — Biz (1. çoğul)', person: '1st', number: 'plural' },
  { syriac: 'ܐܢܬܘܢ', label: 'ܐܢܬܘܢ — Siz (2. çoğul)', person: '2nd', number: 'plural' },
  { syriac: 'ܗܢܘܢ', label: 'ܗܢܘܢ — Onlar/eril (3. çoğul)', person: '3rd', number: 'plural' },
]

const TENSES = [
  { value: 'past', label: 'Geçmiş Zaman (Perfect)' },
  { value: 'present', label: 'Geniş/Şimdiki (Imperfect)' },
  { value: 'active participle', label: 'Etken Ortaç' },
  { value: 'passive participle', label: 'Edilgen Ortaç' },
]

const GENDERS = [
  { value: 'masculine', label: 'Eril' },
  { value: 'feminine', label: 'Dişil' },
]

export default function SentenceBuilderAdvanced() {
  const locale = useLocale()

  const [words, setWords] = useState<any[]>([])
  const [subject, setSubject] = useState(SUBJECTS[0])
  const [verbId, setVerbId] = useState('')
  const [object, setObject] = useState('')
  const [tense, setTense] = useState('past')
  const [gender, setGender] = useState('masculine')
  const [result, setResult] = useState<any>(null)
  const [translations, setTranslations] = useState<{tr:string,en:string}|null>(null)
  const [translating, setTranslating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/words')
      .then(r => r.json())
      .then(d => setWords(d || []))
  }, [])

  const verbs = words.filter(w => w.word_type === 'verb')
  const nouns = words.filter(w => ['noun', 'isim'].includes(w.word_type))

  async function buildSentence() {
    if (!verbId) { setMessage('Fiil seçin'); return }
    setLoading(true); setResult(null); setMessage('')
    const verb = verbs.find(v => v.id === verbId)
    const res = await fetch('/api/sentences/build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: subject.syriac,
        word_text: verb?.syriac,
        object: object || undefined,
        tense,
        person: subject.person,
        number: subject.number,
        gender,
      }),
    })
    const data = await res.json()
    setResult(data)
    setLoading(false)

    // Otomatik TR + EN çeviri
    if (data.sentence) {
      setTranslating(true)
      setTranslations(null)
      try {
        const tr = await fetch('/api/claude', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `Translate this Classical Syriac sentence to Turkish and English.
Return ONLY valid JSON: {"tr":"...","en":"..."}
Syriac sentence: "${data.sentence}"`
          })
        })
        const trData = await tr.json()
        const raw = (trData.text || '').replace(/\`\`\`json|\`\`\`/g, '').trim()
        const parsed = JSON.parse(raw)
        setTranslations(parsed)
      } catch { /* ignore */ }
      finally { setTranslating(false) }
    }
  }

  async function saveSentence() {
    if (!result?.sentence) return
    setSaving(true)
    const verb = verbs.find(v => v.id === verbId)
    const obj = nouns.find(n => n.syriac === object)
    const res = await fetch('/api/sentences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sentence_syc: result.sentence,
        sentence_tr: translations?.tr || '',
        sentence_en: translations?.en || '',
        base_language: 'syc',
        source: 'sentence_builder',
        notes: `Özne: ${subject.syriac} | Fiil: ${verb?.turkish}(${verb?.syriac}) | Zaman: ${tense} | Kaynak: ${result.debug?.conjugation_source}`,
        needs_review: true,
      })
    })
    if (res.ok) setMessage('✅ Cümle kaydedildi!')
    else setMessage('❌ Kayıt başarısız')
    setSaving(false)
  }

  const labelStyle = {
    fontSize: '0.78rem', fontWeight: 700 as const, color: 'var(--color-primary)',
    display: 'block' as const, marginBottom: 6,
    textTransform: 'uppercase' as const, letterSpacing: '0.06em'
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #0F3D47 100%)', padding: '2rem 0' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Admin Alanı</p>
              <h1 style={{ color: 'white', fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700 }}>Cümle Motoru</h1>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem', marginTop: '0.3rem' }}>grammar_rules_v2 tabanlı gramer motoru</p>
            </div>
            <Link href={`/${locale}/admin`} className="btn btn-ghost btn-sm" style={{ color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.25)' }}>← Admin Panele Dön</Link>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '2rem 1.5rem 4rem' }}>
        {message && (
          <div style={{ marginBottom: '1rem', padding: '0.875rem 1rem', borderRadius: 'var(--radius-md)', background: message.startsWith('✅') ? '#EEF8F1' : '#FFF7F7', border: `1px solid ${message.startsWith('✅') ? '#B7DEC2' : '#E5C7C7'}`, color: message.startsWith('✅') ? '#216A3A' : 'var(--color-danger)', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
            {message}
            <button onClick={() => setMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* SOL KOLON - Form */}
          <div style={{ display: 'grid', gap: '1rem' }}>

            {/* Özne */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem', fontSize: '1rem' }}>1. Özne (Subject)</h3>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {SUBJECTS.map(s => (
                  <label key={s.syriac} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', background: subject.syriac === s.syriac ? 'var(--color-primary-light)' : 'var(--color-bg-subtle)', border: `1px solid ${subject.syriac === s.syriac ? 'var(--color-primary)' : 'var(--color-border)'}` }}>
                    <input type="radio" name="subject" checked={subject.syriac === s.syriac} onChange={() => setSubject(s)} />
                    <span style={{ direction: 'rtl', fontFamily: 'serif', fontSize: '1.1rem', color: 'var(--color-primary)', minWidth: 50 }}>{s.syriac}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{s.label.split('—')[1]}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Fiil */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem', fontSize: '1rem' }}>2. Fiil (Verb)</h3>
              <label style={labelStyle}>Fiil Seç</label>
              <select className="input" style={{ width: '100%', marginBottom: '1rem' }} value={verbId} onChange={e => setVerbId(e.target.value)}>
                <option value="">— Fiil seçin —</option>
                {verbs.map(v => (
                  <option key={v.id} value={v.id}>{v.syriac} — {v.turkish} ({v.english})</option>
                ))}
              </select>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>Zaman</label>
                  <select className="input" style={{ width: '100%' }} value={tense} onChange={e => setTense(e.target.value)}>
                    {TENSES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Cinsiyet</label>
                  <select className="input" style={{ width: '100%' }} value={gender} onChange={e => setGender(e.target.value)}>
                    {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Nesne */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem', fontSize: '1rem' }}>3. Nesne (Object) — Opsiyonel</h3>
              <label style={labelStyle}>İsim Seç</label>
              <select className="input" style={{ width: '100%' }} value={object} onChange={e => setObject(e.target.value)}>
                <option value="">— Nesne yok —</option>
                {nouns.map(n => (
                  <option key={n.id} value={n.syriac}>{n.syriac} — {n.turkish}</option>
                ))}
              </select>
            </div>

            <button className="btn btn-primary btn-lg" onClick={buildSentence} disabled={loading} style={{ width: '100%' }}>
              {loading ? '⏳ Oluşturuluyor...' : '⚡ Cümle Oluştur'}
            </button>
          </div>

          {/* SAĞ KOLON - Sonuç */}
          <div style={{ display: 'grid', gap: '1rem', alignContent: 'start' }}>
            {result ? (
              <>
                <div className="card" style={{ padding: '1.5rem', border: '2px solid var(--color-primary)' }}>
                  <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>Oluşturulan Cümle</h3>
                  <div style={{ direction: 'rtl', fontSize: '2.2rem', fontFamily: 'serif', color: 'var(--color-text)', fontWeight: 700, padding: '1rem', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', textAlign: 'center', marginBottom: '1rem' }}>
                    {result.sentence}
                  </div>

                  {/* Parçalar */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                    {[
                      { label: 'Özne', value: result.parts?.subject },
                      { label: 'Fiil', value: result.parts?.verb },
                      { label: 'Nesne', value: result.parts?.object || '—' },
                    ].map(p => (
                      <div key={p.label} style={{ background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{p.label}</div>
                        <div style={{ direction: 'rtl', fontFamily: 'serif', fontSize: '1.2rem', color: 'var(--color-primary)', fontWeight: 700 }}>{p.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Debug */}
                  {/* TR + EN Çeviri */}
                  {translating && (
                    <div style={{ padding: '0.75rem', background: 'var(--color-accent-light)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--color-accent)', marginBottom: '0.75rem' }}>
                      ⏳ Türkçe ve İngilizce çevriliyor...
                    </div>
                  )}
                  {translations && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <div style={{ padding: '0.75rem', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontWeight: 700 }}>Türkçe</div>
                        <div style={{ fontSize: '0.95rem', color: 'var(--color-text)', fontWeight: 600 }}>{translations.tr}</div>
                      </div>
                      <div style={{ padding: '0.75rem', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontWeight: 700 }}>İngilizce</div>
                        <div style={{ fontSize: '0.95rem', color: 'var(--color-text)', fontWeight: 600 }}>{translations.en}</div>
                      </div>
                    </div>
                  )}
                  <div style={{ padding: '0.75rem', background: 'var(--color-bg-muted)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    <strong>Kaynak:</strong> {result.debug?.conjugation_source}<br/>
                    <strong>Zaman:</strong> {result.debug?.meta?.tense} · <strong>Şahıs:</strong> {result.debug?.meta?.person} · <strong>Sayı:</strong> {result.debug?.meta?.number}
                  </div>
                </div>

                {translating && (
                  <div style={{ padding: '0.75rem', background: 'var(--color-accent-light)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--color-accent)', marginBottom: '0.75rem', textAlign: 'center' }}>
                    ⏳ Türkçe ve İngilizce çevriliyor...
                  </div>
                )}
                {translations && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ padding: '0.75rem', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4, fontWeight: 700 }}>Türkçe</div>
                      <div style={{ fontSize: '0.95rem', color: 'var(--color-text)', fontWeight: 600 }}>{translations.tr}</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4, fontWeight: 700 }}>İngilizce</div>
                      <div style={{ fontSize: '0.95rem', color: 'var(--color-text)', fontWeight: 600 }}>{translations.en}</div>
                    </div>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button className="btn btn-accent" onClick={saveSentence} disabled={saving} style={{ width: '100%' }}>
                  {saving ? '⏳ Kaydediliyor...' : '💾 Cümleyi Havuza Kaydet'}
                </button>
                <Link href={`/${locale}/admin/sentence-manage`} className="btn btn-secondary" style={{ width: '100%', textAlign: 'center' as const }}>
                  📋 Cümle Yönetimine Git
                </Link>
                </div>
              </>
            ) : (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
                <p>Özne, fiil ve zaman seçip <strong>Cümle Oluştur</strong>'a basın.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
