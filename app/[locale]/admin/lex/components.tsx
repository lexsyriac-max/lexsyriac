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
