'use client'

import { useEffect, useMemo, useState } from 'react'
import { lexDb, explainError, flattenCategories, type Category } from '@/lib/lex'

// Bir anlamın konu kategorileri. Her ekleme/kaldırma hemen yazılır.
// Anlam incelenmiş/yayımlanmışsa yalnız editör değiştirebilir (veritabanı da denetler).
export function SenseCategories({ senseId, categories, locked }: {
  senseId: string
  categories: Category[]
  locked: boolean
}) {
  const [codes, setCodes] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    lexDb().from('sense_category').select('category_code').eq('sense_id', senseId).then(({ data, error: e }) => {
      if (e) setError(explainError(e))
      setCodes((data ?? []).map((r) => r.category_code as string))
    })
  }, [senseId])

  const tree = useMemo(() => flattenCategories(categories), [categories])
  const byCode = useMemo(() => new Map(tree.map((c) => [c.code, c])), [tree])

  async function add(code: string) {
    if (!code || codes?.includes(code)) return
    setBusy(true); setError('')
    const { error: e } = await lexDb().from('sense_category').insert({ sense_id: senseId, category_code: code })
    setBusy(false)
    if (e) { setError(explainError(e)); return }
    setCodes((c) => [...(c ?? []), code])
  }

  async function remove(code: string) {
    setBusy(true); setError('')
    const { error: e, count } = await lexDb().from('sense_category').delete({ count: 'exact' })
      .eq('sense_id', senseId).eq('category_code', code)
    setBusy(false)
    if (e || !count) { setError(e ? explainError(e) : 'Kaldırılamadı (yetki yok).'); return }
    setCodes((c) => (c ?? []).filter((x) => x !== code))
  }

  if (codes === null) return null
  const free = tree.filter((c) => !codes.includes(c.code))

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.6rem', fontSize: '0.8rem' }}>
      <span style={{ color: 'var(--color-text-muted)' }}>Kategoriler:</span>
      {codes.length === 0 && <span style={{ color: 'var(--color-text-subtle)' }}>—</span>}
      {codes.map((code) => (
        <span key={code} style={{ background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: 999, padding: '0.1rem 0.55rem' }}>
          {byCode.get(code)?.path ?? code}
          {!locked && (
            <button type="button" onClick={() => remove(code)} disabled={busy} aria-label="Kaldır"
              style={{ border: 0, background: 'none', cursor: 'pointer', marginLeft: 4, color: 'var(--color-text-muted)' }}>×</button>
          )}
        </span>
      ))}
      {!locked && free.length > 0 && (
        <select className="input" style={{ width: 'auto', minWidth: 160, padding: '0.15rem 0.4rem', fontSize: '0.8rem' }}
          value="" disabled={busy} onChange={(e) => add(e.target.value)}>
          <option value="">+ kategori ekle</option>
          {free.map((c) => <option key={c.code} value={c.code}>{'\u2003'.repeat(c.depth)}{c.name_tr}</option>)}
        </select>
      )}
      {!locked && categories.length === 0 && <span style={{ color: 'var(--color-text-subtle)' }}>(önce Kategoriler ekranında kategori ekleyin)</span>}
      {error && <span style={{ color: 'var(--color-danger)' }}>{error}</span>}
    </div>
  )
}
