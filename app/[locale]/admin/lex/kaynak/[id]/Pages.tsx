'use client'

import { useEffect, useRef, useState } from 'react'
import {
  lexDb, sourceError, addPage, uploadPageImage, signedPageUrls, naturalSort, pageLabel,
  PAGES_BUCKET, PAGE_MIME, PAGE_SELECT, STATUS_LABEL, type PageRow,
} from '@/lib/lex'
import { createClient } from '@/lib/supabase'
import { Field, ui } from '../../components'

// Sayfa listesi ve toplu görsel yükleme
export function PageList({ workId, pages, role, selectedId, onSelect, onChanged }: {
  workId: string
  pages: PageRow[]
  role: string | null
  selectedId: string | null
  onSelect: (id: string | null) => void
  onChanged: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState('')
  const [errors, setErrors] = useState<string[]>([])

  async function upload(list: FileList | null) {
    if (!list?.length) return
    const files = naturalSort(Array.from(list))
    setErrors([])
    let seq = pages.reduce((m, p) => Math.max(m, p.seq), 0) + 1
    const errs: string[] = []
    for (let i = 0; i < files.length; i++) {
      setProgress(`${i + 1} / ${files.length} yükleniyor: ${files[i].name}`)
      const label = files[i].name.replace(/\.[^.]+$/, '')
      const r = await addPage(workId, seq, files[i], label)
      if (r.error) errs.push(r.error)
      else seq = (r.page?.seq ?? seq) + 1
    }
    setProgress(''); setErrors(errs)
    if (fileRef.current) fileRef.current.value = ''
    onChanged()
  }

  return (
    <section className="card" style={ui.card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        <h2 style={{ ...ui.h2, margin: 0 }}>Sayfalar <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>({pages.length})</span></h2>
        {role && (
          <label className="btn btn-sm btn-secondary" style={{ marginLeft: 'auto', cursor: progress ? 'wait' : 'pointer' }}>
            {progress ? 'Yükleniyor…' : '+ Sayfa görselleri yükle'}
            <input ref={fileRef} type="file" multiple accept={PAGE_MIME.join(',')} hidden disabled={!!progress}
              onChange={(e) => upload(e.target.files)} />
          </label>
        )}
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 0 }}>
        JPEG, PNG veya WebP; dosya başına en çok 25 MB. Birden çok dosya seçilebilir; dosya adına göre sıralanır ve ad sayfa etiketi olur.
      </p>
      {progress && <p style={{ fontSize: '0.85rem' }}>{progress}</p>}
      {errors.map((e, i) => <p key={i} style={{ color: 'var(--color-danger)', margin: '0.2rem 0', fontSize: '0.85rem' }}>{e}</p>)}
      {pages.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>Henüz sayfa yok.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', maxHeight: 220, overflowY: 'auto' }}>
          {pages.map((p) => (
            <button key={p.id} className={`btn btn-sm ${p.id === selectedId ? 'btn-primary' : 'btn-secondary'}`}
              title={p.image_path ? '' : 'Görsel yok'} onClick={() => onSelect(p.id === selectedId ? null : p.id)}
              style={p.image_path ? undefined : { borderStyle: 'dashed' }}>
              {pageLabel(p)}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

// Seçili sayfanın görseli ve bilgileri
export function PageViewer({ page, pages, role, locked, onSelect, onChanged }: {
  page: PageRow
  pages: PageRow[]
  role: string | null
  locked: boolean
  onSelect: (id: string | null) => void
  onChanged: (p?: PageRow) => void
}) {
  const [url, setUrl] = useState<{ path: string; href: string } | null>(null)
  const [zoom, setZoom] = useState(false)
  const [meta, setMeta] = useState({ id: page.id, seq: String(page.seq), label: page.label ?? '', volume: page.volume ?? '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)
  const replaceRef = useRef<HTMLInputElement>(null)

  // Sayfa değişince bilgi alanlarını o sayfaya çek (render sırasında, effect'siz)
  if (meta.id !== page.id) {
    setMeta({ id: page.id, seq: String(page.seq), label: page.label ?? '', volume: page.volume ?? '' })
    setError(''); setConfirmDel(false)
  }

  useEffect(() => {
    if (!page.image_path) return
    const path = page.image_path
    signedPageUrls([path]).then((m) => setUrl(m[path] ? { path, href: m[path] } : null))
  }, [page.image_path])

  const i = pages.findIndex((p) => p.id === page.id)
  const prev = i > 0 ? pages[i - 1] : null
  const next = i >= 0 && i < pages.length - 1 ? pages[i + 1] : null
  const href = url && url.path === page.image_path ? url.href : null

  async function saveMeta() {
    setError('')
    const seq = Number(meta.seq)
    if (!Number.isInteger(seq) || seq < 1) { setError('Sıra 1 veya daha büyük bir tam sayı olmalı.'); return }
    setBusy(true)
    const { data, error: e } = await lexDb().from('page')
      .update({ seq, label: meta.label.trim() || null, volume: meta.volume.trim() || null })
      .eq('id', page.id).select(PAGE_SELECT).maybeSingle()
    setBusy(false)
    if (e) { setError(sourceError(e)); return }
    if (!data) { setError('Kaydedilemedi (yetki yok).'); return }
    onChanged(data as unknown as PageRow)
  }

  async function replace(list: FileList | null) {
    const f = list?.[0]
    if (!f) return
    setBusy(true); setError('')
    const up = await uploadPageImage(page.source_work_id, page.id, f)
    if (up.error) { setBusy(false); setError(up.error); return }
    const { data, error: e } = await lexDb().from('page')
      .update({ image_path: up.path, width_px: up.width, height_px: up.height })
      .eq('id', page.id).select(PAGE_SELECT).maybeSingle()
    setBusy(false)
    if (replaceRef.current) replaceRef.current.value = ''
    if (e) { setError(sourceError(e)); return }
    if (!data) { setError('Kaydedilemedi (yetki yok).'); return }
    // Uzantı değiştiyse eski dosya kalır; admin ise kaldır
    if (role === 'admin' && page.image_path && page.image_path !== up.path) {
      await createClient().storage.from(PAGES_BUCKET).remove([page.image_path])
    }
    setUrl(null)
    if (up.path) signedPageUrls([up.path]).then((m) => setUrl(m[up.path!] ? { path: up.path!, href: m[up.path!] } : null))
    onChanged(data as unknown as PageRow)
  }

  async function remove() {
    if (!confirmDel) { setConfirmDel(true); return }
    setBusy(true); setError('')
    const { error: e, count } = await lexDb().from('page').delete({ count: 'exact' }).eq('id', page.id)
    if (e || !count) { setBusy(false); setError(e ? sourceError(e) : 'Silinemedi (yetki yok).'); return }
    if (page.image_path) await createClient().storage.from(PAGES_BUCKET).remove([page.image_path])
    setBusy(false)
    onSelect(next?.id ?? prev?.id ?? null)
    onChanged()
  }

  return (
    <section className="card" style={{ ...ui.card, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        <button className="btn btn-sm btn-ghost" disabled={!prev} onClick={() => prev && onSelect(prev.id)}>‹ Önceki</button>
        <strong>Sayfa {pageLabel(page)}</strong>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          {page.width_px && page.height_px ? `${page.width_px}×${page.height_px} px · ` : ''}{STATUS_LABEL[page.status]}
        </span>
        <button className="btn btn-sm btn-ghost" disabled={!next} onClick={() => next && onSelect(next.id)}>Sonraki ›</button>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: '0.25rem' }}>
          {href && <button className="btn btn-sm btn-ghost" onClick={() => setZoom((z) => !z)}>{zoom ? 'Sığdır' : 'Büyüt'}</button>}
          {href && <a className="btn btn-sm btn-ghost" href={href} target="_blank" rel="noreferrer">Yeni sekmede</a>}
          <button className="btn btn-sm btn-ghost" onClick={() => onSelect(null)}>Kapat</button>
        </span>
      </div>

      <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-bg-subtle)', overflow: 'auto', maxHeight: '75vh', minHeight: 200, display: 'flex', justifyContent: zoom ? 'flex-start' : 'center' }}>
        {!page.image_path ? (
          <p style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>Bu sayfanın görseli yok.</p>
        ) : !href ? (
          <p style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>Görsel yükleniyor…</p>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={href} alt={`Sayfa ${pageLabel(page)}`}
            style={zoom ? { maxWidth: 'none' } : { maxWidth: '100%', height: 'auto', objectFit: 'contain' }} />
        )}
      </div>

      {role && !locked && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end', marginTop: '0.75rem' }}>
          <Field label="Sıra">
            <input className="input" type="number" min={1} style={{ width: 90 }} value={meta.seq} onChange={(e) => setMeta({ ...meta, seq: e.target.value })} />
          </Field>
          <Field label="Etiket (s. 213, f. 12r…)">
            <input className="input" style={{ width: 180 }} value={meta.label} onChange={(e) => setMeta({ ...meta, label: e.target.value })} />
          </Field>
          <Field label="Cilt">
            <input className="input" style={{ width: 90 }} value={meta.volume} onChange={(e) => setMeta({ ...meta, volume: e.target.value })} />
          </Field>
          <button className="btn btn-sm btn-primary" onClick={saveMeta} disabled={busy}>Kaydet</button>
          <label className="btn btn-sm btn-secondary" style={{ cursor: 'pointer' }}>
            {page.image_path ? 'Görseli değiştir' : 'Görsel yükle'}
            <input ref={replaceRef} type="file" accept={PAGE_MIME.join(',')} hidden disabled={busy} onChange={(e) => replace(e.target.files)} />
          </label>
          {role === 'admin' && (
            <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto', color: 'var(--color-danger)' }}
              onClick={remove} onBlur={() => setConfirmDel(false)} disabled={busy}>
              {confirmDel ? 'Emin misiniz? Görsel de silinir' : 'Sayfayı sil'}
            </button>
          )}
        </div>
      )}
      {locked && <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 0 }}>Sayfa incelenmiş/yayımlanmış; yalnız editör değiştirebilir.</p>}
      {error && <p style={{ color: 'var(--color-danger)', marginBottom: 0 }}>{error}</p>}
    </section>
  )
}
