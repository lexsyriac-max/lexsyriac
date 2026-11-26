'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import {
  lexDb, myLexRole, sourceError, setSourceStatus, sourceLabel, SOURCE_KIND_LABEL,
  SOURCE_SELECT, PAGE_SELECT, PAGES_BUCKET, type SourceWork, type PageRow, type Status,
} from '@/lib/lex'
import { createClient } from '@/lib/supabase'
import { LexNav, NoRole, StatusBadge } from '../../components'
import { SourceForm } from './SourceForm'
import { PageList, PageViewer } from './Pages'
import { Entries } from './Entries'

function fetchPages(id: string) {
  return lexDb().from('page').select(PAGE_SELECT).eq('source_work_id', id).order('seq')
}

export default function SourcePage() {
  return (
    <Suspense fallback={<main className="container" style={{ padding: '1.5rem 0' }}>Yükleniyor…</main>}>
      <SourceDetail />
    </Suspense>
  )
}

function SourceDetail() {
  const locale = useLocale()
  const router = useRouter()
  const search = useSearchParams()
  const { id } = useParams<{ id: string }>()
  const [role, setRole] = useState<string | null | undefined>(undefined)
  const [source, setSource] = useState<SourceWork | null | undefined>(undefined)
  const [pages, setPages] = useState<PageRow[]>([])
  const [varieties, setVarieties] = useState<{ code: string; name_tr: string }[]>([])
  const [selected, setSelected] = useState<string | null>(search.get('sayfa'))
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)

  const applyPages = useCallback(({ data, error: e }: { data: unknown; error: { code?: string; message?: string } | null }) => {
    if (e) setError(sourceError(e))
    setPages((data as PageRow[] | null) ?? [])
  }, [])

  useEffect(() => {
    myLexRole().then(setRole)
    lexDb().from('variety').select('code,name_tr').order('code').then(({ data }) => setVarieties(data ?? []))
  }, [])

  useEffect(() => {
    lexDb().from('source_work').select(SOURCE_SELECT).eq('id', id).maybeSingle().then(({ data, error: e }) => {
      if (e) setError(sourceError(e))
      setSource((data as unknown as SourceWork | null) ?? null)
    })
    fetchPages(id).then(applyPages)
  }, [id, applyPages])

  const reloadPages = () => fetchPages(id).then(applyPages)

  // Seçimi adres çubuğuna yaz (madde ekranından gelen bağlantı ve yenileme için)
  function select(pageId: string | null) {
    setSelected(pageId)
    const u = new URL(window.location.href)
    if (pageId) u.searchParams.set('sayfa', pageId); else u.searchParams.delete('sayfa')
    window.history.replaceState(null, '', u.toString())
  }

  const isEditor = role === 'editor' || role === 'admin'
  const locked = !!source && !isEditor && (source.status === 'reviewed' || source.status === 'published')
  const page = pages.find((p) => p.id === selected) ?? null

  async function changeStatus(s: Status) {
    if (!source) return
    setError(''); setMsg('')
    const err = await setSourceStatus(source.id, s)
    if (err) { setError(err); return }
    setSource({ ...source, status: s }); setMsg('Eser ve sayfaları: ' + ({ draft: 'taslak', reviewed: 'incelendi', published: 'yayımlandı', rejected: 'reddedildi', ai_suggested: 'AI önerisi' } as const)[s])
    reloadPages()
  }

  async function remove() {
    if (!source) return
    if (!confirmDel) { setConfirmDel(true); return }
    setError('')
    const paths = pages.map((p) => p.image_path).filter(Boolean) as string[]
    const { error: e, count } = await lexDb().from('source_work').delete({ count: 'exact' }).eq('id', source.id)
    if (e || !count) { setError(e ? sourceError(e) : 'Silinemedi (yetki yok).'); setConfirmDel(false); return }
    if (paths.length) await createClient().storage.from(PAGES_BUCKET).remove(paths)
    router.replace(`/${locale}/admin/lex/kaynak`)
  }

  return (
    <main className="container" style={{ padding: '1.5rem 0 3rem' }}>
      <LexNav locale={locale} role={role ?? null} />
      {role === null && <NoRole />}
      {source === undefined ? <p>Yükleniyor…</p> : source === null ? (
        <p>Eser bulunamadı. <Link href={`/${locale}/admin/lex/kaynak`}>Kaynaklara dön</Link></p>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <Link href={`/${locale}/admin/lex/kaynak`} className="btn btn-sm btn-ghost">‹ Kaynaklar</Link>
            <h1 style={{ margin: 0, fontSize: '1.4rem' }}>{sourceLabel(source)}</h1>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{SOURCE_KIND_LABEL[source.kind]}</span>
            <StatusBadge status={source.status} />
            <span style={{ marginLeft: 'auto', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {isEditor && source.status !== 'reviewed' && <button className="btn btn-sm btn-secondary" onClick={() => changeStatus('reviewed')}>İncelendi</button>}
              {isEditor && <button className="btn btn-sm btn-accent" onClick={() => changeStatus('published')}>{source.status === 'published' ? 'Yeni sayfaları da yayımla' : 'Yayımla'}</button>}
              {isEditor && source.status !== 'draft' && <button className="btn btn-sm btn-ghost" onClick={() => changeStatus('draft')}>Taslağa al</button>}
              {role === 'admin' && (
                <button className="btn btn-sm btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={remove} onBlur={() => setConfirmDel(false)}>
                  {confirmDel ? `Emin misiniz? ${pages.length} sayfa ve bütün sözlük maddeleri silinir` : 'Eseri sil'}
                </button>
              )}
            </span>
          </div>
          {isEditor && (
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 0 }}>
              Durum düğmeleri eseri ve bütün sayfalarını birlikte değiştirir. Sözlük maddelerinin durumu ayrıdır.
            </p>
          )}
          {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}
          {msg && <p style={{ color: 'var(--color-success)' }}>{msg}</p>}
          {locked && (
            <p className="card" style={{ padding: '0.75rem 1rem', background: 'var(--color-accent-light)' }}>
              Bu eser {source.status === 'published' ? 'yayımlanmış' : 'incelenmiş'}; eser bilgisini ve sayfalarını yalnız editör değiştirebilir. Yeni sayfa ve sözlük maddesi eklenebilir.
            </p>
          )}

          <SourceForm key={source.id} source={source} varieties={varieties} locked={locked || !role} onSaved={setSource} />
          <PageList workId={source.id} pages={pages} role={role ?? null} selectedId={selected} onSelect={select} onChanged={reloadPages} />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start' }}>
            {page && (
              <div style={{ flex: '3 1 480px', minWidth: 0 }}>
                <PageViewer page={page} pages={pages} role={role ?? null}
                  locked={!isEditor && (page.status === 'reviewed' || page.status === 'published')}
                  onSelect={select}
                  onChanged={(p) => (p ? setPages((ps) => ps.map((x) => (x.id === p.id ? p : x)).sort((a, b) => a.seq - b.seq)) : reloadPages())} />
              </div>
            )}
            <div style={{ flex: '2 1 380px', minWidth: 0 }}>
              <Entries workId={source.id} pages={pages} pageId={page?.id ?? null} role={role ?? null} locale={locale} />
            </div>
          </div>
        </>
      )}
    </main>
  )
}
