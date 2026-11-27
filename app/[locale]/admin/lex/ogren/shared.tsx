'use client'

import { STATUS_LABEL, type Status } from '@/lib/lex'
import { StatusBadge } from '../components'

const STATUSES: Status[] = ['draft', 'reviewed', 'published', 'rejected']

// Durum: katkıcı yalnız görür, editör değiştirir (kural veritabanında da var)
export function StatusControl({ status, canEdit, busy, onChange }: {
  status: Status; canEdit: boolean; busy?: boolean; onChange: (s: Status) => void
}) {
  if (!canEdit) return <StatusBadge status={status} />
  return (
    <select className="input" style={{ width: 'auto', minHeight: 32, padding: '0.15rem 0.5rem', fontSize: '0.8rem' }}
      value={status} disabled={busy} onChange={(e) => onChange(e.target.value as Status)}>
      {STATUSES.concat(STATUSES.includes(status) ? [] : [status]).map((s) => (
        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
      ))}
    </select>
  )
}

export function MoveButtons({ index, count, disabled, onMove }: {
  index: number; count: number; disabled?: boolean; onMove: (d: -1 | 1) => void
}) {
  const s = { padding: '0 0.45rem', minHeight: 28, lineHeight: 1 } as React.CSSProperties
  return (
    <span style={{ display: 'inline-flex', gap: '0.2rem' }}>
      <button className="btn btn-ghost btn-sm" style={s} aria-label="Yukarı" disabled={disabled || index === 0} onClick={() => onMove(-1)}>↑</button>
      <button className="btn btn-ghost btn-sm" style={s} aria-label="Aşağı" disabled={disabled || index === count - 1} onClick={() => onMove(1)}>↓</button>
    </span>
  )
}

export const isEditor = (role: string | null | undefined) => role === 'editor' || role === 'admin'
