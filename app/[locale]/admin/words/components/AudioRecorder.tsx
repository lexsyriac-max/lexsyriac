// components/AudioRecorder.tsx
// Tamamen bağımsız — props: onSave(audioUrl), existingAudio

'use client'

import { useRef, useState } from 'react'
import { uploadToStorage } from '@/lib/services/db'

interface Props {
  existingAudio: string
  onSave: (audioUrl: string) => void
  onChange: (audioUrl: string) => void
}

export default function AudioRecorder({ existingAudio, onSave, onChange }: Props) {
  const [recording, setRecording]     = useState(false)
  const [recordingTime, setTime]      = useState(0)
  const [uploading, setUploading]     = useState(false)
  const [playing, setPlaying]         = useState(false)

  const mediaRef    = useRef<MediaRecorder | null>(null)
  const timerRef    = useRef<NodeJS.Timeout | null>(null)
  const chunksRef   = useRef<Blob[]>([])
  const audioRef    = useRef<HTMLAudioElement | null>(null)

  // ── Kayıt başlat ──────────────────────────────────────────────────────────

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRef.current = mr
      chunksRef.current = []

      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setUploading(true)
        const { data: url, error } = await uploadToStorage(blob, 'audio', 'recording.webm')
        if (url) { onSave(url); onChange(url) }
        if (error) console.error('Audio upload:', error)
        setUploading(false)
      }

      mr.start()
      setRecording(true); setTime(0)
      timerRef.current = setInterval(() => setTime(t => t + 1), 1000)
    } catch {
      alert('Mikrofon erişimi reddedildi. Tarayıcı izinlerini kontrol edin.')
    }
  }

  // ── Kayıt durdur ──────────────────────────────────────────────────────────

  function stopRecording() {
    mediaRef.current?.stop()
    mediaRef.current = null
    if (timerRef.current) clearInterval(timerRef.current)
    setRecording(false); setTime(0)
  }

  // ── Dosya yükle ───────────────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    const { data: url, error } = await uploadToStorage(file, 'audio', file.name)
    if (url) { onSave(url); onChange(url) }
    if (error) console.error('Audio upload:', error)
    setUploading(false)
    e.target.value = ''
  }

  // ── Oynat ─────────────────────────────────────────────────────────────────

  function togglePlay() {
    if (!existingAudio) return
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; setPlaying(false); return }
    const audio = new Audio(existingAudio)
    audioRef.current = audio
    audio.play(); setPlaying(true)
    audio.onended = () => { setPlaying(false); audioRef.current = null }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div>
      <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', flexWrap:'wrap' }}>

        {/* URL input */}
        <input value={existingAudio} onChange={e => onChange(e.target.value)}
          className="input" placeholder="Ses URL (kayıt yapınca otomatik dolar)"
          style={{ flex:1, minWidth:200 }} />

        {/* Oynat */}
        {existingAudio && (
          <button type="button" onClick={togglePlay} className="btn btn-secondary"
            style={{ padding:'0 0.75rem', whiteSpace:'nowrap' }}>
            {playing ? '⏸ Dur' : '▶ Dinle'}
          </button>
        )}

        {/* Mikrofon */}
        {!recording
          ? <button type="button" onClick={startRecording} disabled={uploading}
              className="btn btn-secondary"
              style={{ whiteSpace:'nowrap', color:'#C0392B', borderColor:'#C0392B' }}>
              🎙 Kayıt Başlat
            </button>
          : <button type="button" onClick={stopRecording}
              className="btn btn-secondary"
              style={{ whiteSpace:'nowrap', color:'white', background:'#C0392B', border:'none',
                animation:'pulse 1s infinite' }}>
              ⏹ Durdur {recordingTime}s
            </button>
        }

        {/* Dosya yükle */}
        <label style={{ cursor: uploading ? 'default' : 'pointer', padding:'0.4rem 0.75rem',
          borderRadius:8, border:'1px dashed var(--color-border)',
          fontSize:'0.8rem', color:'var(--color-text-muted)', whiteSpace:'nowrap' }}>
          {uploading ? '⟳ Yükleniyor...' : '📁 Dosya yükle'}
          <input type="file" accept="audio/*" onChange={handleFileChange}
            style={{ display:'none' }} disabled={uploading} />
        </label>
      </div>

      <p style={{ fontSize:'0.7rem', color:'var(--color-text-muted)', marginTop:'0.3rem' }}>
        🎙 Kendi sesinizi kaydedin · MP3/WAV dosyası yükleyin · Supabase Storage&apos;a kaydedilir
      </p>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }`}</style>
    </div>
  )
}
