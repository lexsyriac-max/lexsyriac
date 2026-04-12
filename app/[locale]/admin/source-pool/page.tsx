'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase'

type SourceDocument = {
  id: string
  title: string
  file_name: string
  file_type: string
  storage_path: string
  language: string
  page_count: number
  status: 'pending' | 'processing' | 'done' | 'error'
  created_at: string
}

export default function SourcePoolPage() {
  const locale = useLocale()
  const supabase = createClient()

  const [docs, setDocs] = useState<SourceDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [indexing, setIndexing] = useState<string | null>(null)
  const [ocring, setOcring] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/source-pool')
    const json = await res.json()
    if (json.success) setDocs(json.data || [])
    else setError(json.error)
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  async function handleUpload() {
    if (!file || !title.trim()) {
      setError('Başlık ve dosya gerekli.')
      return
    }

    setUploading(true)
    setError('')
    setMessage('')

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      const allowed = ['pdf', 'jpg', 'jpeg', 'png']
      if (!allowed.includes(ext)) {
        setError('Sadece PDF, JPG, PNG yüklenebilir.')
        setUploading(false)
        return
      }

      const fileName = `${Date.now()}-${file.name}`
      const { error: storageError } = await supabase.storage
        .from('source-documents')
        .upload(fileName, file)

      if (storageError) {
        setError(storageError.message)
        setUploading(false)
        return
      }

      const res = await fetch('/api/source-pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          file_name: file.name,
          file_type: ext,
          storage_path: fileName,
          language: 'unknown',
          page_count: 1,
        }),
      })

      const json = await res.json()
      if (!json.success) {
        setError(json.error)
        setUploading(false)
        return
      }

      setMessage(`✓ "${title}" yüklendi. Şimdi OCR başlatabilirsiniz.`)
      setTitle('')
      setFile(null)
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yükleme başarısız.')
    } finally {
      setUploading(false)
    }
  }

  async function handleOCR(id: string, title: string) {
    setOcring(id)
    setError('')
    setMessage('')

    const res = await fetch('/api/source-pool/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_id: id }),
    })

    const json = await res.json()
    if (json.success) {
      setMessage(`✓ "${title}" OCR tamamlandı — ${json.chunks} chunk, ${json.chars} karakter.`)
      await load()
    } else {
      setError(json.error)
    }

    setOcring(null)
  }

  async function handleIndexWords(id: string) {
    setIndexing(id)
    setError('')
    setMessage('')

    const res = await fetch('/api/source-pool/index-words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_id: id }),
    })

    const json = await res.json()
    if (json.success) {
      const wordList = json.words ? json.words.join(", ") : ""
      setMessage(`✓ ${json.matched} kelime eşleştirildi: ${wordList}`)
      await load()
    } else {
      setError(json.error)
    }

    setIndexing(null)
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" silinsin mi?`)) return

    const res = await fetch(`/api/source-pool/${id}`, { method: 'DELETE' })
    const json = await res.json()

    if (!json.success) {
      setError(json.error)
      return
    }

    setMessage(`✓ "${title}" silindi.`)
    await load()
  }

  const statusLabel: Record<string, string> = {
    pending: '⏳ Bekliyor',
    processing: '⚙️ İşleniyor',
    done: '✅ Tamamlandı',
    error: '❌ Hata',
  }

  const statusColor: Record<string, string> = {
    pending: '#B8860B',
    processing: '#1A5F6E',
    done: '#216A3A',
    error: '#A94442',
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div
        style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, #0F3D47 100%)',
          padding: '2rem 0',
        }}
      >
        <div className="container">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <p
                style={{
                  color: 'rgba(255,255,255,0.65)',
                  fontSize: '0.8rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '0.3rem',
                }}
              >
                Admin Alanı
              </p>
              <h1
                style={{
                  color: 'white',
                  fontFamily: 'var(--font-display)',
                  fontSize: '2rem',
                  fontWeight: 700,
                }}
              >
                Kaynak Havuzu
              </h1>
            </div>
            <Link
              href={`/${locale}/admin`}
              className="btn btn-ghost btn-sm"
              style={{
                color: 'rgba(255,255,255,0.9)',
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            >
              ← Admin Panele Dön
            </Link>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '2rem 1.5rem 4rem' }}>
        {/* Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
            maxWidth: 980,
          }}
        >
          {[
            { label: 'TOPLAM KAYNAK', value: docs.length },
            { label: 'TAMAMLANAN', value: docs.filter((d) => d.status === 'done').length },
            { label: 'BEKLEYEN', value: docs.filter((d) => d.status === 'pending').length },
          ].map((card) => (
            <div key={card.label} className="card" style={{ padding: '1.25rem 1.5rem' }}>
              <div
                style={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {card.value}
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  letterSpacing: '0.08em',
                  color: 'var(--color-text-muted)',
                  marginTop: '0.25rem',
                }}
              >
                {card.label}
              </div>
            </div>
          ))}
        </div>

        {/* Upload button */}
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowForm(!showForm)
              setError('')
              setMessage('')
            }}
          >
            {showForm ? '✕ İptal' : '+ Kaynak Yükle'}
          </button>
        </div>

        {/* Messages */}
        {message && (
          <div
            style={{
              marginBottom: '1rem',
              background: '#EEF8F1',
              border: '1px solid #B7DEC2',
              color: '#216A3A',
              borderRadius: 12,
              padding: '0.875rem 1rem',
              fontSize: '0.9rem',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            {message}
            <button
              onClick={() => setMessage('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#216A3A' }}
            >
              ✕
            </button>
          </div>
        )}

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
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            {error}
            <button
              onClick={() => setError('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A94442' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Upload Form */}
        {showForm && (
          <div
            className="card"
            style={{ padding: '1.5rem', marginBottom: '1.5rem', maxWidth: 600 }}
          >
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.1rem',
                marginBottom: '1rem',
                color: 'var(--color-primary)',
              }}
            >
              Yeni Kaynak Ekle
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  marginBottom: '0.4rem',
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Başlık
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Kaynak adı..."
                style={{
                  width: '100%',
                  padding: '0.6rem 0.875rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontSize: '0.95rem',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  marginBottom: '0.4rem',
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Dosya (PDF, JPG, PNG)
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0',
                  fontSize: '0.9rem',
                  color: 'var(--color-text)',
                }}
              />
              {file && (
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Yükleniyor...' : '↑ Yükle'}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => { setShowForm(false); setTitle(''); setFile(null) }}
              >
                İptal
              </button>
            </div>
          </div>
        )}

        {/* İş Akışı Açıklaması */}
        <div
          style={{
            background: '#F0F8FA',
            border: '1px solid #B0D8E0',
            borderRadius: 12,
            padding: '0.875rem 1rem',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            color: '#1A5F6E',
          }}
        >
          <strong>İş akışı:</strong> Dosya Yükle → 📖 OCR (metin çıkar) → 🔍 Eşleştir (sözlükle karşılaştır)
        </div>

        {/* Documents Table */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Yükleniyor...
          </div>
        ) : docs.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Henüz kaynak yüklenmemiş.
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '2px solid var(--color-border)',
                    background: 'var(--color-bg-subtle, #f8f9fa)',
                  }}
                >
                  {['Başlık', 'Dosya', 'Tür', 'Durum', 'Tarih', 'İşlem'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '0.75rem 1rem',
                        textAlign: 'left',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {docs.map((doc, i) => (
                  <tr
                    key={doc.id}
                    style={{
                      borderBottom: i < docs.length - 1 ? '1px solid var(--color-border)' : 'none',
                    }}
                  >
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{doc.title}</td>
                    <td
                      style={{
                        padding: '0.75rem 1rem',
                        color: 'var(--color-text-muted)',
                        fontSize: '0.8rem',
                        maxWidth: 160,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {doc.file_name}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          background: 'var(--color-bg-subtle, #f0f0f0)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                        }}
                      >
                        {doc.file_type}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          color: statusColor[doc.status] || '#666',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                        }}
                      >
                        {statusLabel[doc.status] || doc.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                      {new Date(doc.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleOCR(doc.id, doc.title)}
                          disabled={ocring === doc.id || indexing === doc.id}
                          style={{ fontSize: '0.75rem' }}
                        >
                          {ocring === doc.id ? '⚙️ OCR...' : '📖 OCR'}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleIndexWords(doc.id)}
                          disabled={ocring === doc.id || indexing === doc.id}
                          style={{ fontSize: '0.75rem' }}
                        >
                          {indexing === doc.id ? '⚙️ Eşleştiriliyor...' : '🔍 Eşleştir'}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDelete(doc.id, doc.title)}
                          style={{ fontSize: '0.75rem', color: '#A94442' }}
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
