'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { STATUS_COLOR, STATUS_LABEL, type Status } from '@/lib/lex'

export function StatusBadge({ status }: { status: Status }) {
  const c = STATUS_COLOR[status]
  return (
    <span
      style={{
        background: c.bg,
        color: c.fg,
        padding: '0.15rem 0.55rem',
        borderRadius: 999,
        fontSize: '0.75rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

export function Syr({ children, size = '1.35rem' }: { children: React.ReactNode; size?: string }) {
  return (
    <span dir="rtl" lang="syr" style={{ fontSize: size, lineHeight: 1.7, unicodeBidi: 'isolate' }}>
      {children}
    </span>
  )
}

export function LexNav({ locale, role }: { locale: string; role: string | null }) {
  const pathname = usePathname()
  const items = [
    { href: `/${locale}/admin/lex`, label: 'Maddeler', exact: true },
    { href: `/${locale}/admin/lex/madde/yeni`, label: '+ Yeni madde' },
    { href: `/${locale}/admin/lex/inceleme`, label: 'İnceleme kuyruğu' },
    { href: `/${locale}/admin/lex/paradigma`, label: 'Çekim sınıfları' },
    ...(role === 'admin' ? [{ href: `/${locale}/admin/lex/ekip`, label: 'Ekip' }] : []),
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
      <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginRight: '0.75rem' }}>
        Lex <span style={{ color: 'var(--color-text-subtle)', fontSize: '0.9rem', fontWeight: 400 }}>yeni sözlük çekirdeği</span>
      </strong>
      {items.map((it) => {
        const active = it.exact ? pathname === it.href : pathname.startsWith(it.href)
        return (
          <Link key={it.href} href={it.href} className={`btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}`}>
            {it.label}
          </Link>
        )
      })}
      <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
        Lex rolü: <strong>{role ?? 'yok'}</strong>
      </span>
    </div>
  )
}

export function NoRole() {
  return (
    <div className="card" style={{ padding: '1.25rem', borderColor: 'var(--color-danger)' }}>
      Bu hesabın <code>lex.user_role</code> tablosunda rolü yok. Taslak kayıtları göremez ve yazamazsınız.
    </div>
  )
}

export function MatchBadge({ text, bg, fg }: { text: string; bg: string; fg: string }) {
  return (
    <span style={{ background: bg, color: fg, padding: '0.1rem 0.5rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {text}
    </span>
  )
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
      {label}
      {children}
    </label>
  )
}

export const ui = {
  card: { padding: '1.25rem', marginBottom: '1rem' } as React.CSSProperties,
  h2: { fontSize: '1.1rem', marginTop: 0 } as React.CSSProperties,
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' } as React.CSSProperties,
  syrInput: { fontSize: '1.3rem', textAlign: 'right', minHeight: 44 } as React.CSSProperties,
  th: { textAlign: 'left', padding: '0.4rem 0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' } as React.CSSProperties,
  td: { padding: '0.35rem 0.5rem', borderBottom: '1px solid var(--color-border)', verticalAlign: 'middle' } as React.CSSProperties,
}
