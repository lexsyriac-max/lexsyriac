'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase'

type Tab = 'conjugation' | 'rules' | 'add'

type ConjForm = {
  tense: string
  person: string
  number: string
  gender: string
  kaylo: string
  syriac: string
  western: string
  source: 'sedra' | 'claude' | 'manual'
  selected: boolean
}

type Rule = {
  id: number
  name: string
  category: string
  tense: string | null
  person: string | null
  number: string | null
  gender: string | null
  example_input: string | null
  example_output_syc: string | null
  rule_text_en: string | null
  rule_text_tr: string | null
  is_active: boolean
  source: string
  created_at: string
}

const TENSES = ['perfect', 'imperfect', 'active participle', 'passive participle', 'infinitive']
const PERSONS = ['first', 'second', 'third']
const NUMBERS = ['singular', 'plural']
const GENDERS = ['masculine', 'feminine', 'common']
const KAYLOS = ["p'al", "pa'el", "aph'el", "ethpe'el", "ethpa'al", "ettaph'al"]

export default function GrammarEnginePage() {
  const locale = useLocale()
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('conjugation')

  // ─── CONJUGATION STATE ───────────────────────────────────────
  const [verb, setVerb] = useState('')
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [forms, setForms] = useState<ConjForm[]>([])
  const [conjMsg, setConjMsg] = useState('')
  const [conjErr, setConjErr] = useState('')

  // ─── RULES STATE ─────────────────────────────────────────────
  const [rules, setRules] = useState<Rule[]>([])
  const [rulesLoading, setRulesLoading] = useState(false)
  const [filterCat, setFilterCat] = useState('all')
  const [filterActive, setFilterActive] = useState('all')
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [rulesMsg, setRulesMsg] = useState('')

  // ─── ADD STATE ───────────────────────────────────────────────
  const [addForm, setAddForm] = useState({
    name: '', category: 'VERB', tense: '', person: '', number: '',
    gender: '', example_input: '', example_output_syc: '',
    rule_text_en: '', rule_text_tr: '', source: 'manual'
  })
  const [addMsg, setAddMsg] = useState('')

  // ─── LOAD RULES ──────────────────────────────────────────────
  const loadRules = useCallback(async () => {
    setRulesLoading(true)
    let q = supabase.from('grammar_rules_v2').select('*').order('created_at', { ascending: false })
    if (filterCat !== 'all') q = q.eq('category', filterCat)
    if (filterActive === 'active') q = q.eq('is_active', true)
    if (filterActive === 'inactive') q = q.eq('is_active', false)
    const { data } = await q
    setRules((data || []) as Rule[])
    setRulesLoading(false)
  }, [supabase, filterCat, filterActive])

  useEffect(() => { if (tab === 'rules') loadRules() }, [tab, loadRules])

  // ─── FETCH FROM SEDRA ────────────────────────────────────────
  async function fetchFromSedra() {
    if (!verb.trim()) { setConjErr('Fiil girin'); return }
    setFetching(true); setConjErr(''); setConjMsg(''); setForms([])

    try {
      const res = await fetch(`/api/sedra?syriac=${encodeURIComponent(verb.trim())}`)
      const sedraData = await res.json()

      // Sedra'dan word endpoint'e git
      const wordRes = await fetch(`https://sedra.bethmardutho.org/api/word/${encodeURIComponent(verb.trim())}.json`)
      const wordData = wordRes.ok ? await wordRes.json() : []

      const sedraForms: ConjForm[] = (wordData || [])
        .filter((w: any) => w.tense || w.category === 'verb')
        .map((w: any) => ({
          tense: w.tense || '?',
          person: w.person || '?',
          number: w.number || '?',
          gender: w.gender || '?',
          kaylo: w.kaylo || "p'al",
          syriac: w.syriac || verb,
          western: w.western || '',
          source: 'sedra' as const,
          selected: true,
        }))

      // Sedra'dan gelen formları al, eksik kombinasyonları tespit et
      const existingKeys = new Set(sedraForms.map(f => `${f.tense}-${f.person}-${f.number}-${f.gender}`))

      // Temel eksik formları Claude ile tamamla
      const missing: ConjForm[] = []
      for (const tense of ['perfect', 'imperfect']) {
        for (const person of PERSONS) {
          for (const number of NUMBERS) {
            for (const gender of ['masculine', 'feminine']) {
              const key = `${tense}-${person}-${number}-${gender}`
              if (!existingKeys.has(key)) {
                missing.push({ tense, person, number, gender, kaylo: "p'al", syriac: '', western: '', source: 'claude', selected: false })
              }
            }
          }
        }
      }

      // Claude ile eksik formları üret
      if (missing.length > 0 && missing.length < 30) {
        setConjMsg(`Sedra'dan ${sedraForms.length} form alındı. ${missing.length} eksik form Claude ile üretiliyor...`)
        const claudeRes = await fetch('/api/claude', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `You are a Classical Syriac morphology engine.
Given the verb "${verb.trim()}", generate conjugated forms for these missing combinations.
Return ONLY valid JSON array, no explanation:
[{"tense":"...","person":"...","number":"...","gender":"...","syriac":"(Syriac script)","western":"(with vowels)"}]

Missing combinations:
${missing.slice(0, 20).map(m => `${m.tense} ${m.person} ${m.number} ${m.gender}`).join('\n')}`
          })
        })
        const claudeData = await claudeRes.json()
        const raw = (claudeData.text || '').replace(/\`\`\`json|\`\`\`/g, '').trim()
        try {
          const claudeForms = JSON.parse(raw)
          claudeForms.forEach((cf: any) => {
            const idx = missing.findIndex(m =>
              m.tense === cf.tense && m.person === cf.person &&
              m.number === cf.number && m.gender === cf.gender
            )
            if (idx >= 0) {
              missing[idx].syriac = cf.syriac || ''
              missing[idx].western = cf.western || ''
              missing[idx].selected = !!cf.syriac
            }
          })
        } catch { /* ignore parse error */ }
      }

      const allForms = [...sedraForms, ...missing.filter(m => m.syriac)]
      setForms(allForms)
      setConjMsg(`✅ ${sedraForms.length} Sedra + ${missing.filter(m => m.syriac && m.source === 'claude').length} Claude formu hazır`)
    } catch (e) {
      setConjErr('Sedra API hatası: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setFetching(false)
    }
  }

  // ─── SAVE FORMS ──────────────────────────────────────────────
  async function saveForms() {
    const selected = forms.filter(f => f.selected && f.syriac)
    if (selected.length === 0) { setConjErr('Kaydedilecek form seçin'); return }
    setSaving(true)
    let saved = 0
    for (const f of selected) {
      const { error } = await supabase.from('grammar_rules_v2').insert({
        name: `${verb} — ${f.tense} ${f.person} ${f.number} ${f.gender}`,
        category: 'VERB',
        tense: f.tense,
        person: f.person,
        number: f.number,
        gender: f.gender,
        example_input: verb,
        example_output_syc: f.syriac,
        rule_text_en: f.western ? `Western vocalization: ${f.western}` : null,
        source: f.source,
        supported_languages: ['syc'],
        is_active: f.source === 'sedra',
        difficulty_level: 1,
        version: 1,
      })
      if (!error) saved++
    }
    setConjMsg(`✅ ${saved} form kaydedildi. Sedra kaynakları aktif, Claude kaynakları inceleme bekliyor.`)
    setSaving(false)
  }

  // ─── RULE CRUD ───────────────────────────────────────────────
  async function deleteRule(id: number) {
    if (!confirm('Bu kural silinsin mi?')) return
    await supabase.from('grammar_rules_v2').delete().eq('id', id)
    loadRules()
  }

  async function toggleActive(rule: Rule) {
    await supabase.from('grammar_rules_v2').update({ is_active: !rule.is_active }).eq('id', rule.id)
    loadRules()
  }

  async function saveEdit() {
    if (!editingRule) return
    await supabase.from('grammar_rules_v2').update({
      name: editingRule.name,
      tense: editingRule.tense,
      person: editingRule.person,
      number: editingRule.number,
      gender: editingRule.gender,
      example_input: editingRule.example_input,
      example_output_syc: editingRule.example_output_syc,
      rule_text_en: editingRule.rule_text_en,
      rule_text_tr: editingRule.rule_text_tr,
    }).eq('id', editingRule.id)
    setEditingRule(null)
    setRulesMsg('✅ Kural güncellendi')
    loadRules()
  }

  async function addRule() {
    if (!addForm.name) { setAddMsg('Kural adı zorunlu'); return }
    const { error } = await supabase.from('grammar_rules_v2').insert({
      ...addForm,
      supported_languages: ['syc'],
      is_active: true,
      difficulty_level: 1,
      version: 1,
    })
    if (error) { setAddMsg('❌ ' + error.message); return }
    setAddMsg('✅ Kural eklendi')
    setAddForm({ name: '', category: 'VERB', tense: '', person: '', number: '', gender: '', example_input: '', example_output_syc: '', rule_text_en: '', rule_text_tr: '', source: 'manual' })
  }

  // ─── STYLES ──────────────────────────────────────────────────
  const labelStyle = {
    fontSize: '0.75rem', fontWeight: 700 as const, color: 'var(--color-primary)',
    display: 'block' as const, marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.06em'
  }

  const filteredRules = rules.filter(r => {
    if (filterCat !== 'all' && r.category !== filterCat) return false
    if (filterActive === 'active' && !r.is_active) return false
    if (filterActive === 'inactive' && r.is_active) return false
    return true
  })

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #0F3D47 100%)', padding: '2rem 0' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Admin Alanı</p>
              <h1 style={{ color: 'white', fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700 }}>Grammar Engine</h1>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem', marginTop: '0.3rem' }}>Sedra + Claude çekim veritabanı · grammar_rules_v2</p>
            </div>
            <Link href={`/${locale}/admin`} className="btn btn-ghost btn-sm" style={{ color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.25)' }}>← Admin Panele Dön</Link>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '2rem 1.5rem 4rem' }}>
        {/* TABS */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '2rem', borderBottom: '2px solid var(--color-border)', paddingBottom: '0' }}>
          {([['conjugation', '⚙️ Çekim Üretici'], ['rules', '📋 Kural Listesi'], ['add', '➕ Manuel Ekle']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ padding: '0.6rem 1.2rem', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', borderBottom: tab === key ? '2px solid var(--color-primary)' : '2px solid transparent', marginBottom: -2, background: 'none', color: tab === key ? 'var(--color-primary)' : 'var(--color-text-muted)', transition: '0.2s' }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── TAB: CONJUGATION ── */}
        {tab === 'conjugation' && (
          <div>
            <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>Fiil Çekim Üretici</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                Süryanice bir fiil girin → Sedra'dan tüm mevcut formlar çekilir → eksikler Claude ile tamamlanır → seçtikleriniz <code>grammar_rules_v2</code>'ye kaydedilir.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={labelStyle}>Fiil (Süryanice)</label>
                  <input className="input" value={verb} onChange={e => setVerb(e.target.value)}
                    placeholder="ܐܙܠ" style={{ direction: 'rtl', fontSize: '1.2rem', fontFamily: 'serif', width: '100%' }} />
                </div>
                <button className="btn btn-primary" onClick={fetchFromSedra} disabled={fetching} style={{ minWidth: 160 }}>
                  {fetching ? '⏳ Çekiliyor...' : '🔍 Sedra + Claude'}
                </button>
              </div>
              {conjErr && <div style={{ marginTop: '0.75rem', color: 'var(--color-danger)', fontSize: '0.875rem' }}>{conjErr}</div>}
              {conjMsg && <div style={{ marginTop: '0.75rem', color: 'var(--color-success)', fontSize: '0.875rem' }}>{conjMsg}</div>}
            </div>

            {forms.length > 0 && (
              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={{ color: 'var(--color-primary)' }}>{forms.length} Form Bulundu</h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setForms(f => f.map(x => ({ ...x, selected: true })))}>Tümünü Seç</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setForms(f => f.map(x => ({ ...x, selected: false })))}>Temizle</button>
                    <button className="btn btn-primary btn-sm" onClick={saveForms} disabled={saving}>
                      {saving ? '⏳...' : `✅ ${forms.filter(f => f.selected).length} Formu Kaydet`}
                    </button>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-bg-subtle)' }}>
                        {['', 'Zaman', 'Şahıs', 'Sayı', 'Cinsiyet', 'Süryanice', 'Vokalize', 'Kaynak'].map(h => (
                          <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {forms.map((f, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--color-border)', background: f.selected ? 'var(--color-primary-light)' : 'white' }}>
                          <td style={{ padding: '0.5rem 0.75rem' }}>
                            <input type="checkbox" checked={f.selected} onChange={() => setForms(prev => prev.map((x, j) => j === i ? { ...x, selected: !x.selected } : x))} />
                          </td>
                          <td style={{ padding: '0.5rem 0.75rem' }}>{f.tense}</td>
                          <td style={{ padding: '0.5rem 0.75rem' }}>{f.person}</td>
                          <td style={{ padding: '0.5rem 0.75rem' }}>{f.number}</td>
                          <td style={{ padding: '0.5rem 0.75rem' }}>{f.gender}</td>
                          <td style={{ padding: '0.5rem 0.75rem', direction: 'rtl', fontFamily: 'serif', fontSize: '1.1rem', color: 'var(--color-primary)' }}>{f.syriac}</td>
                          <td style={{ padding: '0.5rem 0.75rem', direction: 'rtl', fontFamily: 'serif' }}>{f.western}</td>
                          <td style={{ padding: '0.5rem 0.75rem' }}>
                            <span className="badge" style={{ background: f.source === 'sedra' ? '#EEF8F1' : f.source === 'claude' ? '#FDF3E3' : 'var(--color-bg-subtle)', color: f.source === 'sedra' ? '#216A3A' : f.source === 'claude' ? '#8B5000' : 'var(--color-text-muted)' }}>
                              {f.source}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: RULES ── */}
        {tab === 'rules' && (
          <div>
            {rulesMsg && <div style={{ marginBottom: '1rem', background: '#EEF8F1', border: '1px solid #B7DEC2', color: '#216A3A', borderRadius: 'var(--radius-md)', padding: '0.875rem', fontSize: '0.9rem' }}>{rulesMsg}</div>}

            {/* Filtreler */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <select className="input" style={{ minWidth: 130 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                <option value="all">Tüm Kategoriler</option>
                <option value="VERB">VERB</option>
                <option value="NOUN">NOUN</option>
                <option value="PRONOUN">PRONOUN</option>
              </select>
              <select className="input" style={{ minWidth: 130 }} value={filterActive} onChange={e => setFilterActive(e.target.value)}>
                <option value="all">Tümü</option>
                <option value="active">Aktif</option>
                <option value="inactive">İnaktif</option>
              </select>
              <button className="btn btn-ghost btn-sm" onClick={loadRules}>🔄 Yenile</button>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{filteredRules.length} kural</span>
            </div>

            {/* Edit panel */}
            {editingRule && (
              <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', border: '2px solid var(--color-primary)' }}>
                <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>✏️ Kural Düzenle</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  {[
                    ['Kural Adı', 'name', 'text'],
                    ['Zaman', 'tense', 'text'],
                    ['Şahıs', 'person', 'text'],
                    ['Sayı', 'number', 'text'],
                    ['Cinsiyet', 'gender', 'text'],
                    ['Giriş (fiil kökü)', 'example_input', 'text'],
                    ['Çıkış (Süryanice)', 'example_output_syc', 'text'],
                    ['Açıklama (EN)', 'rule_text_en', 'text'],
                    ['Açıklama (TR)', 'rule_text_tr', 'text'],
                  ].map(([label, field]) => (
                    <div key={field}>
                      <label style={labelStyle}>{label}</label>
                      <input className="input" style={{ width: '100%', direction: ['example_input','example_output_syc'].includes(field) ? 'rtl' : 'ltr' }}
                        value={(editingRule as any)[field] || ''}
                        onChange={e => setEditingRule(prev => prev ? { ...prev, [field]: e.target.value } : null)} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn btn-primary" onClick={saveEdit}>✅ Kaydet</button>
                  <button className="btn btn-ghost" onClick={() => setEditingRule(null)}>İptal</button>
                </div>
              </div>
            )}

            {/* Tablo */}
            {rulesLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Yükleniyor...</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-bg-subtle)' }}>
                      {['Kural Adı', 'Kategori', 'Zaman', 'Şahıs', 'Sayı', 'Giriş', 'Çıkış', 'Kaynak', 'Durum', 'İşlem'].map(h => (
                        <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRules.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}><span className="badge">{r.category}</span></td>
                        <td style={{ padding: '0.6rem 0.75rem', color: 'var(--color-text-muted)' }}>{r.tense || '—'}</td>
                        <td style={{ padding: '0.6rem 0.75rem', color: 'var(--color-text-muted)' }}>{r.person || '—'}</td>
                        <td style={{ padding: '0.6rem 0.75rem', color: 'var(--color-text-muted)' }}>{r.number || '—'}</td>
                        <td style={{ padding: '0.6rem 0.75rem', direction: 'rtl', fontFamily: 'serif', color: 'var(--color-primary)' }}>{r.example_input || '—'}</td>
                        <td style={{ padding: '0.6rem 0.75rem', direction: 'rtl', fontFamily: 'serif', fontSize: '1.1rem', color: 'var(--color-primary)' }}>{r.example_output_syc || '—'}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>
                          <span className="badge" style={{ background: r.source === 'sedra' ? '#EEF8F1' : r.source === 'claude' ? '#FDF3E3' : 'var(--color-bg-subtle)', color: r.source === 'sedra' ? '#216A3A' : r.source === 'claude' ? '#8B5000' : 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                            {r.source}
                          </span>
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>
                          <button onClick={() => toggleActive(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
                            {r.is_active ? '🟢' : '🔴'}
                          </button>
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingRule(r)}>✏️</button>
                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => deleteRule(r.id)}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredRules.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Kural bulunamadı.</div>}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: ADD ── */}
        {tab === 'add' && (
          <div className="card" style={{ padding: '1.5rem', maxWidth: 800 }}>
            <h3 style={{ color: 'var(--color-primary)', marginBottom: '1.25rem' }}>➕ Manuel Kural Ekle</h3>
            {addMsg && <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: addMsg.startsWith('❌') ? '#FFF7F7' : '#EEF8F1', color: addMsg.startsWith('❌') ? 'var(--color-danger)' : '#216A3A', fontSize: '0.875rem' }}>{addMsg}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {[
                ['Kural Adı *', 'name'], ['Kategori', 'category'], ['Zaman', 'tense'],
                ['Şahıs', 'person'], ['Sayı', 'number'], ['Cinsiyet', 'gender'],
              ].map(([label, field]) => (
                <div key={field}>
                  <label style={labelStyle}>{label}</label>
                  {field === 'category' ? (
                    <select className="input" style={{ width: '100%' }} value={(addForm as any)[field]} onChange={e => setAddForm(p => ({ ...p, [field]: e.target.value }))}>
                      <option value="VERB">VERB</option>
                      <option value="NOUN">NOUN</option>
                      <option value="PRONOUN">PRONOUN</option>
                      <option value="ADJECTIVE">ADJECTIVE</option>
                    </select>
                  ) : (
                    <input className="input" style={{ width: '100%' }} value={(addForm as any)[field] || ''}
                      onChange={e => setAddForm(p => ({ ...p, [field]: e.target.value }))} />
                  )}
                </div>
              ))}
              <div>
                <label style={labelStyle}>Giriş (fiil kökü)</label>
                <input className="input" style={{ width: '100%', direction: 'rtl', fontFamily: 'serif' }} value={addForm.example_input}
                  onChange={e => setAddForm(p => ({ ...p, example_input: e.target.value }))} placeholder="ܐܙܠ" />
              </div>
              <div>
                <label style={labelStyle}>Çıkış (Süryanice form)</label>
                <input className="input" style={{ width: '100%', direction: 'rtl', fontFamily: 'serif' }} value={addForm.example_output_syc}
                  onChange={e => setAddForm(p => ({ ...p, example_output_syc: e.target.value }))} placeholder="ܐܶܙܰܠ" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Açıklama (TR)</label>
                <input className="input" style={{ width: '100%' }} value={addForm.rule_text_tr}
                  onChange={e => setAddForm(p => ({ ...p, rule_text_tr: e.target.value }))} placeholder="Bu kuralın Türkçe açıklaması..." />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Açıklama (EN)</label>
                <input className="input" style={{ width: '100%' }} value={addForm.rule_text_en}
                  onChange={e => setAddForm(p => ({ ...p, rule_text_en: e.target.value }))} placeholder="English explanation of the rule..." />
              </div>
            </div>
            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary" onClick={addRule}>✅ Kural Ekle</button>
              <button className="btn btn-ghost" onClick={() => setAddForm({ name: '', category: 'VERB', tense: '', person: '', number: '', gender: '', example_input: '', example_output_syc: '', rule_text_en: '', rule_text_tr: '', source: 'manual' })}>Temizle</button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
