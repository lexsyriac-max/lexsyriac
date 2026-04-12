'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase'

type Group = {
  id: string
  label: string
  icon: string
  color: string
  items: { icon: string; label: string; desc: string; href: string; badge?: string }[]
}

export default function AdminPage() {
  const locale = useLocale()
  const supabase = createClient()
  const [stats, setStats] = useState({ words: 0, pending: 0, sentences: 0, grammar: 0 })
  const [open, setOpen] = useState<Record<string, boolean>>({
    kelime: true, gramer: true, cumle: true, sistem: false
  })

  useEffect(() => {
    async function load() {
      const [w, p, s, g] = await Promise.all([
        supabase.from('words').select('*', { count: 'exact', head: true }),
        supabase.from('pending_words').select('*', { count: 'exact', head: true }),
        supabase.from('sentences').select('*', { count: 'exact', head: true }),
        supabase.from('grammar_rules_v2').select('*', { count: 'exact', head: true }),
      ])
      setStats({ words: w.count || 0, pending: p.count || 0, sentences: s.count || 0, grammar: g.count || 0 })
    }
    load()
  }, [])

  function toggle(id: string) {
    setOpen(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const groups: Group[] = [
    {
      id: 'kelime', label: 'Kelime Yönetimi', icon: '📖', color: '#1B6CA8',
      items: [
        { icon: '📖', label: 'Kelime Listesi', desc: 'Ekle, düzenle, sil · AI tamamla', href: `/${locale}/admin/words` },
        { icon: '⬆', label: 'Toplu Yükle', desc: 'Excel / CSV / Word içe aktar', href: `/${locale}/admin/import` },
        { icon: '🔍', label: 'LexScan', desc: 'Dosyadan kelime çıkar', href: `/${locale}/admin/lexscan` },
        { icon: '⏳', label: 'Pending Kontrol', desc: 'Bekleyen kelime ve kuralları onayla', href: `/${locale}/admin/pending` },
      ]
    },
    {
      id: 'gramer', label: 'Gramer & Çekim', icon: '⚙️', color: '#2D7D46',
      items: [
        { icon: '⚙️', label: 'Grammar Engine', desc: 'Sedra + Claude çekim üretici · CRUD', href: `/${locale}/admin/grammar-engine` },
        { icon: '📋', label: 'Gramer Kuralları', desc: 'Eski kural tablosu (grammar_rules)', href: `/${locale}/admin/grammar` },
        { icon: '✏️', label: 'Kural Editörü', desc: 'Detaylı kural builder (grammar_rules_v2)', href: `/${locale}/admin/rules` },
      ]
    },
    {
      id: 'cumle', label: 'Cümle Sistemi', icon: '💬', color: '#7B3FA0',
      items: [
        { icon: '🔥', label: 'Cümle Motoru', desc: 'grammar_rules_v2 tabanlı cümle üretici + TR/EN', href: `/${locale}/admin/sentences` },
        { icon: '📋', label: 'Cümle Yönetimi', desc: 'Listele, düzenle, çevir', href: `/${locale}/admin/sentence-manage` },
        { icon: '🎓', label: 'Cümle Öğren', desc: 'Kullanıcı öğrenme modülü', href: `/${locale}/learn-sentences` },
      ]
    },
    {
      id: 'sistem', label: 'Sistem & Diğer', icon: '🛠', color: '#B05000',
      items: [
        { icon: '👥', label: 'Kullanıcılar', desc: 'Rol ve erişim yönetimi', href: `/${locale}/admin/users` },
        { icon: '🗂', label: 'Kategoriler', desc: 'Kelime kategorilerini yönet', href: `/${locale}/admin/categories` },
      ]
    },
  ]

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #0F3D47 100%)', padding: '2rem 0' }}>
        <div className="container">
          <h1 style={{ color: 'white', fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700 }}>Admin Paneli</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '0.3rem', fontSize: '0.9rem' }}>LexSyriac yönetim merkezi</p>
        </div>
      </div>

      <div className="container" style={{ padding: '2rem 1.5rem 4rem' }}>
        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Kelime', value: stats.words, icon: '📖', color: '#1B6CA8' },
            { label: 'Cümle', value: stats.sentences, icon: '💬', color: '#7B3FA0' },
            { label: 'Çekim Kuralı', value: stats.grammar, icon: '⚙️', color: '#2D7D46' },
            { label: 'Pending', value: stats.pending, icon: '⏳', color: stats.pending > 0 ? '#C05000' : '#2D7D46' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{s.icon}</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* GROUPS */}
        <div style={{ display: 'grid', gap: '1rem' }}>
          {groups.map(group => (
            <div key={group.id} className="card" style={{ overflow: 'hidden' }}>
              <button onClick={() => toggle(group.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer', borderBottom: open[group.id] ? '1px solid var(--color-border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>{group.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: group.color }}>{group.label}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'var(--color-bg-subtle)', padding: '0.1rem 0.5rem', borderRadius: '999px' }}>{group.items.length} modül</span>
                </div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', transition: 'transform 0.2s', transform: open[group.id] ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}>▼</span>
              </button>

              {open[group.id] && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem', padding: '1rem 1.25rem' }}>
                  {group.items.map(item => (
                    <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                      <div
                        className="admin-card-item"
                        style={{ padding: '1rem', borderRadius: 'var(--radius-md)', border: `1px solid var(--color-border)`, background: 'var(--color-bg-subtle)', cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = group.color; el.style.background = 'white'; el.style.transform = 'translateY(-1px)' }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--color-border)'; el.style.background = 'var(--color-bg-subtle)'; el.style.transform = 'translateY(0)' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                          <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)' }}>{item.label}</span>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* SERVİSLER */}
        <div className="card" style={{ padding: '1.25rem', marginTop: '1rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Sistem Servisleri</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.5rem' }}>
            {[
              { name: 'Supabase DB', status: 'ok', desc: 'Veritabanı' },
              { name: 'Claude API', status: 'ok', desc: 'AI motoru' },
              { name: 'Sedra API', status: 'ok', desc: 'Süryanice' },
              { name: 'MyMemory', status: 'ok', desc: 'TR ↔ EN' },
              { name: 'Pixabay', status: 'ok', desc: 'Görseller' },
              { name: 'Storage', status: 'warn', desc: 'Upload' },
            ].map(s => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-subtle)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.status === 'ok' ? '#2D7D46' : '#C05000', flexShrink: 0, display: 'inline-block' }} />
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text)' }}>{s.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
