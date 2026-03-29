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
        {/* HERO */}
        <div
          style={{
            background: 'linear-gradient(135deg, var(--color-primary) 0%, #0F3D47 100%)',
            padding: '2.75rem 0',
          }}
        >
          <div className="container">
            <p style={sub}>Cümle Alanı</p>

            <h1 style={title}>Cümle yapısını keşfet</h1>

            <p style={desc}>
              Kelimeler ve kurallar arasındaki ilişkiyi görerek temel cümle yapısını
              anlamaya başla. Bu alan ileride etkileşimli cümle kurma ve test
              modülleriyle genişleyecek.
            </p>
          </div>
        </div>

        {/* CONTENT */}
        <div className="container" style={{ padding: '2rem 1.5rem 3rem' }}>
          {/* KULLANIM DURUMU */}
          <div className="card" style={infoCard}>
            <Title text="Kullanım durumu" />

            <p style={infoText}>
              {user
                ? 'Giriş yapmış durumdasın. İleride kurduğun cümleler ve çözdüğün alıştırmalar hesabına kaydedilebilecek.'
                : 'Ziyaretçi olarak bu alanı kullanabilirsin. Ancak ilerleme ve cevap kayıtları yalnızca giriş yapan kullanıcılar için tutulacaktır.'}
            </p>
          </div>

          {/* AMAÇ */}
          <div className="card" style={infoCard}>
            <Title text="Bu alan ne işe yarar?" />

            <p style={infoText}>
              Bu sayfa, kelime + kural + yapı ilişkisini birlikte kavraman için hazırlanıyor.
              Şu an yönlendirme ve temel yapı ekranıdır; ileride aktif cümle kurma ve
              test modülleri burada yer alacaktır.
            </p>
          </div>

          {/* MODÜLLER */}
          <div style={grid}>
            {modules.map((m) => (
              <div key={m.title} className="card" style={card}>
                <h2 style={cardTitle}>{m.title}</h2>

                <p style={cardDesc}>{m.desc}</p>

                <Link href={m.href} className="btn btn-secondary">
                  {m.button}
                </Link>
              </div>
            ))}
          </div>

          {/* YAKINDA */}
          <div className="card" style={{ ...card, marginTop: '1.25rem' }}>
            <Title text="Yakında eklenecek" />

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <Info text="Kelime seçerek cümle oluşturma arayüzü" />
              <Info text="Cümleyi doğru / hatalı değerlendirme sistemi" />
              <Info text="Admin tarafından hazırlanmış cümle egzersizleri" />
              <Info text="Tek cümleden çoklu soru üretimi" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

/* COMPONENTS */

function Title({ text }: { text: string }) {
  return (
    <div
      style={{
        fontSize: '1rem',
        fontWeight: 700,
        color: 'var(--color-text)',
        marginBottom: '0.4rem',
      }}
    >
      {text}
    </div>
  )
}

function Info({ text }: { text: string }) {
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

/* STYLES */

const title: React.CSSProperties = {
  color: 'white',
  fontSize: '2.1rem',
  fontWeight: 700,
  marginBottom: '0.6rem',
}

const desc: React.CSSProperties = {
  color: 'rgba(255,255,255,0.86)',
  fontSize: '0.98rem',
  lineHeight: 1.7,
  maxWidth: 760,
}

const sub: React.CSSProperties = {
  color: 'rgba(255,255,255,0.72)',
  fontSize: '0.82rem',
  textTransform: 'uppercase',
  marginBottom: '0.4rem',
}

const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: '1rem',
}

const card: React.CSSProperties = {
  padding: '1.25rem',
}

const cardTitle: React.CSSProperties = {
  fontSize: '1.1rem',
  marginBottom: '0.45rem',
  color: 'var(--color-text)',
}

const cardDesc: React.CSSProperties = {
  fontSize: '0.9rem',
  color: 'var(--color-text-muted)',
  marginBottom: '1rem',
}

const infoCard: React.CSSProperties = {
  padding: '1.25rem',
  marginBottom: '1.25rem',
  background: 'linear-gradient(135deg, var(--color-primary-light), white)',
  borderColor: 'rgba(26, 95, 110, 0.15)',
}

const infoText: React.CSSProperties = {
  fontSize: '0.94rem',
  color: 'var(--color-text-muted)',
  lineHeight: 1.7,
}