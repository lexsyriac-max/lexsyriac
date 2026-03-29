'use client'

import NavBar from '../NavBar'
import Link from 'next/link'
import { useLocale } from 'next-intl'

const resourceCards = [
  {
    title: 'Dil Kuralları',
    desc: 'Gramer, yapı ve kullanım kurallarını inceleyebileceğin temel alan.',
    href: '/rules',
    button: 'Kurallara Git',
  },
  {
    title: 'Sözlük',
    desc: 'Kelime anlamları, transliterasyon ve çok dilli karşılıklar.',
    href: '/dictionary',
    button: 'Sözlüğü Aç',
  },
  {
    title: 'Öğrenme Alanı',
    desc: 'Kelime ve yapı odaklı öğrenme modüllerine geçiş noktası.',
    href: '/learn',
    button: 'Öğrenmeye Git',
  },
]

export default function ResourcesPage() {
  const locale = useLocale()

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
              Kaynaklar
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
              Öğrenme kaynaklarını düzenli biçimde kullan
            </h1>

            <p
              style={{
                color: 'rgba(255,255,255,0.86)',
                fontSize: '0.98rem',
                lineHeight: 1.7,
                maxWidth: 760,
              }}
            >
              Bu bölüm, dil öğrenme sürecinde başvuracağın temel içerikleri tek yerde
              toplamak için hazırlandı. Kurallar, sözlük ve öğrenme modülleri buradan
              düzenli biçimde takip edilebilir.
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
              Bu alan ne için kullanılacak?
            </div>

            <div
              style={{
                fontSize: '0.94rem',
                color: 'var(--color-text-muted)',
                lineHeight: 1.7,
              }}
            >
              Kaynaklar bölümü; ileride PDF notları, açıklayıcı içerikler, gramer özetleri,
              çalışma rehberleri ve yönlendirici öğrenme materyallerinin toplandığı merkez
              haline gelecek. Şu an temel bağlantı noktası olarak çalışır.
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
            {resourceCards.map((card) => (
              <div key={card.title} className="card" style={{ padding: '1.25rem' }}>
                <h2
                  style={{
                    fontSize: '1.1rem',
                    marginBottom: '0.45rem',
                    color: 'var(--color-text)',
                  }}
                >
                  {card.title}
                </h2>

                <p
                  style={{
                    fontSize: '0.9rem',
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.6,
                    marginBottom: '1rem',
                  }}
                >
                  {card.desc}
                </p>

                <Link href={`/${locale}${card.href}`} className="btn btn-secondary">
                  {card.button}
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
              Yakında eklenecek kaynak türleri
            </div>

            <div
              style={{
                display: 'grid',
                gap: '0.75rem',
              }}
            >
              <InfoRow text="Kısa gramer özetleri" />
              <InfoRow text="Kelime tematik listeleri" />
              <InfoRow text="Çalışma rehberleri ve tekrar planları" />
              <InfoRow text="Admin tarafından seçilmiş öğretici içerikler" />
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