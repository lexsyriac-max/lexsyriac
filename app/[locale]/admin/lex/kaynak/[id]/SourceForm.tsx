'use client'

import { useState } from 'react'
import {
  lexDb, sourceError, SIGLUM_RE, SOURCE_KIND_LABEL, LICENSE_LABEL, SCRIPT_LABEL, OPEN_LICENSES,
  type SourceWork, type SourceKind, type LicenseKind,
} from '@/lib/lex'
import { Field, ui } from '../../components'

const TEXT_FIELDS = [
  'siglum', 'title', 'author', 'editor', 'year_text', 'edition', 'publisher', 'library', 'shelfmark',
  'license_note', 'iiif_manifest', 'notes', 'source_note',
] as const
type Draft = Record<(typeof TEXT_FIELDS)[number], string> & {
  kind: SourceKind; script: string; variety_code: string; license: LicenseKind; images_public: boolean
}

function toDraft(s: SourceWork): Draft {
  const d = { kind: s.kind, script: s.script ?? '', variety_code: s.variety_code ?? '', license: s.license, images_public: s.images_public } as Draft
  for (const k of TEXT_FIELDS) d[k] = (s[k] as string | null) ?? ''
  return d
}

// Eser bilgisi. Kayıtlı eser incelenmiş/yayımlanmışsa yalnız editör değiştirir (veritabanı da denetler).
export function SourceForm({ source, varieties, locked, onSaved }: {
  source: SourceWork
  varieties: { code: string; name_tr: string }[]
  locked: boolean
  onSaved: (s: SourceWork) => void
}) {
  const [d, setD] = useState<Draft>(() => toDraft(source))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))
  const isMs = d.kind === 'manuscript'

  async function save() {
    setError(''); setMsg('')
    if (!d.title.trim()) { setError('Başlık gerekli.'); return }
    if (d.siglum.trim() && !SIGLUM_RE.test(d.siglum.trim())) {
      setError('Kısa ad yalnız harf, rakam, nokta, - ve _ içerebilir.'); return
    }
    const row: Record<string, string | boolean | null> = {
      kind: d.kind, script: d.script || null, variety_code: d.variety_code || null, license: d.license,
      images_public: d.images_public,
    }
    for (const k of TEXT_FIELDS) row[k] = d[k].trim() || null
    setBusy(true)
    const { data, error: e } = await lexDb().from('source_work').update(row).eq('id', source.id)
      .select('*').maybeSingle()
    setBusy(false)
    if (e) { setError(sourceError(e)); return }
    if (!data) { setError('Kaydedilemedi (yetki yok).'); return }
    setMsg('Kaydedildi.')
    onSaved(data as SourceWork)
  }

  const input = (k: (typeof TEXT_FIELDS)[number], label: string, placeholder = '') => (
    <Field label={label}>
      <input className="input" value={d[k]} placeholder={placeholder} disabled={locked} onChange={(e) => set(k, e.target.value)} />
    </Field>
  )

  return (
    <section className="card" style={ui.card}>
      <h2 style={ui.h2}>Eser bilgisi</h2>
      <div style={ui.grid}>
        <Field label="Tür">
          <select className="input" value={d.kind} disabled={locked} onChange={(e) => set('kind', e.target.value as SourceKind)}>
            {(Object.keys(SOURCE_KIND_LABEL) as SourceKind[]).map((k) => <option key={k} value={k}>{SOURCE_KIND_LABEL[k]}</option>)}
          </select>
        </Field>
        {input('siglum', 'Kısa ad (siglum)', 'ör. SFERMELE')}
        {input('title', 'Başlık')}
        {input('author', isMs ? 'Kâtip / yazar' : 'Yazar')}
        {input('editor', 'Editör / hazırlayan')}
        {input('year_text', 'Tarih', 'ör. 1903, 13. yy, MS 1204')}
        {!isMs && input('edition', 'Baskı')}
        {!isMs && input('publisher', 'Yayınevi')}
        {isMs && input('library', 'Kütüphane / koleksiyon')}
        {isMs && input('shelfmark', 'Raf numarası')}
        <Field label="Yazı">
          <select className="input" value={d.script} disabled={locked} onChange={(e) => set('script', e.target.value)}>
            <option value="">—</option>
            {Object.entries(SCRIPT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Lehçe / dönem">
          <select className="input" value={d.variety_code} disabled={locked} onChange={(e) => set('variety_code', e.target.value)}>
            <option value="">—</option>
            {varieties.map((v) => <option key={v.code} value={v.code}>{v.name_tr}</option>)}
          </select>
        </Field>
        <Field label="Lisans">
          <select className="input" value={d.license} disabled={locked} onChange={(e) => set('license', e.target.value as LicenseKind)}>
            {(Object.keys(LICENSE_LABEL) as LicenseKind[]).map((k) => <option key={k} value={k}>{LICENSE_LABEL[k]}</option>)}
          </select>
        </Field>
        {input('license_note', 'Lisans notu', 'izin veren, tarih, koşul…')}
        {input('iiif_manifest', 'IIIF manifest adresi (varsa)')}
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '0.5rem 0 0' }}>
        {OPEN_LICENSES.includes(d.license) || d.images_public
          ? 'Eser yayımlanınca sayfa görselleri ziyaretçilere açılır.'
          : 'Bu lisansla sayfa görselleri yalnız ekibe görünür; yayımlanmış sözlük maddelerinin metni yine görünür.'}
      </p>
      {!OPEN_LICENSES.includes(d.license) && (
        <label style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.85rem', marginTop: '0.4rem' }}>
          <input type="checkbox" checked={d.images_public} disabled={locked} onChange={(e) => set('images_public', e.target.checked)} />
          Görselleri lisanstan bağımsız ziyaretçiye aç (demo dönemi; site halka açılmadan önce gözden geçirilmeli)
        </label>
      )}
      <div style={{ ...ui.grid, marginTop: '0.75rem' }}>
        <Field label="Not">
          <textarea className="input" rows={2} value={d.notes} disabled={locked} onChange={(e) => set('notes', e.target.value)} />
        </Field>
        <Field label="Kaynak notu">
          <textarea className="input" rows={2} value={d.source_note} disabled={locked} onChange={(e) => set('source_note', e.target.value)} />
        </Field>
      </div>
      {error && <p style={{ color: 'var(--color-danger)', marginBottom: 0 }}>{error}</p>}
      {msg && <p style={{ color: 'var(--color-success)', marginBottom: 0 }}>{msg}</p>}
      {!locked && (
        <button className="btn btn-primary" style={{ marginTop: '0.75rem' }} onClick={save} disabled={busy}>
          {busy ? 'Kaydediliyor…' : 'Eser bilgisini kaydet'}
        </button>
      )}
    </section>
  )
}
