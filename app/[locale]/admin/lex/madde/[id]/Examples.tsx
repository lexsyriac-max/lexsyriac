'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  lexDb, explainError, syrSkeleton, fetchExamplesForSenses, saveExample, LANGS,
  type ExampleRow, type ExampleDraft, type Lang, type Status,
} from '@/lib/lex'
import { StatusBadge, Syr, Field, ui } from '../../components'
import { MediaPanel } from '../../Media'

export type SenseRef = { id: string; sense_no: number; label: string }

const blank = (senseIds: string[]): ExampleDraft => ({
  text_west: '', text_east: '', transliteration: '', is_constructed: false,
  source_work_id: '', locus: '', source_note: '',
  translations: { tr: '', en: '', de: '' }, sense_ids: senseIds,
})

function toDraft(r: ExampleRow): ExampleDraft {
  const tr: Record<Lang, string> = { tr: '', en: '', de: '' }
  for (const t of r.example_translation) if (LANGS.includes(t.lang)) tr[t.lang] = t.text
  return {
    id: r.id, text_west: r.text_west ?? '', text_east: r.text_east ?? '', transliteration: r.transliteration ?? '',
    is_constructed: r.is_constructed, source_work_id: r.source_work_id ?? '', locus: r.locus ?? '',
    source_note: r.source_note ?? '', translations: tr, sense_ids: r.example_sense.map((s) => s.sense_id),
  }
}

// Madde ekranındaki "Örnek cümleler" bölümü.
// Örnek kendi durum akışından geçer (taslak → incelendi → yayımlandı).
export function Examples({ lexemeId, senses, role }: { lexemeId: string; senses: SenseRef[]; role: string | null }) {
  const isEditor = role === 'editor' || role === 'admin'
  const senseKey = senses.map((s) => s.id).join(',')
  const [rows, setRows] = useState<ExampleRow[] | null>(null)
  const [sources, setSources] = useState<{ id: string; siglum: string | null; title: string }[]>([])
  const [draft, setDraft] = useState<ExampleDraft | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const apply = useCallback((r: { rows: ExampleRow[]; error: string }) => {
    if (r.error) setError(r.error)
    setRows(r.rows)
  }, [])

  useEffect(() => {
    fetchExamplesForSenses(senseKey ? senseKey.split(',') : []).then(apply)
  }, [senseKey, apply])

  useEffect(() => {
    lexDb().from('source_work').select('id,siglum,title').order('siglum').then(({ data }) => setSources(data ?? []))
  }, [])

  const reload = () => fetchExamplesForSenses(senses.map((s) => s.id)).then(apply)
  const senseOf = new Map(senses.map((s) => [s.id, s]))

  async function save() {
    if (!draft) return
    setBusy(true); setError(''); setMsg('')
    const r = await saveExample(lexemeId, draft)
    setBusy(false)
    if (r.error) { setError(r.error); return }
    setDraft(null); setMsg('Örnek kaydedildi.')
    reload()
  }

  async function changeStatus(id: string, status: Status) {
    setError(''); setMsg('')
    const { error: e, count } = await lexDb().from('example').update({ status }, { count: 'exact' }).eq('id', id)
    if (e || !count) { setError(e ? explainError(e) : 'Durum değiştirilemedi (yetki yok).'); return }
    reload()
  }

  // Bağlantıyı kaldırır; örnek silinmez (başka maddelere bağlı olabilir)
  async function unlink(id: string) {
    if (confirmDel !== id) { setConfirmDel(id); return }
    setConfirmDel(null); setError(''); setMsg('')
    const { error: e, count } = await lexDb().from('example_sense').delete({ count: 'exact' })
      .eq('example_id', id).in('sense_id', senses.map((s) => s.id))
    if (e || !count) { setError(e ? explainError(e) : 'Bağlantı kaldırılamadı (yetki yok).'); return }
    if (draft?.id === id) setDraft(null)
    setMsg('Örneğin bu maddeyle bağlantısı kaldırıldı.')
    reload()
  }

  const setD = (patch: Partial<ExampleDraft>) => setDraft((d) => (d ? { ...d, ...patch } : d))
  const skelW = syrSkeleton(draft?.text_west), skelE = syrSkeleton(draft?.text_east)
  const mismatch = !!(skelW && skelE && skelW !== skelE)

  return (
    <section className="card" style={ui.card}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h2 style={{ ...ui.h2, margin: 0 }}>Örnek cümleler</h2>
        {role && !draft && senses.length > 0 && (
          <button type="button" className="btn btn-sm btn-secondary" style={{ marginLeft: 'auto' }}
            onClick={() => { setDraft(blank(senses.length === 1 ? [senses[0].id] : [])); setError(''); setMsg('') }}>
            + Örnek ekle
          </button>
        )}
      </div>
      {senses.length === 0 && (
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Örnek eklemek için önce maddeyi en az bir anlamla kaydedin.</p>
      )}

      {rows === null ? <p>Yükleniyor…</p> : rows.length === 0 && !draft ? (
        senses.length > 0 && <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>Henüz örnek yok.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {rows.map((r) => {
            const locked = !isEditor && (r.status === 'reviewed' || r.status === 'published')
            const linked = r.example_sense.map((s) => senseOf.get(s.sense_id)).filter(Boolean) as SenseRef[]
            return (
              <div key={r.id} style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 320px' }}>
                    <div style={{ textAlign: 'right' }}><Syr>{r.text_west || r.text_east}</Syr></div>
                    {r.transliteration && <div style={{ fontStyle: 'italic', fontSize: '0.85rem' }}>{r.transliteration}</div>}
                    {r.example_translation.map((t) => (
                      <div key={t.lang} style={{ fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--color-text-subtle)', fontSize: '0.72rem', marginRight: 4 }}>{t.lang.toUpperCase()}</span>{t.text}
                      </div>
                    ))}
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                      Anlam: {linked.map((s) => `${s.sense_no}${s.label ? ` (${s.label})` : ''}`).join(', ') || '—'}
                      {r.is_constructed ? ' · ders için kurulmuş' : ''}
                      {r.locus ? ` · ${sources.find((s) => s.id === r.source_work_id)?.siglum ?? ''} ${r.locus}` : ''}
                      {r.source_note ? ` · ${r.source_note}` : ''}
                    </div>
                    {role && <MediaPanel target={{ field: 'example_id', id: r.id }} role={role} compact locked={locked} />}
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <StatusBadge status={r.status} />
                    {role && !locked && (
                      <button className="btn btn-sm btn-ghost" onClick={() => { const d = toDraft(r); setDraft({ ...d, sense_ids: d.sense_ids.filter((x) => senseOf.has(x)) }); setError(''); setMsg('') }}>Düzenle</button>
                    )}
                    {isEditor && r.status !== 'published' && (
                      <button className="btn btn-sm btn-accent" onClick={() => changeStatus(r.id, 'published')}>Yayımla</button>
                    )}
                    {isEditor && r.status !== 'draft' && (
                      <button className="btn btn-sm btn-ghost" onClick={() => changeStatus(r.id, 'draft')}>Taslağa al</button>
                    )}
                    {role && !locked && (
                      <button className="btn btn-sm btn-ghost" style={{ color: 'var(--color-danger)' }}
                        onClick={() => unlink(r.id)} onBlur={() => setConfirmDel(null)}>
                        {confirmDel === r.id ? 'Emin misiniz?' : 'Bağlantıyı kaldır'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {draft && (
        <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
          <strong>{draft.id ? 'Örneği düzenle' : 'Yeni örnek'}</strong>
          <div style={{ ...ui.grid, marginTop: '0.5rem' }}>
            <Field label="Batı harekeli (Serto)">
              <input className="input" dir="rtl" lang="syr" style={ui.syrInput} value={draft.text_west} onChange={(e) => setD({ text_west: e.target.value })} />
            </Field>
            <Field label="Doğu harekeli">
              <input className="input" dir="rtl" lang="syr" style={ui.syrInput} value={draft.text_east} onChange={(e) => setD({ text_east: e.target.value })} />
            </Field>
            <Field label="İskelet (otomatik)">
              <div className="input" dir="rtl" style={{ ...ui.syrInput, background: 'var(--color-bg-subtle)', color: mismatch ? 'var(--color-danger)' : undefined }}>
                {mismatch ? 'Batı/Doğu iskeleti uyuşmuyor' : skelW || skelE || '—'}
              </div>
            </Field>
            <Field label="Transliterasyon">
              <input className="input" value={draft.transliteration} onChange={(e) => setD({ transliteration: e.target.value })} />
            </Field>
          </div>
          <div style={{ ...ui.grid, marginTop: '0.5rem' }}>
            {LANGS.map((l) => (
              <Field key={l} label={`Çeviri ${l.toUpperCase()}`}>
                <textarea className="input" rows={2} value={draft.translations[l]}
                  onChange={(e) => setD({ translations: { ...draft.translations, [l]: e.target.value } })} />
              </Field>
            ))}
          </div>
          <div style={{ ...ui.grid, marginTop: '0.5rem' }}>
            <Field label="Kaynak eser">
              <select className="input" value={draft.source_work_id} onChange={(e) => setD({ source_work_id: e.target.value })}>
                <option value="">—</option>
                {sources.map((s) => <option key={s.id} value={s.id}>{s.siglum ? `${s.siglum} — ` : ''}{s.title}</option>)}
              </select>
            </Field>
            <Field label="Yer (sayfa, bölüm, ayet…)">
              <input className="input" value={draft.locus} onChange={(e) => setD({ locus: e.target.value })} />
            </Field>
            <Field label="Kaynak notu">
              <input className="input" value={draft.source_note} onChange={(e) => setD({ source_note: e.target.value })} />
            </Field>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.6rem', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Anlam:</span>
            {senses.map((s) => (
              <label key={s.id} style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                <input type="checkbox" checked={draft.sense_ids.includes(s.id)}
                  onChange={(e) => setD({ sense_ids: e.target.checked ? [...draft.sense_ids, s.id] : draft.sense_ids.filter((x) => x !== s.id) })} />
                {s.sense_no}{s.label ? ` (${s.label})` : ''}
              </label>
            ))}
            <label style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', marginLeft: 'auto' }}>
              <input type="checkbox" checked={draft.is_constructed} onChange={(e) => setD({ is_constructed: e.target.checked })} />
              Ders için kurulmuş cümle (kaynaktan değil)
            </label>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={busy || mismatch}>{busy ? 'Kaydediliyor…' : 'Örneği kaydet'}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setDraft(null); setError('') }}>Vazgeç</button>
          </div>
        </div>
      )}
      {error && <p style={{ color: 'var(--color-danger)', marginBottom: 0 }}>{error}</p>}
      {msg && <p style={{ color: 'var(--color-success)', marginBottom: 0 }}>{msg}</p>}
    </section>
  )
}
