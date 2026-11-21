'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import {
  lexDb, explainError, myLexRole, setLexemeStatus,
  LEXEME_SELECT, POS_LABEL, STATUS_LABEL, LANGS, type LexemeRow, type Status,
} from '@/lib/lex'
import { LexNav, StatusBadge, Syr, NoRole } from '../components'

const QUEUES: Status[] = ['draft', 'ai_suggested', 'reviewed']

export default function LexReviewPage() {
  const locale = useLocale()
  const [role, setRole] = useState<string | null | undefined>(undefined)
  const [queue, setQueue] = useState<Status>('draft')
  const [counts, setCounts] = useState<Partial<Record<Status, number>>>({})
  const [rows, setRows] = useState<LexemeRow[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  const isEditor = role === 'editor' || role === 'admin'

  useEffect(() => { myLexRole().then(setRole) }, [])

  const load = useCallback(async () => {
    const db = lexDb()
    const cs = await Promise.all(QUEUES.map((s) =>
      db.from('lexeme').select('id', { count: 'exact', head: true }).eq('status', s).then((r) => [s, r.count ?? 0] as const)))
    setCounts(Object.fromEntries(cs))
    const { data, error: e } = await db.from('lexeme').select(LEXEME_SELECT).eq('status', queue).order('updated_at', { ascending: true }).limit(50)
    if (e) setError(explainError(e))
    setRows((data ?? []) as unknown as LexemeRow[])
  }, [queue])

  useEffect(() => {
    if (!role) return
    const t = setTimeout(load, 0)
    return () => clearTimeout(t)
  }, [role, load])

  async function act(id: string, s: Status) {
    setBusy(id); setError('')
    const err = await setLexemeStatus(id, s)
    setBusy(null)
    if (err) setError(err)
    else load()
  }

  return (
    <main className="container" style={{ padding: '1.5rem 0 3rem' }}>
      <LexNav locale={locale} role={role ?? null} />
      {role === null && <NoRole />}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {QUEUES.map((s) => (
          <button key={s} className={`btn btn-sm ${queue === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setQueue(s)}>
            {STATUS_LABEL[s]} ({counts[s] ?? '…'})
          </button>
        ))}
      </div>
      {!isEditor && role && (
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Durum değiştirmek için editör rolü gerekir. Kuyruğu görebilirsiniz.</p>
      )}
      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}

      {rows.length === 0 && role && <p style={{ color: 'var(--color-text-muted)' }}>Bu kuyrukta kayıt yok.</p>}

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {rows.map((r) => (
          <article key={r.id} className="card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Syr size="1.7rem">{r.lemma_west || r.lemma_east || r.lemma_skeleton}</Syr>
              {r.lemma_west && r.lemma_east && <Syr size="1.2rem">{r.lemma_east}</Syr>}
              <em>{r.transliteration}</em>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                {POS_LABEL[r.pos] ?? r.pos}{r.root ? ' · kök ' : ''}{r.root && <Syr size="0.95rem">{r.root.radicals}</Syr>}
                {' · '}{r.origin === 'ai' ? 'AI' : r.origin === 'import' ? 'aktarım' : 'insan'}
              </span>
              <StatusBadge status={r.status} />
              <Link href={`/${locale}/admin/lex/madde/${r.id}`} className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }}>Düzenle</Link>
            </div>

            <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', fontSize: '0.9rem' }}>
              {[...r.sense].sort((a, b) => a.sense_no - b.sense_no).map((s) => (
                <li key={s.id}>
                  {LANGS.map((l) => {
                    const g = s.gloss.filter((x) => x.lang === l).map((x) => x.text)
                    return g.length ? <span key={l} style={{ marginRight: '0.75rem' }}><b>{l.toUpperCase()}</b> {g.join(', ')}</span> : null
                  })}
                  {s.definition && <div style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>{s.definition}</div>}
                </li>
              ))}
              {r.sense.length === 0 && <li style={{ color: 'var(--color-danger)' }}>Anlam yok</li>}
            </ol>
            {r.source_note && <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.4rem 0 0' }}>Kaynak: {r.source_note}</p>}

            {isEditor && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                {r.status !== 'reviewed' && <button className="btn btn-sm btn-secondary" disabled={busy === r.id} onClick={() => act(r.id, 'reviewed')}>İncelendi</button>}
                <button className="btn btn-sm btn-accent" disabled={busy === r.id || r.sense.length === 0} onClick={() => act(r.id, 'published')}>Yayımla</button>
                <button className="btn btn-sm btn-ghost" style={{ color: 'var(--color-danger)' }} disabled={busy === r.id} onClick={() => act(r.id, 'rejected')}>Reddet</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </main>
  )
}
