'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import {
  lexDb, syrSkeleton, isSyriac, safeTerm, explainError, myLexRole,
  LEXEME_SELECT, POS_LABEL, STATUS_LABEL, type LexemeRow, type Status,
} from '@/lib/lex'
import { LexNav, StatusBadge, Syr, NoRole } from './components'

const PAGE = 100

export default function LexListPage() {
  const locale = useLocale()
  const [role, setRole] = useState<string | null | undefined>(undefined)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'' | Status>('')
  const [rows, setRows] = useState<LexemeRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { myLexRole().then(setRole) }, [])

  const search = useCallback(async () => {
    setLoading(true)
    setError('')
    const db = lexDb()
    const term = safeTerm(q)
    let query = db.from('lexeme').select(LEXEME_SELECT).order('updated_at', { ascending: false }).limit(PAGE)
    if (status) query = query.eq('status', status)

    if (term) {
      if (isSyriac(term)) {
        query = query.ilike('lemma_skeleton', `%${syrSkeleton(term)}%`)
      } else {
        // Transliterasyon veya TR/EN/DE karşılıktan ara
        const { data: g, error: ge } = await db.from('gloss').select('sense:sense_id(lexeme_id)').ilike('text', `%${term}%`).limit(200)
        if (ge) { setError(explainError(ge)); setLoading(false); return }
        const ids = Array.from(new Set(
          ((g ?? []) as unknown as { sense: { lexeme_id: string } | null }[])
            .map((x) => x.sense?.lexeme_id).filter(Boolean) as string[],
        ))
        const ors = [`transliteration.ilike.%${term}%`]
        if (ids.length) ors.push(`id.in.(${ids.join(',')})`)
        query = query.or(ors.join(','))
      }
    }
    const { data, error: e } = await query
    if (e) setError(explainError(e))
    setRows((data ?? []) as unknown as LexemeRow[])
    setLoading(false)
  }, [q, status])

  useEffect(() => {
    if (!role) return
    const t = setTimeout(search, 0)
    return () => clearTimeout(t)
  }, [role, status]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="container" style={{ padding: '1.5rem 0 3rem' }}>
      <LexNav locale={locale} role={role ?? null} />
      {role === null && <NoRole />}

      <form
        onSubmit={(e) => { e.preventDefault(); search() }}
        style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}
      >
        <input
          className="input"
          style={{ flex: '1 1 320px' }}
          placeholder="Süryanice (harekeli/harekesiz), transliterasyon veya TR/EN/DE karşılık"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input" style={{ width: 180 }} value={status} onChange={(e) => setStatus(e.target.value as Status | '')}>
          <option value="">Tüm durumlar</option>
          {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Aranıyor…' : 'Ara'}</button>
      </form>

      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}

      <div className="table-wrap card" style={{ padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: 'var(--color-bg-subtle)', textAlign: 'left' }}>
              <th style={th}>Madde</th>
              <th style={th}>Kök</th>
              <th style={th}>Transliterasyon</th>
              <th style={th}>Tür</th>
              <th style={th}>Karşılıklar</th>
              <th style={th}>Durum</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                <td style={td}><Syr>{r.lemma_west || r.lemma_east || r.lemma_skeleton}</Syr></td>
                <td style={td}>{r.root ? <Syr size="1rem">{r.root.radicals}</Syr> : '—'}</td>
                <td style={td}><em>{r.transliteration || '—'}</em></td>
                <td style={td}>{POS_LABEL[r.pos] ?? r.pos}</td>
                <td style={td}>{glossSummary(r)}</td>
                <td style={td}><StatusBadge status={r.status} /></td>
                <td style={td}><Link href={`/${locale}/admin/lex/madde/${r.id}`} className="btn btn-sm btn-secondary">Düzenle</Link></td>
              </tr>
            ))}
            {!loading && rows.length === 0 && role && (
              <tr><td style={{ ...td, color: 'var(--color-text-muted)' }} colSpan={7}>Kayıt yok.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length === PAGE && <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>İlk {PAGE} sonuç gösteriliyor; aramayı daraltın.</p>}
    </main>
  )
}

function glossSummary(r: LexemeRow) {
  const byLang: Record<string, string[]> = {}
  for (const s of [...r.sense].sort((a, b) => a.sense_no - b.sense_no)) {
    for (const g of s.gloss) (byLang[g.lang] ??= []).push(g.text)
  }
  const parts = ['tr', 'en', 'de'].filter((l) => byLang[l]).map((l) => `${l.toUpperCase()}: ${byLang[l].join(', ')}`)
  return parts.length ? <span style={{ fontSize: '0.82rem' }}>{parts.join(' · ')}</span> : '—'
}

const th: React.CSSProperties = { padding: '0.6rem 0.75rem', fontWeight: 600, fontSize: '0.8rem' }
const td: React.CSSProperties = { padding: '0.5rem 0.75rem', verticalAlign: 'middle' }
