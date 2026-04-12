'use client'

import { useEffect, useState } from 'react'
import NavBar from '../NavBar'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase'

type SourceDocument = {
  id: string
  title: string
  file_name: string
  file_type: string
  storage_path: string
  status: string
  created_at: string
}

type Chunk = {
  id: string
  content: string
  translation_tr: string | null
  page_number: number
  chunk_index: number
}

type MatchedWord = {
  id: string
  match_text: string
  words: { id: string; turkish: string; syriac: string }
}

export default function ResourcesPage() {
  const locale = useLocale()
  const supabase = createClient()

  const [docs, setDocs] = useState<SourceDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [wordsByDoc, setWordsByDoc] = useState<Record<string, MatchedWord[]>>({})
  const [chunksByDoc, setChunksByDoc] = useState<Record<string, Chunk[]>>({})
  const [wordsLoading, setWordsLoading] = useState<string | null>(null)
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<Record<string, 'original' | 'translation'>>({})

  useEffect(() => { loadDocs() }, [])

  async function loadDocs() {
    setLoading(true)
    const { data, error } = await supabase
      .from('source_documents')
      .select('*')
      .eq('status', 'done')
      .order('created_at', { ascending: false })
    if (!error && data) setDocs(data)
    setLoading(false)
  }

  async function handleExpand(doc: SourceDocument) {
    if (expandedId === doc.id) { setExpandedId(null); return }
    setExpandedId(doc.id)

    // Dosya URL
    if (!fileUrls[doc.id]) {
      const { data } = supabase.storage.from('source-documents').getPublicUrl(doc.storage_path)
      if (data) setFileUrls(prev => ({ ...prev, [doc.id]: data.publicUrl }))
    }

    if (!wordsByDoc[doc.id]) {
      setWordsLoading(doc.id)

      // Kelimeler
      const { data: wData } = await supabase
        .from('source_word_index')
        .select('id, match_text, words ( id, turkish, syriac )')
        .eq('document_id', doc.id)

      if (wData) {
        const unique = wData.filter((item, idx, arr) =>
          arr.findIndex(x => x.match_text === item.match_text) === idx
        )
        setWordsByDoc(prev => ({ ...prev, [doc.id]: unique as unknown as MatchedWord[] }))
      }

      // Chunk'lar + tercümeler
      const { data: cData } = await supabase
        .from('source_text_chunks')
        .select('id, content, translation_tr, page_number, chunk_index')
        .eq('document_id', doc.id)
        .order('chunk_index', { ascending: true })

      if (cData) setChunksByDoc(prev => ({ ...prev, [doc.id]: cData }))

      setWordsLoading(null)
    }
  }

  function getTab(docId: string): 'original' | 'translation' {
    return activeTab[docId] || 'original'
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <NavBar />
      <main>
        <div style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #0F3D47 100%)', padding: '2.75rem 0' }}>
          <div className="container">
            <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.45rem' }}>
              Kaynaklar
            </p>
            <h1 style={{ color: 'white', fontFamily: 'var(--font-display)', fontSize: '2.1rem', fontWeight: 700, marginBottom: '0.65rem' }}>
              Süryanice Kaynak Metinleri
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.86)', fontSize: '0.98rem', lineHeight: 1.7, maxWidth: 760 }}>
              Dini metinler, el yazmaları ve diğer Süryanice kaynaklardan çıkarılan kelimeler sözlükle eşleştirilmiştir.
            </p>
          </div>
        </div>

        <div className="container" style={{ padding: '2rem 1.5rem 4rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {[
              { href: '/rules', label: '📚 Dil Kuralları' },
              { href: '/dictionary', label: '📖 Sözlük' },
              { href: '/learn', label: '🎓 Öğrenme' },
            ].map(item => (
              <Link key={item.href} href={`/${locale}${item.href}`} className="btn btn-secondary btn-sm">{item.label}</Link>
            ))}
          </div>

          {loading ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Yükleniyor...</div>
          ) : docs.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', border: '1px dashed var(--color-border)', background: 'transparent' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📂</div>
              <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>Henüz kaynak eklenmemiş</div>
              <div style={{ fontSize: '0.9rem' }}>Admin panelinden Süryanice metinler yüklenebilir.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {docs.map((doc) => {
                const isExpanded = expandedId === doc.id
                const words = wordsByDoc[doc.id] || []
                const chunks = chunksByDoc[doc.id] || []
                const fileUrl = fileUrls[doc.id]
                const isImage = ['jpg', 'jpeg', 'png'].includes(doc.file_type.toLowerCase())
                const tab = getTab(doc.id)
                const hasTranslation = chunks.some(c => c.translation_tr)

                return (
                  <div key={doc.id} className="card" style={{ overflow: 'hidden' }}>
                    {/* Başlık */}
                    <div style={{ padding: '1.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }} onClick={() => handleExpand(doc)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>{isImage ? '🖼️' : '📄'}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text)' }}>{doc.title}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                            {doc.file_name} · {doc.file_type.toUpperCase()} · {new Date(doc.created_at).toLocaleDateString('tr-TR')}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {wordsByDoc[doc.id] && (
                          <span style={{ background: 'var(--color-primary)', color: 'white', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 20 }}>
                            {wordsByDoc[doc.id].length} kelime
                          </span>
                        )}
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem' }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ borderTop: '1px solid var(--color-border)' }}>

                        {/* Görsel + İndir */}
                        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              Orijinal Dosya
                            </span>
                            {fileUrl && (
                              <a href={fileUrl} download={doc.file_name} className="btn btn-ghost btn-sm" style={{ fontSize: '0.8rem' }} onClick={e => e.stopPropagation()}>
                                ⬇ İndir
                              </a>
                            )}
                          </div>
                          {fileUrl ? (
                            isImage ? (
                              <img src={fileUrl} alt={doc.title} style={{ maxWidth: '100%', maxHeight: 500, borderRadius: 8, border: '1px solid var(--color-border)', display: 'block' }} />
                            ) : (
                              <iframe src={fileUrl} style={{ width: '100%', height: 500, borderRadius: 8, border: '1px solid var(--color-border)' }} title={doc.title} />
                            )
                          ) : (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', background: 'var(--color-bg-subtle, #f8f8f8)', borderRadius: 8 }}>
                              Dosya yükleniyor...
                            </div>
                          )}
                        </div>

                        {/* Metin + Tercüme */}
                        {chunks.length > 0 && (
                          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)' }}>
                            {/* Tab butonları */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                              <button
                                className={`btn btn-sm ${tab === 'original' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setActiveTab(prev => ({ ...prev, [doc.id]: 'original' }))}
                              >
                                📝 Metin
                              </button>
                              {hasTranslation && (
                                <button
                                  className={`btn btn-sm ${tab === 'translation' ? 'btn-primary' : 'btn-ghost'}`}
                                  onClick={() => setActiveTab(prev => ({ ...prev, [doc.id]: 'translation' }))}
                                >
                                  🌐 Tercüme
                                </button>
                              )}
                              {!hasTranslation && (
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', alignSelf: 'center', marginLeft: '0.5rem' }}>
                                  (Tercüme için admin panelinden 🌐 Tercüme Et butonuna tıklayın)
                                </span>
                              )}
                            </div>

                            {/* İki kolon: orijinal + tercüme */}
                            {tab === 'original' && hasTranslation ? (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Süryanice</div>
                                  {chunks.map(c => (
                                    <div key={c.id} style={{ fontSize: '0.9rem', lineHeight: 1.8, marginBottom: '0.75rem', padding: '0.75rem', background: 'var(--color-bg-subtle, #f8f8f8)', borderRadius: 8, direction: 'rtl', fontFamily: 'serif' }}>
                                      {c.content}
                                    </div>
                                  ))}
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Türkçe</div>
                                  {chunks.map(c => (
                                    <div key={c.id} style={{ fontSize: '0.9rem', lineHeight: 1.8, marginBottom: '0.75rem', padding: '0.75rem', background: '#F0F8FA', borderRadius: 8 }}>
                                      {c.translation_tr || <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Tercüme bekleniyor...</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : tab === 'translation' ? (
                              <div style={{ display: 'grid', gap: '0.75rem' }}>
                                {chunks.map(c => (
                                  <div key={c.id} style={{ fontSize: '0.9rem', lineHeight: 1.8, padding: '0.75rem 1rem', background: '#F0F8FA', borderRadius: 8, borderLeft: '3px solid var(--color-primary)' }}>
                                    {c.translation_tr || <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Tercüme bekleniyor...</span>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ display: 'grid', gap: '0.75rem' }}>
                                {chunks.map(c => (
                                  <div key={c.id} style={{ fontSize: '0.9rem', lineHeight: 1.8, padding: '0.75rem 1rem', background: 'var(--color-bg-subtle, #f8f8f8)', borderRadius: 8, direction: 'rtl', fontFamily: 'serif' }}>
                                    {c.content}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Eşleşen kelimeler */}
                        <div style={{ padding: '1.25rem' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
                            Bu Kaynaktan Sözlüğe Eklenen Kelimeler
                          </div>
                          {wordsLoading === doc.id ? (
                            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Kelimeler yükleniyor...</div>
                          ) : words.length === 0 ? (
                            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Henüz eşleşen kelime yok.</div>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                              {words.map((w) => (
                                <Link key={w.id} href={`/${locale}/dictionary/${(w.words as any)?.id || '#'}`}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', background: '#F0F8FA', border: '1px solid var(--color-border)', borderRadius: 20, fontSize: '0.85rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
                                  {w.match_text}
                                  {(w.words as any)?.syriac && (
                                    <span className="text-syriac" style={{ fontSize: '1rem', color: 'var(--color-text)' }}>{(w.words as any).syriac}</span>
                                  )}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
