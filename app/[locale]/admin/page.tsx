import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getLocale } from 'next-intl/server'
import Link from 'next/link'

export default async function AdminPage() {
  const locale = await getLocale()
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {},
      },
    }
  )

  const { count: totalWords } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })

  const today = new Date().toISOString().slice(0, 10)

  const { count: todayWords } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today)

  const { count: noImage } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .is('image_url', null)

  const { count: noAudio } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .is('audio_url', null)

  const { count: noSyriac } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .or('syriac.is.null,syriac.eq.')

  const { count: pendingWords } = await supabase
    .from('pending_words')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  const { count: pendingGrammar } = await supabase
    .from('pending_grammar')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  const totalPending = (pendingWords || 0) + (pendingGrammar || 0)
  const eksikCount = (noImage || 0) + (noAudio || 0) + (noSyriac || 0)

  const statCards = [
    {
      label: 'TOPLAM KELİME',
      value: totalWords ?? 0,
      color: 'var(--color-primary)',
      icon: '📖',
      href: `/${locale}/admin/words`,
    },
    {
      label: 'BUGÜN EKLENEN',
      value: todayWords ?? 0,
      color: '#10B981',
      icon: '✨',
      href: `/${locale}/admin/words`,
    },
    {
      label: 'PENDING İÇERİK',
      value: totalPending,
      color: '#8B5CF6',
      icon: '⏳',
      href: `/${locale}/admin/pending`,
    },
    {
      label: 'GÖRSELSİZ',
      value: noImage ?? 0,
      color: '#F97316',
      icon: '🖼',
      href: `/${locale}/admin/words`,
    },
    {
      label: 'SESSİZ',
      value: noAudio ?? 0,
      color: '#06B6D4',
      icon: '🔇',
      href: `/${locale}/admin/words`,
    },
    {
      label: 'EKSİK VERİ',
      value: eksikCount,
      color: '#EF4444',
      icon: '⚠',
      href: `/${locale}/admin/words`,
    },
  ]

  const quickActions = [
    {
      href: `/${locale}/admin/words`,
      label: '+ Kelime Ekle',
      desc: 'Kelime havuzunu düzenle',
      color: 'var(--color-primary)',
    },
    {
      href: `/${locale}/admin/import`,
      label: '⬆ Toplu Yükle',
      desc: 'Excel / CSV / Word içe aktar',
      color: '#10B981',
    },
    {
      href: `/${locale}/admin/grammar`,
      label: '+ Gramer Düzenle',
      desc: 'Kuralları ekle ve güncelle',
      color: '#8B5CF6',
    },
    {
      href: `/${locale}/admin/pending`,
      label: '⏳ Pending Kontrol',
      desc: 'Bekleyen kelime ve kuralları incele',
      color: '#F59E0B',
    },
    {
      href: `/${locale}/admin/lexscan`,
      label: '📄 Dosya Analiz',
      desc: 'Yüklenen dosyalardan kelime / kural çıkar',
      color: '#0EA5E9',
    },
    {
      href: `/${locale}/admin/sentences`,
      label: '✍️ Cümle Motoru',
      desc: 'Sentence Builder ve geri bildirim alanı',
      color: '#14B8A6',
    },
  ]

  const serviceStatus = [
    {
      name: 'Supabase DB',
      status: totalWords !== null ? 'ok' : 'err',
      desc: 'Veritabanı bağlantısı',
    },
    {
      name: 'Claude API',
      status: process.env.ANTHROPIC_API_KEY ? 'ok' : 'err',
      desc: 'Env tanımlı',
    },
    {
      name: 'Sedra API',
      status: 'ok',
      desc: 'Süryanice doğrulama',
    },
    {
      name: 'MyMemory',
      status: 'ok',
      desc: 'TR ↔ EN çeviri',
    },
    {
      name: 'Pixabay',
      status: process.env.PIXABAY_API_KEY ? 'ok' : 'warn',
      desc: 'Görsel servisi',
    },
    {
      name: 'Storage',
      status: 'warn',
      desc: 'Upload testi önerilir',
    },
  ]

  const modules = [
    {
      href: `/${locale}/admin/words`,
      icon: '📖',
      title: 'Kelime Yönetimi',
      desc: `${totalWords ?? 0} kelime · ekle, düzenle, sil`,
    },
    {
      href: `/${locale}/admin/grammar`,
      icon: '📝',
      title: 'Gramer Kuralları',
      desc: 'Dil, kategori ve kuralları yönet',
    },
    {
      href: `/${locale}/admin/pending`,
      icon: '⏳',
      title: 'Pending İçerikler',
      desc: `${totalPending} bekleyen kayıt · onayla veya sil`,
    },
    {
      href: `/${locale}/admin/import`,
      icon: '⬆',
      title: 'İçe Aktar',
      desc: 'Excel, CSV ve belge yükleme akışı',
    },
    {
      href: `/${locale}/admin/lexscan`,
      icon: '📄',
      title: 'LexScan',
      desc: 'Dosya analiz ederek kelime ve kural çıkar',
    },
    {
      href: `/${locale}/admin/sentences`,
      icon: '✍️',
      title: 'Sentence Builder',
      desc: 'Cümle üret, geri bildirim ve kural önerisi kaydet',
    },
    {
      href: `/${locale}/admin/users`,
      icon: '👥',
      title: 'Kullanıcılar',
      desc: 'Rol ve erişim yönetimi',
    },
  ]

  return (
    <main style={{ padding: '2rem 0 4rem' }}>
      <div className="container">
        <div style={{ marginBottom: '2rem' }}>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text)',
            }}
          >
            Dashboard
          </h1>
          <p
            style={{
              color: 'var(--color-text-muted)',
              fontSize: '0.875rem',
              marginTop: '0.25rem',
            }}
          >
            LexSyriac yönetim paneli
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          {statCards.map((s) => (
            <Link key={s.label} href={s.href} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: '1.25rem', cursor: 'pointer' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span style={{ fontSize: '1.4rem' }}>{s.icon}</span>
                </div>
                <div
                  style={{
                    fontSize: '2rem',
                    fontWeight: 700,
                    color: s.color,
                    fontFamily: 'var(--font-display)',
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: '0.68rem',
                    letterSpacing: '0.07em',
                    color: 'var(--color-text-muted)',
                    marginTop: '0.4rem',
                    fontWeight: 600,
                  }}
                >
                  {s.label}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem',
          }}
        >
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: 'var(--color-text-muted)',
                marginBottom: '1rem',
              }}
            >
              Hızlı İşlemler
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {quickActions.map((a) => (
                <Link key={a.href} href={a.href} style={{ textDecoration: 'none' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 0.9rem',
                      borderRadius: 10,
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: a.color,
                        minWidth: 135,
                      }}
                    >
                      {a.label}
                    </span>
                    <span
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {a.desc}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <h2
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: 'var(--color-text-muted)',
                marginBottom: '1rem',
              }}
            >
              Sistem Servisleri
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {serviceStatus.map((s) => (
                <div
                  key={s.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background:
                        s.status === 'ok'
                          ? '#10B981'
                          : s.status === 'warn'
                          ? '#F59E0B'
                          : '#EF4444',
                      flexShrink: 0,
                      display: 'inline-block',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      color: 'var(--color-text)',
                      minWidth: 110,
                    }}
                  >
                    {s.name}
                  </span>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {s.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))',
            gap: '1rem',
            marginTop: '1.5rem',
          }}
        >
          {modules.map((c) => (
            <Link key={c.href} href={c.href} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: '1.25rem', cursor: 'pointer' }}>
                <div style={{ fontSize: '1.75rem', marginBottom: '0.6rem' }}>{c.icon}</div>
                <h3
                  style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    marginBottom: '0.3rem',
                    color: 'var(--color-text)',
                  }}
                >
                  {c.title}
                </h3>
                <p
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.45,
                  }}
                >
                  {c.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}