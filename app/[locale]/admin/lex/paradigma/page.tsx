'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import {
  lexDb, explainError, myLexRole, POS_LABEL,
  PARADIGM_CLASS_SELECT, type ParadigmClass,
} from '@/lib/lex'
import { LexNav, StatusBadge, NoRole, ui } from '../components'

type Row = ParadigmClass & { paradigm_cell: { count: number }[]; lexeme: { count: number }[] }

export default function ParadigmListPage() {
  const locale = useLocale()
  const [role, setRole] = useState<string | null | undefined>(undefined)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [stems, setStems] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    myLexRole().then(setRole)
    const db = lexDb()
    db.from('verb_stem').select('code,name').then(({ data }) =>
      setStems(Object.fromEntries((data ?? []).map((s) => [s.code, s.name]))))
    db.from('paradigm_class')
      .select(PARADIGM_CLASS_SELECT + ',paradigm_cell(count),lexeme(count)')
      .order('pos').order('code')
      .then(({ data, error: e }) => {
        if (e) setError(explainError(e))
        setRows((data as unknown as Row[]) ?? [])
      })
  }, [])

  return (
    <main className="container" style={{ padding: '1.5rem 0 3rem', maxWidth: 960 }}>
      <LexNav locale={locale} role={role ?? null} />
      {role === null && <NoRole />}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Çekim sınıfları</h1>
        {role && (
          <Link href={`/${locale}/admin/lex/paradigma/yeni`} className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }}>
            + Yeni sınıf
          </Link>
        )}
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: 0 }}>
        Çekim motoru dilbilgisini koddan değil, buradaki kalıplardan okur. Kalıpta <code>C1</code>, <code>C2</code>, <code>C3</code>, <code>C4</code> kök harflerinin yerini tutar.
      </p>
      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}
      {rows === null ? <p>Yükleniyor…</p> : rows.length === 0 ? (
        <div className="card" style={ui.card}>Henüz çekim sınıfı yok.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={ui.th}>Kod</th><th style={ui.th}>Ad</th><th style={ui.th}>Tür</th>
                <th style={ui.th}>Fiil kalıbı</th><th style={ui.th}>Kök</th><th style={ui.th}>Kalıp</th>
                <th style={ui.th}>Madde</th><th style={ui.th}>Durum</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={ui.td}>
                    <Link href={`/${locale}/admin/lex/paradigma/${r.id}`}><code>{r.code}</code></Link>
                  </td>
                  <td style={ui.td}>{r.label ?? '—'}</td>
                  <td style={ui.td}>{POS_LABEL[r.pos] ?? r.pos}</td>
                  <td style={ui.td}>{r.stem_code ? stems[r.stem_code] ?? r.stem_code : '—'}</td>
                  <td style={ui.td}>{r.radical_count} harf</td>
                  <td style={ui.td}>{r.paradigm_cell?.[0]?.count ?? 0}</td>
                  <td style={ui.td}>{r.lexeme?.[0]?.count ?? 0}</td>
                  <td style={ui.td}><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
