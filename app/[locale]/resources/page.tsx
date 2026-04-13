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

type WordAnalysis = {
  token: string
  inDictionary: boolean
  wordId?: string
  turkish?: string
  transliteration?: string
  root?: string
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
  const [analysisData, setAnalysisData] = useState<Record<string, WordAnalysis[]>>({})
  const [analysisLoading, setAnalysisLoading] = useState<string | null>(null)
  const [showAnalysis, setShowAnalysis] = useState<Record<string, boolean>>({})

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

    if (!fileUrls[doc.id]) {
      const { data } = supabase.storage.from('source-documents').getPublicUrl(doc.storage_path)
      if (data) setFileUrls(prev => ({ ...prev, [doc.id]: data.publicUrl }))
    }

    if (wordsByDoc[doc.id] !== undefined) return
    if (true) {
      setWordsLoading(doc.id)

      const { data: swData } = await supabase
        .from('source_word_index')
        .select('id, match_text, word_id')
        .eq('document_id', doc.id)

      if (swData && swData.length > 0) {
        const wordIds = [...new Set(swData.map((x: any) => x.word_id))]
        const { data: wordsData } = await supabase
          .from('words')
          .select('id, turkish, syriac')
          .in('id', wordIds)
        const wordsMap = new Map((wordsData || []).map((w: any) => [w.id, w]))
        const merged: MatchedWord[] = swData
          .filter((item: any, idx: number, arr: any[]) => arr.findIndex((x: any) => x.word_id === item.word_id) === idx)
          .map((item: any) => ({
            id: item.id,
            match_text: item.match_text,
            words: wordsMap.get(item.word_id) as any,
          }))
          .filter((item: any) => item.words)
        setWordsByDoc(prev => ({ ...prev, [doc.id]: merged }))
      } else {
        setWordsByDoc(prev => ({ ...prev, [doc.id]: [] }))
      }

      const { data: cData } = await supabase
        .from('source_text_chunks')
        .select('id, content, translation_tr, page_number, chunk_index')
        .eq('document_id', doc.id)
        .order('chunk_index', { ascending: true })

      if (cData) setChunksByDoc(prev => ({ ...prev, [doc.id]: cData }))

      setWordsLoading(null)
    }
  }

  function tokenize(text: string): string[] {
    return text
      .split(/[\s\u200c\u200d\u060c,\.،؟?!:;\(\)\[\]{}\"\']+/)
      .map(t => t.trim())
      .filter(t => t.length > 0)
  }

  async function handleAnalysis(docId: string) {
    if (analysisData[docId]) {
      setShowAnalysis(prev => ({ ...prev, [docId]: !prev[docId] }))
      return
    }

    setAnalysisLoading(docId)
    setShowAnalysis(prev => ({ ...prev, [docId]: true }))

    const chunks = chunksByDoc[docId] || []
    const allText = chunks.map(c => c.content).join(' ')
    const tokens = [...new Set(tokenize(allText))]

    const { data: wordsData } = await supabase
      .from('words')
      .select('id, syriac, turkish, transliteration, root')
      .not('syriac', 'is', null)

    const wordMap = new Map<string, { id: string; turkish: string; transliteration: string; root: string | null }>()
    if (wordsData) {
      wordsData.forEach(w => {
        if (w.syriac) wordMap.set(w.syriac.trim(), w)
      })
    }

    const analysis: WordAnalysis[] = tokens.map(token => {
      const match = wordMap.get(token)
      if (match) {
        return {
          token,
          inDictionary: true,
          wordId: match.id,
          turkish: match.turkish,
          transliteration: match.transliteration,
          root: match.root ?? undefined,
        }
      }
      return { token, inDictionary: false }
    })

    setAnalysisData(prev => ({ ...prev, [docId]: analysis }))
    setAnalysisLoading(null)
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
                const analysis = analysisData[doc.id] || []
                const isAnalysisVisible = showAnalysis[doc.id]
                const inDict = analysis.filter(a => a.inDictionary)
                const notInDict = analysis.filter(a => !a.inDictionary)

                return (
                  <div key={doc.id} className="card" style={{ overflow: 'hidden' }}>
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

                        {chunks.length > 0 && (
                          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)' }}>
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

                        {chunks.length > 0 && (
                          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                📐 Kelime Kök Analizi
                              </div>
                              <button
                                className="btn btn-sm btn-ghost"
                                onClick={() => handleAnalysis(doc.id)}
                                disabled={analysisLoading === doc.id}
                              >
                                {analysisLoading === doc.id
                                  ? 'Analiz ediliyor...'
                                  : isAnalysisVisible
                                    ? '▲ Gizle'
                                    : '🔍 Analiz Et'}
                              </button>
                            </div>

                            {isAnalysisVisible && analysis.length > 0 && (
                              <div>
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '0.82rem', padding: '0.25rem 0.75rem', borderRadius: 20, background: '#DCFCE7', color: '#166534', fontWeight: 600 }}>
                                    ✓ Sözlükte var: {inDict.length}
                                  </span>
                                  <span style={{ fontSize: '0.82rem', padding: '0.25rem 0.75rem', borderRadius: 20, background: '#FEF9C3', color: '#854D0E', fontWeight: 600 }}>
                                    ✗ Sözlükte yok: {notInDict.length}
                                  </span>
                                </div>

                                {inDict.length > 0 && (
                                  <div style={{ marginBottom: '1.25rem' }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                                      Sözlükte Bulunanlar
                                    </div>
                                    <div style={{ overflowX: 'auto' }}>
                                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
                                        <thead>
                                          <tr style={{ borderBottom: '2px solid #BBF7D0' }}>
                                            <th style={{ textAlign: 'left', padding: '0.4rem 0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Süryanice</th>
                                            <th style={{ textAlign: 'left', padding: '0.4rem 0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Türkçe</th>
                                            <th style={{ textAlign: 'left', padding: '0.4rem 0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Kök</th>
                                            <th style={{ textAlign: 'left', padding: '0.4rem 0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Transliterasyon</th>
                                            <th style={{ padding: '0.4rem 0.75rem' }}></th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {inDict.map((item, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #DCFCE7', background: i % 2 === 0 ? '#F0FDF4' : 'white' }}>
                                              <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'serif', fontSize: '1rem', direction: 'rtl' }}>{item.token}</td>
                                              <td style={{ padding: '0.5rem 0.75rem', color: 'var(--color-text)' }}>{item.turkish}</td>
                                              <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'serif', fontSize: '1rem', direction: 'rtl', color: '#166534' }}>{item.root || '—'}</td>
                                              <td style={{ padding: '0.5rem 0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{item.transliteration || '—'}</td>
                                              <td style={{ padding: '0.5rem 0.75rem' }}>
                                                <Link href={`/${locale}/dictionary/${item.wordId}`} style={{ fontSize: '0.78rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
                                                  Sözlükte Gör →
                                                </Link>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}

                                {notInDict.length > 0 && (
                                  <div>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#854D0E', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                                      Sözlükte Bulunmayanlar
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                      {notInDict.map((item, i) => (
                                        <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.6rem 0.3rem 0.75rem', background: '#FEF9C3', border: '1px solid #FDE047', borderRadius: 20, fontSize: '0.85rem' }}>
                                          <span style={{ fontFamily: 'serif', direction: 'rtl', color: '#854D0E', fontWeight: 600 }}>{item.token}</span>
                                          <Link
                                            href={`/${locale}/admin/words?syriac=${encodeURIComponent(item.token)}`}
                                            style={{ fontSize: '0.75rem', background: '#F59E0B', color: 'white', padding: '0.1rem 0.45rem', borderRadius: 12, textDecoration: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
                                          >
                                            + Ekle
                                          </Link>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

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
                              {[...new Map(words.map(w => [w.match_text, w])).values()].map((w) => (
                                <Link key={w.match_text} href={`/${locale}/dictionary/${(w.words as any)?.id || '#'}`}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', background: '#F0F8FA', border: '1px solid var(--color-border)', borderRadius: 20, fontSize: '0.85rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
                                  <span style={{ fontFamily: 'serif', fontSize: '1rem', direction: 'rtl' }}>{w.match_text}</span>
                                  {(w.words as any)?.turkish && (
                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{(w.words as any).turkish}</span>
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
