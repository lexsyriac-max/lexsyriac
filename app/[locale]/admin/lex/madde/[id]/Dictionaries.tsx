'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  lexDb, sourceError, signedPageUrls, pageLabel, sourceLabel,
  type Status,
} from '@/lib/lex'
import { StatusBadge, Syr, ui } from '../../components'
import type { SenseRef } from './Examples'

type Row = {
  id: string; headword_raw: string; locus: string | null; entry_text_raw: string | null
  lexeme_id: string | null; sense_id: string | null; status: Status; page_id: string | null
  source_work: { id: string; siglum: string | null; title: string } | null
  page: { id: string; seq: number; label: string | null; image_path: string | null } | null
}
const SELECT = 'id,headword_raw,locus,entry_text_raw,lexeme_id,sense_id,status,page_id,' +
  'source_work:source_work_id(id,siglum,title),page:page_id(id,seq,label,image_path)'

function fetchLinked(lexemeId: string) {
  return lexDb().from('dictionary_entry').select(SELECT).eq('lexeme_id', lexemeId).order('created_at')
}
function fetchSuggested(skeleton: string) {
  return lexDb().from('dictionary_entry').select(SELECT).eq('headword_skeleton', skeleton).is('lexeme_id', null).limit(50)
}

// Madde ekranındaki "Sözlüklerde" bölümü: bu maddeye bağlı basılı sözlük maddeleri,
// aynı iskeletli bağlanmamış maddeler (öneri) ve sayfa görseli.
export function Dictionaries({ lexemeId, skeleton, senses, role, locale }: {
  lexemeId: string
  skeleton: string
  senses: SenseRef[]
  role: string | null
  locale: string
}) {
  const isEditor = role === 'editor' || role === 'admin'
  const [rows, setRows] = useState<Row[] | null>(null)
  const [suggest, setSuggest] = useState<Row[]>([])
  const [shown, setShown] = useState<Record<string, string>>({}) // entry id → imzalı görsel adresi
  const [error, setError] = useState('')

  const applyLinked = useCallback(({ data, error: e }: { data: unknown; error: { code?: string; message?: string } | null }) => {
    if (e) setError(sourceError(e))
    setRows((data as Row[] | null) ?? [])
  }, [])
  const applySuggest = useCallback(({ data }: { data: unknown }) => setSuggest((data as Row[] | null) ?? []), [])

  useEffect(() => { fetchLinked(lexemeId).then(applyLinked) }, [lexemeId, applyLinked])
  useEffect(() => { if (skeleton) fetchSuggested(skeleton).then(applySuggest) }, [skeleton, applySuggest])

  const reload = () => {
    fetchLinked(lexemeId).then(applyLinked)
    if (skeleton) fetchSuggested(skeleton).then(applySuggest)
  }

  async function update(id: string, patch: { lexeme_id?: string | null; sense_id: string | null }) {
    setError('')
    const { error: e, count } = await lexDb().from('dictionary_entry').update(patch, { count: 'exact' }).eq('id', id)
    if (e || !count) { setError(e ? sourceError(e) : 'Değiştirilemedi (yetki yok).'); return }
    reload()
  }

  async function toggleImage(r: Row) {
    if (shown[r.id]) { setShown((s) => { const n = { ...s }; delete n[r.id]; return n }); return }
    const path = r.page?.image_path
    if (!path) return
    const m = await signedPageUrls([path])
    if (m[path]) setShown((s) => ({ ...s, [r.id]: m[path] }))
    else setError('Görsel açılamadı.')
  }

  const item = (r: Row, linked: boolean) => {
    const locked = !isEditor && (r.status === 'reviewed' || r.status === 'published')
    return (
      <div key={r.id} style={{ borderTop: '1px solid var(--color-border)', padding: '0.5rem 0' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: '0.85rem' }}>{r.source_work ? (r.source_work.siglum ?? sourceLabel(r.source_work)) : '—'}</strong>
          <Syr>{r.headword_raw}</Syr>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            {[r.locus, r.page ? `sayfa ${pageLabel(r.page)}` : null].filter(Boolean).join(' · ')}
          </span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <StatusBadge status={r.status} />
            {linked && role && !locked && senses.length > 0 && (
              <select className="input" style={{ width: 200, padding: '0.2rem 0.4rem', fontSize: '0.8rem' }} value={r.sense_id ?? ''}
                onChange={(e) => update(r.id, { sense_id: e.target.value || null })}>
                <option value="">Anlam: — (maddenin tümü)</option>
                {senses.map((s) => <option key={s.id} value={s.id}>Anlam {s.sense_no}{s.label ? ` (${s.label})` : ''}</option>)}
              </select>
            )}
            {linked && !role && r.sense_id && (
              <span style={{ fontSize: '0.78rem' }}>Anlam {senses.find((s) => s.id === r.sense_id)?.sense_no ?? '?'}</span>
            )}
            {r.page?.image_path && (
              <button className="btn btn-sm btn-ghost" onClick={() => toggleImage(r)}>{shown[r.id] ? 'Görseli gizle' : 'Görsel'}</button>
            )}
            {r.source_work && (
              <Link className="btn btn-sm btn-ghost" href={`/${locale}/admin/lex/kaynak/${r.source_work.id}${r.page_id ? `?sayfa=${r.page_id}` : ''}`}>Kaynakta aç</Link>
            )}
            {role && !locked && (linked
              ? <button className="btn btn-sm btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={() => update(r.id, { lexeme_id: null, sense_id: null })}>Bağlantıyı kaldır</button>
              : <button className="btn btn-sm btn-secondary" onClick={() => update(r.id, { lexeme_id: lexemeId, sense_id: senses.length === 1 ? senses[0].id : null })}>Bu maddeye bağla</button>)}
          </span>
        </div>
        {r.entry_text_raw && (
          <div dir="auto" style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', marginTop: '0.2rem', color: 'var(--color-text-muted)' }}>{r.entry_text_raw}</div>
        )}
        {shown[r.id] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown[r.id]} alt={`Sayfa ${r.page ? pageLabel(r.page) : ''}`}
            style={{ maxWidth: '100%', height: 'auto', marginTop: '0.4rem', border: '1px solid var(--color-border)', borderRadius: 4 }} />
        )}
      </div>
    )
  }

  return (
    <section className="card" style={ui.card}>
      <h2 style={{ ...ui.h2, marginBottom: '0.25rem' }}>Sözlüklerde</h2>
      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 0 }}>
        Basılı sözlüklerde bu maddenin karşılığı, aslıyla. Yeni sözlük maddesi eserin ekranından girilir (<Link href={`/${locale}/admin/lex/kaynak`}>Kaynaklar</Link>).
      </p>
      {rows === null ? <p>Yükleniyor…</p> : rows.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>Bağlı sözlük maddesi yok.</p>
      ) : rows.map((r) => item(r, true))}
      {role && suggest.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Aynı yazımlı, henüz bağlanmamış sözlük maddeleri</div>
          {suggest.map((r) => item(r, false))}
        </div>
      )}
      {error && <p style={{ color: 'var(--color-danger)', marginBottom: 0 }}>{error}</p>}
    </section>
  )
}
