'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Word } from '@/lib/types/words'

interface Props {
  word: Word
  mode: 'detail' | 'edit'
  onClose: () => void
  onSave: (updated: Word) => Promise<void>
  onModeChange: (mode: 'detail' | 'edit') => void
}

export default function WordModal({ word, onClose }: Props) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  function togglePlay(url: string) {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setPlaying(false)
      return
    }

    const audio = new Audio(url)
    audioRef.current = audio
    audio.play()
    setPlaying(true)

    audio.onended = () => {
      setPlaying(false)
      audioRef.current = null
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h3
            style={{
              fontSize: '1.4rem',
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              margin: 0,
            }}
          >
            {word.turkish}
          </h3>

          <span
            style={{
              fontSize: '0.78rem',
              padding: '0.2rem 0.5rem',
              borderRadius: 20,
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)',
              marginTop: '0.3rem',
              display: 'inline-block',
            }}
          >
            {word.word_type}
          </span>
        </div>

        <button onClick={onClose} style={CB}>
          ✕
        </button>
      </div>

      <DetailView word={word} playing={playing} onPlay={togglePlay} />

      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          marginTop: '1.5rem',
          justifyContent: 'flex-end',
        }}
      >
        <button onClick={onClose} className="btn btn-ghost">
          Kapat
        </button>
      </div>
    </Overlay>
  )
}

function DetailView({
  word,
  playing,
  onPlay,
}: {
  word: Word
  playing: boolean
  onPlay: (url: string) => void
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1.5rem',
      }}
    >
      <div>
        {[
          ['İngilizce', word.english, {}],
          [
            'Süryanice',
            word.syriac,
            { direction: 'rtl', fontFamily: 'serif', fontSize: '1.5rem' },
          ],
          ['Transliterasyon', word.transliteration, {}],
          ['Eklenme Tarihi', new Date(word.created_at).toLocaleDateString('tr-TR'), {}],
        ].map(([label, value, style]) => (
          <div key={label as string} style={{ marginBottom: '1rem' }}>
            <p style={DLL}>{label as string}</p>
            <p style={{ ...DLV, ...(style as object) }}>{(value as string) || '—'}</p>
          </div>
        ))}

        <div style={{ marginBottom: '1rem' }}>
          <p style={DLL}>Görsel Durumu</p>
          <p style={DLV}>{word.image_url ? 'Var' : 'Yok'}</p>
        </div>

        <div>
          <p style={DLL}>Ses Kaydı</p>
          {word.audio_url ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginTop: '0.4rem',
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>🔊</span>
              <button
                onClick={() => onPlay(word.audio_url!)}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem' }}
              >
                {playing ? '⏸ Durdur' : '▶ Dinle'}
              </button>
            </div>
          ) : (
            <p style={{ ...DLV, color: 'var(--color-text-muted)' }}>Ses kaydı yok</p>
          )}
        </div>
      </div>

      <div>
        {word.image_url ? (
          <div
            style={{
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid var(--color-border)',
            }}
          >
            <Image
              src={word.image_url}
              alt={word.turkish}
              width={280}
              height={220}
              unoptimized
              style={{
                width: '100%',
                height: 220,
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>
        ) : (
          <div
            style={{
              borderRadius: 12,
              border: '1px dashed var(--color-border)',
              height: 220,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-muted)',
              fontSize: '0.85rem',
            }}
          >
            Görsel yok
          </div>
        )}
      </div>
    </div>
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
          maxWidth: 660,
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

const CB: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '1.2rem',
  cursor: 'pointer',
  color: '#999',
  padding: '0.25rem',
}

const DLL: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)',
  marginBottom: '0.25rem',
  margin: 0,
}

const DLV: React.CSSProperties = {
  fontSize: '0.95rem',
  color: 'var(--color-text)',
  fontWeight: 500,
  margin: 0,
}