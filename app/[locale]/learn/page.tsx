'use client'

import NavBar from '../NavBar'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useAuth } from '../AuthContext'

export default function SentencesPage() {
  const locale = useLocale()
  const { user } = useAuth()

  const modules = [
    {
      title: 'Cümle Kurma',
      desc: 'Kelime havuzundan seçerek temel cümleler oluştur.',
      href: `/${locale}/dictionary`,
      button: 'Sözlüğe Git',
    },
    {
      title: 'Kuralları İncele',
      desc: 'Cümle oluşturmadan önce ilgili dil kurallarını incele.',
      href: `/${locale}/rules`,
      button: 'Kuralları Aç',
    },
    {
      title: 'Öğrenme Alanı',
      desc: 'Kelime ve yapı odaklı öğrenme ekranlarına geç.',
      href: `/${locale}/learn`,
      button: 'Öğrenmeye Geç',
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <NavBar />

      <main>
        <div
          style={{
            background: 'linear-gradient(135deg, var(--color-primary) 0%, #0F3D47 100%)',
            padding: '2.75rem 0',
          }}
        >
          <div className="container">
            <p
              style={{
                color: 'rgba(255,255,255,0.72)',
                fontSize: '0.82rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '0.45rem',
              }}
            >
              Cümle Alanı
            </p>

            <h1
              style={{
                color: 'white',
                fontFamily: 'var(--font-display)',
                fontSize: '2.1rem',
                fontWeight: 700,
                marginBottom: '0.65rem',
              }}
            >
              Cümle yapısını keşfet
            </h1>

            <p
              style={{
                color: 'rgba(255,255,255,0.86)',
                fontSize: '0.98rem',
                lineHeight: 1.7,
                maxWidth: 760,
              }}
            >
              Bu alan, kelimeler ve kurallar arasındaki ilişkiyi görerek temel cümle
              yapısını anlamana yardımcı olur. Daha gelişmiş cümle kurma ve soru modülleri
              ileride burada yer alacak.
            </p>
          </div>
        </div>

        <div className="container" style={{ padding: '2rem 1.5rem 3rem' }}>
          <div
            className="card"
            style={{
              padding: '1.25rem',
              marginBottom: '1.25rem',
              background: 'linear-gradient(135deg, var(--color-primary-light), white)',
              borderColor: 'rgba(26, 95, 110, 0.15)',
            }}
          >
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--color-text)',
                marginBottom: '0.4rem',
              }}
            >
              Kullanım durumu
            </div>

            <div
              style={{
                fontSize: '0.94rem',
                color: 'var(--color-text-muted)',
                lineHeight: 1.7,
              }}
            >
              {user
                ? 'Giriş yapmış durumdasın. İleride kurduğun cümleler ve çözdüğün alıştırmalar hesabına kaydedilebilecek.'
                : 'Ziyaretçi olarak cümle alanını görebilir ve kullanabilirsin. İleride kayıt ve ilerleme takibi yalnızca giriş yapan kullanıcılar için tutulacak.'}
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '1.25rem',
              marginBottom: '1.25rem',
              background: 'linear-gradient(135deg, var(--color-primary-light), white)',
              borderColor: 'rgba(26, 95, 110, 0.15)',
            }}
          >
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--color-text)',
                marginBottom: '0.4rem',
              }}
            >
              Bu sayfa ne için var?
            </div>

            <div
              style={{
                fontSize: '0.94rem',
                color: 'var(--color-text-muted)',
                lineHeight: 1.7,
              }}
            >
              Kullanıcı tarafındaki cümle alanı; kelime, kural ve yapı mantığını
              birlikte anlaman için hazırlanıyor. Şu an bu bölüm yönlendirme ve temel
              hazırlık ekranı olarak çalışır.
            </div>
          </div>

          <div
            className="responsive-grid-3"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1rem',
            }}
          >
            {modules.map((module) => (
              <div key={module.title} className="card" style={{ padding: '1.25rem' }}>
                <h2
                  style={{
                    fontSize: '1.1rem',
                    marginBottom: '0.45rem',
                    color: 'var(--color-text)',
                  }}
                >
                  {module.title}
                </h2>

                <p
                  style={{
                    fontSize: '0.9rem',
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.6,
                    marginBottom: '1rem',
                  }}
                >
                  {module.desc}
                </p>

                <Link href={module.href} className="btn btn-secondary">
                  {module.button}
                </Link>
              </div>
            ))}
          </div>

          <div
            className="card"
            style={{
              marginTop: '1.25rem',
              padding: '1.25rem',
            }}
          >
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--color-text)',
                marginBottom: '0.45rem',
              }}
            >
              Yakında eklenecek
            </div>

            <div
              style={{
                display: 'grid',
                gap: '0.75rem',
              }}
            >
              <InfoRow text="Seçimli temel cümle oluşturma arayüzü" />
              <InfoRow text="Cümleyi doğru / hatalı değerlendirme" />
              <InfoRow text="Admin tarafından hazırlanmış cümle egzersizleri" />
              <InfoRow text="Aynı cümleden çoklu soru üretimi" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function InfoRow({ text }: { text: string }) {
  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        padding: '0.85rem 1rem',
        background: 'var(--color-bg-card)',
        fontSize: '0.92rem',
        color: 'var(--color-text)',
      }}
    >
      {text}
    </div>
  )
}