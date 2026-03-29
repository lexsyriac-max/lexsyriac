'use client'

import { useEffect, useState } from 'react'
import NavBar from '../NavBar'
import { createClient } from '../../lib/supabase'

export default function StatsPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [totalWords, setTotalWords] = useState(0)
  const [withSyriac, setWithSyriac] = useState(0)
  const [withEnglish, setWithEnglish] = useState(0)
  const [withTransliteration, setWithTransliteration] = useState(0)
  const [withImage, setWithImage] = useState(0)
  const [withAudio, setWithAudio] = useState(0)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    setLoading(true)
    setError('')

    const [
      totalRes,
      syriacRes,
      englishRes,
      translitRes,
      imageRes,
      audioRes,
    ] = await Promise.all([
      supabase.from('words').select('*', { count: 'exact', head: true }),
      supabase
        .from('words')
        .select('*', { count: 'exact', head: true })
        .not('syriac', 'is', null)
        .neq('syriac', ''),
      supabase
        .from('words')
        .select('*', { count: 'exact', head: true })
        .not('english', 'is', null)
        .neq('english', ''),
      supabase
        .from('words')
        .select('*', { count: 'exact', head: true })
        .not('transliteration', 'is', null)
        .neq('transliteration', ''),
      supabase
        .from('words')
        .select('*', { count: 'exact', head: true })
        .not('image_url', 'is', null)
        .neq('image_url', ''),
      supabase
        .from('words')
        .select('*', { count: 'exact', head: true })
        .not('audio_url', 'is', null)
        .neq('audio_url', ''),
    ])

    const anyError =
      totalRes.error ||
      syriacRes.error ||
      englishRes.error ||
      translitRes.error ||
      imageRes.error ||
      audioRes.error

    if (anyError) {
      setError(anyError.message || 'İstatistikler yüklenemedi.')
      setLoading(false)
      return
    }

    setTotalWords(totalRes.count || 0)
    setWithSyriac(syriacRes.count || 0)
    setWithEnglish(englishRes.count || 0)
    setWithTransliteration(translitRes.count || 0)
    setWithImage(imageRes.count || 0)
    setWithAudio(audioRes.count || 0)

    setLoading(false)
  }

  const completionRate = totalWords
    ? Math.round((withSyriac / totalWords) * 100)
    : 0

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
              İstatistikler
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
              Sözlük sisteminin genel görünümü
            </h1>

            <p
              style={{
                color: 'rgba(255,255,255,0.86)',
                fontSize: '0.98rem',
                lineHeight: 1.7,
                maxWidth: 760,
              }}
            >
              Bu bölüm sözlükteki veri yoğunluğunu, alan doluluklarını ve genel
              içerik durumunu özetler. İleride daha gelişmiş istatistik ekranları
              burada yer alacak.
            </p>
          </div>
        </div>

        <div className="container" style={{ padding: '2rem 1.5rem 3rem' }}>
          {error && (
            <div
              style={{
                marginBottom: '1rem',
                background: '#FFF7F7',
                border: '1px solid #E5C7C7',
                color: '#A94442',
                borderRadius: 12,
                padding: '0.875rem 1rem',
                fontSize: '0.9rem',
              }}
            >
              {error}
            </div>
          )}

          {loading ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              Yükleniyor...
            </div>
          ) : (
            <>
              <div
                className="responsive-grid-4"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.25rem',
                }}
              >
                <StatCard label="Toplam Kelime" value={totalWords} color="var(--color-primary)" icon="📚" />
                <StatCard label="Süryanice Alanı Dolu" value={withSyriac} color="#10B981" icon="ܐ" />
                <StatCard label="İngilizce Alanı Dolu" value={withEnglish} color="#8B5CF6" icon="EN" />
                <StatCard label="Transliterasyon Dolu" value={withTransliteration} color="#F59E0B" icon="Aa" />
              </div>

              <div
                className="responsive-grid-3"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.25rem',
                }}
              >
                <StatCard label="Görselli Kelime" value={withImage} color="#0EA5E9" icon="🖼" />
                <StatCard label="Sesli Kelime" value={withAudio} color="#EF4444" icon="🔊" />
                <StatCard label="Süryanice Tamamlanma" value={`${completionRate}%`} color="#14B8A6" icon="✓" />
              </div>

              <div
                className="card"
                style={{
                  padding: '1.25rem',
                  marginBottom: '1.25rem',
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
                  Genel değerlendirme
                </div>

                <div
                  style={{
                    fontSize: '0.94rem',
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.7,
                  }}
                >
                  Sözlük veri yapısı aktif durumda. Kelime alanlarının doluluk oranı zamanla
                  artacak. Görsel, ses ve transliterasyon gibi destek alanları tamamlandıkça
                  öğrenme modülleri daha güçlü çalışacak.
                </div>
              </div>

              <div
                className="card"
                style={{
                  padding: '1.25rem',
                }}
              >
                <div
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--color-text)',
                    marginBottom: '0.75rem',
                  }}
                >
                  Yakında eklenecek detaylar
                </div>

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <InfoRow text="Kelime türüne göre dağılım" />
                  <InfoRow text="Günlük ekleme trendleri" />
                  <InfoRow text="Eksik alan yoğunluğu analizi" />
                  <InfoRow text="Öğrenme ve cümle modülü istatistikleri" />
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string
  value: string | number
  color: string
  icon: string
}) {
  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '0.5rem',
        }}
      >
        <span style={{ fontSize: '1.2rem' }}>{icon}</span>
      </div>

      <div
        style={{
          fontSize: '2rem',
          fontWeight: 700,
          color,
          fontFamily: 'var(--font-display)',
          lineHeight: 1,
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: '0.76rem',
          letterSpacing: '0.05em',
          color: 'var(--color-text-muted)',
          marginTop: '0.45rem',
          fontWeight: 600,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
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