'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { searchImages, saveImageToStorage, ImageResult } from '@/lib/services/image'

interface Props {
  query: string
  label?: string
  onSelect: (url: string) => void
  onClose: () => void
}

export default function ImagePicker({ query, label, onSelect, onClose }: Props) {
  const [results, setResults] = useState<ImageResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState('')
  const [saving, setSaving] = useState(false)
  const [searchIndex, setSearchIndex] = useState(0)

  useEffect(() => {
    doSearch(query, searchIndex)
  }, [query, searchIndex])

  async function doSearch(q: string, variation = 0) {
    setLoading(true)
    setError(false)
    setResults([])
    setSelected('')

    const variations = [
      q,
      `${q} object`,
      `${q} item`,
      `${q} close up`,
      `${q} isolated`,
      `${q} high quality`,
    ]

    const finalQuery = variations[variation % variations.length]
    const r = await searchImages(finalQuery)

    setLoading(false)

    if (r.length) {
      setResults(r)
    } else {
      setError(true)
    }
  }

  async function handleConfirm() {
    if (!selected) return

    setSaving(true)

    const url = await saveImageToStorage(
      selected,
      async (blob, path, contentType) => {
        const { createClient } = await import('@/lib/supabase')
        const supabase = createClient()

        const { data, error } = await supabase.storage
          .from('word-media')
          .upload(path, blob, { contentType })

        if (error || !data) return null

        const { data: publicData } = supabase.storage
          .from('word-media')
          .getPublicUrl(data.path)

        return publicData.publicUrl
      }
    )

    setSaving(false)

    if (!url) {
      setError(true)
      return
    }

    onSelect(url)
    onClose()
  }

  return (
    <Overlay onClose={onClose}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          gap: '1rem',
        }}
      >
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
            ✦ Görsel Eşleştirme
          </h3>
          {label && (
            <p
              style={{
                fontSize: '0.78rem',
                color: 'var(--color-text-muted)',
                marginTop: '0.2rem',
              }}
            >
              {label}
            </p>
          )}
        </div>

        <button onClick={onClose} style={CB}>
          ✕
        </button>
      </div>

      <p
        style={{
          fontSize: '0.78rem',
          color: 'var(--color-text-muted)',
          marginBottom: '0.875rem',
        }}
      >
        Wikimedia Commons · Pixabay — seçilen görsel Supabase Storage içine kaydedilir
      </p>

      {loading && <Center>⟳ Görseller yükleniyor...</Center>}

      {error && !loading && (
        <Center>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🖼</div>
          <p style={{ marginBottom: '0.75rem', fontSize: '0.875rem' }}>
            Görsel bulunamadı.
          </p>
          <button
            onClick={() => doSearch(query, searchIndex)}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem' }}
          >
            ↻ Tekrar Dene
          </button>
        </Center>
      )}

      {!loading && !error && results.length > 0 && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.5rem',
              marginBottom: '1rem',
            }}
          >
            {results.map((img, i) => (
              <button
                key={`${img.thumb}-${i}`}
                type="button"
                onClick={() => setSelected(img.thumb)}
                style={{
                  border: '3px solid',
                  borderColor:
                    selected === img.thumb
                      ? 'var(--color-primary)'
                      : 'transparent',
                  borderRadius: 10,
                  overflow: 'hidden',
                  padding: 0,
                  cursor: 'pointer',
                  background: '#f0f0f0',
                }}
              >
                <Image
                  src={img.thumb}
                  alt={`görsel ${i + 1}`}
                  width={160}
                  height={110}
                  unoptimized
                  style={{
                    width: '100%',
                    height: 110,
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </button>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem' }}
              onClick={() => setSearchIndex((prev) => prev + 1)}
            >
              🔄 Farklı Görseller Getir
            </button>
          </div>
        </>
      )}

      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'flex-end',
          paddingTop: '0.5rem',
          borderTop: '1px solid var(--color-border)',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={onClose}
          className="btn btn-ghost"
          style={{ fontSize: '0.875rem' }}
        >
          Görselsiz Devam
        </button>

        <button
          onClick={handleConfirm}
          className="btn btn-primary"
          disabled={!selected || saving}
          style={{ fontSize: '0.875rem' }}
        >
          {saving ? '⟳ Kaydediliyor...' : '✓ Bu Görseli Kaydet'}
        </button>
      </div>
    </Overlay>
  )
}

function Overlay({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 18,
          padding: '1.5rem',
          width: '100%',
          maxWidth: 560,
          boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '2.5rem',
        color: 'var(--color-text-muted)',
      }}
    >
      {children}
    </div>
  )
}

const CB: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '1.2rem',
  cursor: 'pointer',
  color: '#999',
  padding: '0.25rem',
}