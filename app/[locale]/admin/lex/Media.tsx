'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  lexDb, explainError, fetchMedia, signedMediaUrls, addMedia, deleteMedia, mediaKindOf,
  LICENSE_LABEL, VOCALIZATION_LABEL,
  type MediaTarget, type MediaRow, type MediaMeta, type LicenseKind, type Status,
} from '@/lib/lex'
import { StatusBadge, Field, ui } from './components'

const blankMeta = (): MediaMeta => ({ vocalization: '', speaker: '', license: 'unknown', credit: '', source_note: '' })

function recorderMime(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'])
    if (MediaRecorder.isTypeSupported(m)) return m
  return ''
}

// Ses ve görsel paneli: bir madde, anlam, form veya örneğe bağlı medya.
// Yükleme ve kayıt katkıcı+, yayımlama editör, silme admin (veritabanı da denetler).
// compact: başlıksız, satır içi (form tablosu ve örnek listesi için).
export function MediaPanel({ target, role, title, compact = false, locked = false }: {
  target: MediaTarget
  role: string | null
  title?: string
  compact?: boolean
  locked?: boolean
}) {
  const isEditor = role === 'editor' || role === 'admin'
  const [rows, setRows] = useState<MediaRow[] | null>(null)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [open, setOpen] = useState(false)
  const [meta, setMeta] = useState<MediaMeta>(blankMeta)
  const [busy, setBusy] = useState(false)
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const fileRef = useRef<HTMLInputElement | null>(null)

  const apply = useCallback(async (r: { rows: MediaRow[]; error: string }) => {
    if (r.error) setError(r.error)
    setRows(r.rows)
    setUrls(await signedMediaUrls(r.rows.map((m) => m.storage_path)))
  }, [])

  const { field, id } = target
  useEffect(() => { fetchMedia({ field, id }).then(apply) }, [field, id, apply])
  const reload = () => fetchMedia({ field, id }).then(apply)

  // Bileşen kapanırken açık mikrofonu bırak
  useEffect(() => () => { recRef.current?.stream.getTracks().forEach((t) => t.stop()) }, [])

  async function upload(blobs: { blob: Blob; name: string }[]) {
    setBusy(true); setError(''); setMsg('')
    const errs: string[] = []
    let ok = 0
    for (const { blob, name } of blobs) {
      const r = await addMedia({ field, id }, blob, meta, name)
      if (r.error) errs.push(r.error); else ok++
    }
    setBusy(false)
    if (errs.length) setError(errs.join(' · '))
    if (ok) { setMsg(`${ok} dosya eklendi.`); reload() }
    if (fileRef.current) fileRef.current.value = ''
  }

  async function startRec() {
    setError(''); setMsg('')
    const mime = recorderMime()
    if (!mime || !navigator.mediaDevices?.getUserMedia) { setError('Bu tarayıcı ses kaydını desteklemiyor; dosya yükleyin.'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream, { mimeType: mime })
      chunks.current = []
      rec.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data) }
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunks.current, { type: mime })
        setRecording(false)
        if (blob.size) upload([{ blob, name: 'Kayıt' }])
      }
      recRef.current = rec
      rec.start()
      setRecording(true)
    } catch {
      setError('Mikrofona erişilemedi (tarayıcı izni gerekli).')
    }
  }
  const stopRec = () => recRef.current?.state === 'recording' && recRef.current.stop()

  async function changeStatus(m: MediaRow, status: Status) {
    setError(''); setMsg('')
    const { error: e, count } = await lexDb().from('media').update({ status }, { count: 'exact' }).eq('id', m.id)
    if (e || !count) { setError(e ? explainError(e) : 'Durum değiştirilemedi (yetki yok).'); return }
    reload()
  }

  async function remove(m: MediaRow) {
    if (confirmDel !== m.id) { setConfirmDel(m.id); return }
    setConfirmDel(null); setError(''); setMsg('')
    const err = await deleteMedia(m)
    if (err) setError(err); else setMsg('Silindi.')
    reload()
  }

  const setM = (patch: Partial<MediaMeta>) => setMeta((x) => ({ ...x, ...patch }))
  const canAdd = !!role && !locked
  const empty = rows !== null && rows.length === 0

  const list = rows === null ? <span style={muted}>Yükleniyor…</span> : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {rows.map((m) => (
        <div key={m.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {m.kind === 'audio' ? (
            urls[m.storage_path]
              ? <audio controls preload="none" src={urls[m.storage_path]} style={{ height: 34, maxWidth: 280 }} />
              : <span style={muted}>ses açılamadı</span>
          ) : urls[m.storage_path] ? (
            <a href={urls[m.storage_path]} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={urls[m.storage_path]} alt="" style={{ height: 64, borderRadius: 4, border: '1px solid var(--color-border)' }} />
            </a>
          ) : <span style={muted}>görsel açılamadı</span>}
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {[m.vocalization && VOCALIZATION_LABEL[m.vocalization], m.speaker, m.credit,
              m.license !== 'unknown' ? LICENSE_LABEL[m.license] : ''].filter(Boolean).join(' · ')}
          </span>
          <StatusBadge status={m.status} />
          {isEditor && m.status !== 'published' && (
            <button className="btn btn-sm btn-accent" onClick={() => changeStatus(m, 'published')}>Yayımla</button>
          )}
          {isEditor && m.status !== 'draft' && (
            <button className="btn btn-sm btn-ghost" onClick={() => changeStatus(m, 'draft')}>Taslağa al</button>
          )}
          {role === 'admin' && (
            <button className="btn btn-sm btn-ghost" style={{ color: 'var(--color-danger)' }}
              onClick={() => remove(m)} onBlur={() => setConfirmDel(null)}>
              {confirmDel === m.id ? 'Emin misiniz?' : 'Sil'}
            </button>
          )}
        </div>
      ))}
    </div>
  )

  const form = open && canAdd && (
    <div style={{ borderTop: '1px dashed var(--color-border)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
      <div style={ui.grid}>
        <Field label="Okunuş (ses için)">
          <select className="input" value={meta.vocalization} onChange={(e) => setM({ vocalization: e.target.value as MediaMeta['vocalization'] })}>
            <option value="">—</option>
            <option value="west">{VOCALIZATION_LABEL.west}</option>
            <option value="east">{VOCALIZATION_LABEL.east}</option>
          </select>
        </Field>
        <Field label="Okuyan / konuşan">
          <input className="input" value={meta.speaker} onChange={(e) => setM({ speaker: e.target.value })} />
        </Field>
        <Field label="Lisans">
          <select className="input" value={meta.license} onChange={(e) => setM({ license: e.target.value as LicenseKind })}>
            {(Object.keys(LICENSE_LABEL) as LicenseKind[]).map((k) => <option key={k} value={k}>{LICENSE_LABEL[k]}</option>)}
          </select>
        </Field>
        <Field label="Emek / kaynak (görsel için)">
          <input className="input" value={meta.credit} onChange={(e) => setM({ credit: e.target.value })} />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.5rem' }}>
        <input ref={fileRef} type="file" multiple disabled={busy || recording}
          accept="audio/*,image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const fs = Array.from(e.target.files ?? [])
            const bad = fs.filter((f) => !mediaKindOf(f))
            if (bad.length) { setError(`Desteklenmeyen dosya: ${bad.map((f) => f.name).join(', ')}`); return }
            if (fs.length) upload(fs.map((f) => ({ blob: f, name: f.name })))
          }} />
        {recording
          ? <button className="btn btn-sm btn-primary" onClick={stopRec}>■ Kaydı bitir ve yükle</button>
          : <button className="btn btn-sm btn-secondary" disabled={busy} onClick={startRec}>● Sesi kaydet</button>}
        {busy && <span style={muted}>Yükleniyor…</span>}
        <button className="btn btn-sm btn-ghost" onClick={() => { stopRec(); setOpen(false) }}>Kapat</button>
      </div>
      <p style={{ ...muted, margin: '0.35rem 0 0' }}>Ses: MP3, M4A, OGG, WebM, WAV, FLAC · Görsel: JPEG, PNG, WebP · en çok 25 MB</p>
    </div>
  )

  const addBtn = canAdd && !open && (
    <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setOpen(true); setError(''); setMsg('') }}>+ Ses / görsel</button>
  )

  if (compact) {
    return (
      <div style={{ marginTop: '0.35rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {!empty && list}
          {addBtn}
        </div>
        {form}
        {error && <p style={{ color: 'var(--color-danger)', margin: '0.25rem 0 0', fontSize: '0.8rem' }}>{error}</p>}
        {msg && <p style={{ color: 'var(--color-success)', margin: '0.25rem 0 0', fontSize: '0.8rem' }}>{msg}</p>}
      </div>
    )
  }

  return (
    <div style={{ marginTop: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
        <strong style={{ fontSize: '0.9rem' }}>{title ?? 'Ses ve görsel'}</strong>
        <span style={{ marginLeft: 'auto' }}>{addBtn}</span>
      </div>
      {empty ? <span style={muted}>Henüz ses veya görsel yok.</span> : list}
      {form}
      {error && <p style={{ color: 'var(--color-danger)', margin: '0.35rem 0 0', fontSize: '0.85rem' }}>{error}</p>}
      {msg && <p style={{ color: 'var(--color-success)', margin: '0.35rem 0 0', fontSize: '0.85rem' }}>{msg}</p>}
    </div>
  )
}

const muted: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--color-text-muted)' }
