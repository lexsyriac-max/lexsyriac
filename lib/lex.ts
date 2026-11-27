// LexSyriac · yeni "lex" şeması için ortak yardımcılar
// Demo tablolarından (public.*) bağımsızdır.
import { createClient } from '@/lib/supabase'

export function lexDb() {
  return createClient().schema('lex')
}

// SQL'deki lex.syr_skeleton() ile birebir aynı kural
const SKELETON_RE = /[\u0300-\u036F\u0730-\u074A\u200C\u200D\u0640]/g
export function syrSkeleton(t: string | null | undefined): string {
  return (t ?? '').normalize('NFC').replace(SKELETON_RE, '').trim()
}

export function isSyriac(t: string): boolean {
  return /[\u0700-\u074F]/.test(t)
}

// PostgREST filtre sözdizimini bozabilecek karakterleri at
export function safeTerm(t: string): string {
  return t.replace(/[,()*%\\]/g, ' ').trim()
}

export type Status = 'draft' | 'ai_suggested' | 'reviewed' | 'published' | 'rejected'
export type Lang = 'tr' | 'en' | 'de'
export const LANGS: Lang[] = ['tr', 'en', 'de']

export const STATUS_LABEL: Record<Status, string> = {
  draft: 'Taslak',
  ai_suggested: 'AI önerisi',
  reviewed: 'İncelendi',
  published: 'Yayımlandı',
  rejected: 'Reddedildi',
}

export const STATUS_COLOR: Record<Status, { bg: string; fg: string }> = {
  draft: { bg: '#F2EDE4', fg: '#6B6560' },
  ai_suggested: { bg: '#EEEDFE', fg: '#534AB7' },
  reviewed: { bg: '#E8F4F6', fg: '#1A5F6E' },
  published: { bg: '#E1F5EE', fg: '#0F6E56' },
  rejected: { bg: '#FBEAEA', fg: '#B93A3A' },
}

export const POS_LABEL: Record<string, string> = {
  noun: 'İsim',
  proper_noun: 'Özel isim',
  adjective: 'Sıfat',
  verb: 'Fiil',
  adverb: 'Zarf',
  pronoun: 'Zamir',
  numeral: 'Sayı',
  preposition: 'Edat',
  conjunction: 'Bağlaç',
  particle: 'Edat (parçacık)',
  interjection: 'Ünlem',
}

export const GENDER_LABEL: Record<string, string> = {
  masculine: 'Eril',
  feminine: 'Dişil',
  common: 'Ortak',
}

export type Gloss = { id?: string; lang: Lang; text: string; is_primary: boolean }
export type Sense = {
  id: string
  sense_no: number
  definition: string | null
  usage_note: string | null
  status: Status
  gloss: Gloss[]
}
export type LexemeRow = {
  id: string
  lemma_skeleton: string
  lemma_west: string | null
  lemma_east: string | null
  transliteration: string | null
  pos: string
  gender: string | null
  stem_code: string | null
  paradigm_class_id: string | null
  variety_code: string
  homonym_no: number
  notes: string | null
  source_note: string | null
  status: Status
  origin: string
  updated_at: string
  root: { id: string; radicals: string } | null
  sense: Sense[]
}

export const LEXEME_SELECT =
  'id,lemma_skeleton,lemma_west,lemma_east,transliteration,pos,gender,stem_code,paradigm_class_id,variety_code,homonym_no,notes,source_note,status,origin,updated_at,' +
  'root:root_id(id,radicals),sense(id,sense_no,definition,usage_note,status,gloss(id,lang,text,is_primary))'

// Postgres hata kodlarını Türkçe açıklamaya çevir
export function explainError(e: { code?: string; message?: string } | null): string {
  if (!e) return ''
  switch (e.code) {
    case '23505':
      return 'Bu kayıt zaten var (aynı iskelet, tür, eş sesli no ve lehçe).'
    case '23514':
      // Tetikleyicinin kendi açıklaması varsa onu göster (ör. çekim sınıfı uyuşmazlığı)
      if (e.message && !/violates check constraint/.test(e.message)) return e.message
      return 'Yazım kontrolü tutmadı: harekeli yazımın iskeleti madde iskeletiyle aynı olmalı.'
    case '22023':
    case 'P0002':
      return e.message ?? 'Geçersiz istek'
    case '42501':
      return 'Yetki yok: ' + (e.message ?? '')
    default:
      return e.message ?? 'Bilinmeyen hata'
  }
}

// Madde durumunu değiştir; anlamlar maddeyle aynı duruma çekilir
// (yayımlanmamış anlamın çevirileri dışarıdan görünmediği için).
// Tek işlem: lex.set_lexeme_status — yarım durum değişikliği kalmaz.
export async function setLexemeStatus(lexemeId: string, status: Status): Promise<string> {
  const { error } = await lexDb().rpc('set_lexeme_status', { p_id: lexemeId, p_status: status })
  return error ? explainError(error) : ''
}

export type LexRole = 'admin' | 'editor' | 'contributor'

// Kullanıcının kendi lex.user_role satırı (RLS: herkes yalnız kendi rolünü görür).
export async function myLexRole(): Promise<LexRole | null> {
  const sb = createClient()
  const { data: { session } } = await sb.auth.getSession()
  if (!session) return null
  const { data } = await sb.schema('lex').from('user_role').select('role')
    .eq('user_id', session.user.id).maybeSingle()
  return (data?.role as LexRole | undefined) ?? null
}

// ---------------------------------------------------------------------
// Çekim motoru (004): paradigma sınıfı, kalıp hücresi, form önizleme
// ---------------------------------------------------------------------
export type VerbForm =
  | 'perfect' | 'imperfect' | 'imperative' | 'infinitive' | 'active_participle' | 'passive_participle'
export type Person = 'first' | 'second' | 'third'
export type GramNumber = 'singular' | 'plural'
export type Gender = 'masculine' | 'feminine' | 'common'
export type GramState = 'absolute' | 'construct' | 'emphatic'

export const VERB_FORM_LABEL: Record<VerbForm, string> = {
  perfect: 'Mazi',
  imperfect: 'Muzari',
  imperative: 'Emir',
  infinitive: 'Mastar',
  active_participle: 'Etken ortaç',
  passive_participle: 'Edilgen ortaç',
}
export const PERSON_SHORT: Record<Person, string> = { first: '1', second: '2', third: '3' }
export const NUMBER_SHORT: Record<GramNumber, string> = { singular: 'tek', plural: 'çoğ' }
export const GENDER_SHORT: Record<Gender, string> = { masculine: 'er', feminine: 'diş', common: 'ort' }
export const STATE_LABEL: Record<GramState, string> = { absolute: 'Mutlak', construct: 'İzafet', emphatic: 'Belirli' }

export type CellKey = {
  verb_form: VerbForm | null
  person: Person | null
  number: GramNumber | null
  gender: Gender | null
  state: GramState | null
}
export const cellKey = (c: CellKey) =>
  [c.verb_form, c.person, c.number, c.gender, c.state].map((x) => x ?? '-').join('|')

export function cellLabel(c: CellKey): string {
  const parts: string[] = []
  if (c.verb_form) parts.push(VERB_FORM_LABEL[c.verb_form])
  const png = [c.person && PERSON_SHORT[c.person], c.number && NUMBER_SHORT[c.number], c.gender && GENDER_SHORT[c.gender]]
    .filter(Boolean).join(' ')
  if (png) parts.push(png)
  if (c.state) parts.push(STATE_LABEL[c.state])
  return parts.join(' · ') || '—'
}

// Kalıp tablosunun satır iskeleti (yalnız yapı; kalıplar boş gelir)
const PNG10: [Person, GramNumber, Gender][] = [
  ['third', 'singular', 'masculine'], ['third', 'singular', 'feminine'],
  ['second', 'singular', 'masculine'], ['second', 'singular', 'feminine'],
  ['first', 'singular', 'common'],
  ['third', 'plural', 'masculine'], ['third', 'plural', 'feminine'],
  ['second', 'plural', 'masculine'], ['second', 'plural', 'feminine'],
  ['first', 'plural', 'common'],
]
const NG4: [GramNumber, Gender][] = [
  ['singular', 'masculine'], ['singular', 'feminine'], ['plural', 'masculine'], ['plural', 'feminine'],
]
export function skeletonRows(pos: string): CellKey[] {
  if (pos === 'verb') {
    const rows: CellKey[] = []
    for (const vf of ['perfect', 'imperfect'] as const)
      for (const [p, n, g] of PNG10) rows.push({ verb_form: vf, person: p, number: n, gender: g, state: null })
    for (const [n, g] of NG4) rows.push({ verb_form: 'imperative', person: 'second', number: n, gender: g, state: null })
    rows.push({ verb_form: 'infinitive', person: null, number: null, gender: null, state: null })
    for (const vf of ['active_participle', 'passive_participle'] as const)
      for (const [n, g] of NG4) rows.push({ verb_form: vf, person: null, number: n, gender: g, state: null })
    return rows
  }
  const rows: CellKey[] = []
  for (const n of ['singular', 'plural'] as const)
    for (const st of ['absolute', 'construct', 'emphatic'] as const)
      rows.push({ verb_form: null, person: null, number: n, gender: null, state: st })
  return rows
}

export type ParadigmClass = {
  id: string
  code: string
  label: string | null
  pos: string
  stem_code: string | null
  radical_count: number
  description: string | null
  source_note: string | null
  status: Status
  updated_at: string
}
export const PARADIGM_CLASS_SELECT =
  'id,code,label,pos,stem_code,radical_count,description,source_note,status,updated_at'

export type ParadigmCell = CellKey & {
  id: string
  paradigm_class_id: string
  pattern_skeleton: string
  pattern_west: string | null
  pattern_east: string | null
  notes: string | null
}

export type Match = 'match' | 'differs_vowel' | 'differs' | 'missing' | 'extra' | 'no_pattern'
export type PreviewRow = CellKey & {
  cell_id: string | null
  gen_skeleton: string | null
  gen_west: string | null
  gen_east: string | null
  form_id: string | null
  form_skeleton: string | null
  form_west: string | null
  form_east: string | null
  form_status: Status | null
  form_is_generated: boolean | null
  match: Match
}
export const MATCH_LABEL: Record<Match, { text: string; bg: string; fg: string }> = {
  match: { text: 'Eşleşiyor', bg: '#E1F5EE', fg: '#0F6E56' },
  differs_vowel: { text: 'Hareke farkı', bg: '#FDF3E1', fg: '#8A5A12' },
  differs: { text: 'Farklı', bg: '#FBEAEA', fg: '#B93A3A' },
  missing: { text: 'Eksik', bg: '#EEEDFE', fg: '#534AB7' },
  extra: { text: 'Kalıpta yok', bg: '#F2EDE4', fg: '#6B6560' },
  no_pattern: { text: 'Kalıp uygulanamadı', bg: '#F2EDE4', fg: '#6B6560' },
}

// SQL'deki lex.apply_pattern() ile aynı kural (canlı önizleme için)
export function applyPattern(pattern: string | null | undefined, radicals: string | null | undefined): string | null {
  const r = syrSkeleton(radicals)
  if (!pattern || !r) return null
  const chars = Array.from(r)
  let out = pattern
  for (let i = 1; i <= 4; i++) {
    if (out.includes('C' + i)) {
      if (i > chars.length) return null
      out = out.split('C' + i).join(chars[i - 1])
    }
  }
  if (/C[0-9]/.test(out)) return null
  return out.normalize('NFC')
}

// Kalıpta izin verilen karakterler: Süryanice harf/işaret ve C1..C4
export function patternProblem(p: string): string {
  const skel = syrSkeleton(p)
  if (!skel) return ''
  return /^(?:[\u0710-\u072F\u074D-\u074F]|C[1-4])+$/.test(skel) ? '' : 'Geçersiz karakter (yalnız Süryanice harf ve C1–C4)'
}

// ---------------------------------------------------------------------
// Kategori ağacı ve örnek cümle (005)
// ---------------------------------------------------------------------
export type Category = { code: string; name_tr: string; name_en: string; parent: string | null }
export type CategoryNode = Category & { depth: number; path: string }

// Ağacı derinlik sırasıyla düzleştirir (üst → alt, ada göre). Döngü olsa bile sonlanır.
export function flattenCategories(cats: Category[]): CategoryNode[] {
  const byParent = new Map<string | null, Category[]>()
  const codes = new Set(cats.map((c) => c.code))
  for (const c of cats) {
    const p = c.parent && codes.has(c.parent) ? c.parent : null
    byParent.set(p, [...(byParent.get(p) ?? []), c])
  }
  const out: CategoryNode[] = []
  const seen = new Set<string>()
  const walk = (parent: string | null, depth: number, path: string) => {
    for (const c of (byParent.get(parent) ?? []).sort((a, b) => a.name_tr.localeCompare(b.name_tr, 'tr'))) {
      if (seen.has(c.code)) continue
      seen.add(c.code)
      const p = path ? `${path} › ${c.name_tr}` : c.name_tr
      out.push({ ...c, depth, path: p })
      walk(c.code, depth + 1, p)
    }
  }
  walk(null, 0, '')
  return out
}

// Bir kategorinin kendisi ve bütün alt kategorileri (üst seçiminde döngüyü önlemek için)
export function categoryDescendants(cats: Category[], code: string): Set<string> {
  const out = new Set([code])
  let grew = true
  while (grew) {
    grew = false
    for (const c of cats) if (c.parent && out.has(c.parent) && !out.has(c.code)) { out.add(c.code); grew = true }
  }
  return out
}

export const CATEGORY_CODE_RE = /^[a-z0-9][a-z0-9_-]*$/

export type ExampleRow = {
  id: string
  text_skeleton: string
  text_west: string | null
  text_east: string | null
  transliteration: string | null
  is_constructed: boolean
  source_work_id: string | null
  locus: string | null
  source_note: string | null
  status: Status
  updated_at: string
  example_translation: { lang: Lang; text: string }[]
  example_sense: { sense_id: string }[]
}
export const EXAMPLE_SELECT =
  'id,text_skeleton,text_west,text_east,transliteration,is_constructed,source_work_id,locus,source_note,status,updated_at,' +
  'example_translation(lang,text),example_sense(sense_id)'

// Maddenin anlamlarına bağlı örnekler
export async function fetchExamplesForSenses(senseIds: string[]): Promise<{ rows: ExampleRow[]; error: string }> {
  if (!senseIds.length) return { rows: [], error: '' }
  const db = lexDb()
  const { data: links, error: le } = await db.from('example_sense').select('example_id').in('sense_id', senseIds)
  if (le) return { rows: [], error: explainError(le) }
  const ids = Array.from(new Set((links ?? []).map((l) => l.example_id as string)))
  if (!ids.length) return { rows: [], error: '' }
  const { data, error } = await db.from('example').select(EXAMPLE_SELECT).in('id', ids).order('created_at')
  return { rows: (data ?? []) as unknown as ExampleRow[], error: error ? explainError(error) : '' }
}

export type ExampleDraft = {
  id?: string
  text_west: string
  text_east: string
  transliteration: string
  is_constructed: boolean
  source_work_id: string
  locus: string
  source_note: string
  translations: Record<Lang, string>
  sense_ids: string[]
}

// Tek işlem: örnek + çeviriler + bu maddenin anlamlarıyla bağlantı (lex.save_example)
export async function saveExample(lexemeId: string, d: ExampleDraft): Promise<{ id?: string; error: string }> {
  const w = syrSkeleton(d.text_west), e = syrSkeleton(d.text_east)
  if (!w && !e) return { error: 'Batı veya Doğu harekeli metinden en az biri gerekli.' }
  if (w && e && w !== e) return { error: 'Batı ve Doğu metinlerinin ünsüz iskeleti farklı.' }
  if (!d.sense_ids.length) return { error: 'En az bir anlam seçin.' }
  const { data, error } = await lexDb().rpc('save_example', {
    p: {
      id: d.id ?? null,
      lexeme_id: lexemeId,
      sense_ids: d.sense_ids,
      example: {
        text_skeleton: w || e,
        text_west: d.text_west.trim() || null,
        text_east: d.text_east.trim() || null,
        transliteration: d.transliteration.trim() || null,
        is_constructed: d.is_constructed,
        source_work_id: d.source_work_id || null,
        locus: d.locus.trim() || null,
        source_note: d.source_note.trim() || null,
      },
      translations: d.translations,
    },
  })
  if (error) return { error: explainError(error) }
  return { id: (data as { example_id: string }).example_id, error: '' }
}

// ---------------------------------------------------------------------
// Kaynaklar (006): eser, sayfa görseli, basılı sözlük maddesi
// ---------------------------------------------------------------------
export type SourceKind = 'dictionary' | 'grammar' | 'manuscript' | 'printed_text' | 'corpus' | 'course_material'
export type LicenseKind = 'public_domain' | 'open_license' | 'permission_granted' | 'licensed_restricted' | 'unknown'

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  dictionary: 'Sözlük',
  grammar: 'Dilbilgisi',
  manuscript: 'El yazması',
  printed_text: 'Basılı metin',
  corpus: 'Derlem',
  course_material: 'Ders materyali',
}
export const LICENSE_LABEL: Record<LicenseKind, string> = {
  public_domain: 'Kamu malı',
  open_license: 'Açık lisans',
  permission_granted: 'İzin alındı',
  licensed_restricted: 'Lisanslı (kısıtlı)',
  unknown: 'Bilinmiyor',
}
// Bu lisanslarda yayımlanmış sayfa görseli ziyaretçiye açılır (lex.page_image_public)
export const OPEN_LICENSES: LicenseKind[] = ['public_domain', 'open_license', 'permission_granted']
export const SCRIPT_LABEL: Record<string, string> = {
  estrangelo: 'Estrangelo',
  serto: 'Serto',
  east: 'Doğu (Madnhaya)',
  mixed: 'Karışık',
}
export const SIGLUM_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/

export type SourceWork = {
  id: string
  kind: SourceKind
  siglum: string | null
  title: string
  author: string | null
  editor: string | null
  year_text: string | null
  edition: string | null
  publisher: string | null
  library: string | null
  shelfmark: string | null
  script: string | null
  variety_code: string | null
  license: LicenseKind
  license_note: string | null
  iiif_manifest: string | null
  images_public: boolean
  notes: string | null
  source_note: string | null
  status: Status
  updated_at: string
}
export const SOURCE_SELECT =
  'id,kind,siglum,title,author,editor,year_text,edition,publisher,library,shelfmark,script,variety_code,' +
  'license,license_note,iiif_manifest,images_public,notes,source_note,status,updated_at'

export type PageRow = {
  id: string
  source_work_id: string
  seq: number
  label: string | null
  volume: string | null
  image_path: string | null
  width_px: number | null
  height_px: number | null
  status: Status
}
export const PAGE_SELECT = 'id,source_work_id,seq,label,volume,image_path,width_px,height_px,status'

export type DictEntryRow = {
  id: string
  source_work_id: string
  page_id: string | null
  locus: string | null
  headword_raw: string
  headword_skeleton: string | null
  entry_text_raw: string | null
  lexeme_id: string | null
  sense_id: string | null
  source_note: string | null
  status: Status
  updated_at: string
  lexeme: { id: string; lemma_west: string | null; lemma_east: string | null; lemma_skeleton: string; pos: string } | null
}
export const DICT_ENTRY_SELECT =
  'id,source_work_id,page_id,locus,headword_raw,headword_skeleton,entry_text_raw,lexeme_id,sense_id,source_note,status,updated_at,' +
  'lexeme:lexeme_id(id,lemma_west,lemma_east,lemma_skeleton,pos)'

export const PAGES_BUCKET = 'lex-pages'
export const PAGE_MIME = ['image/jpeg', 'image/png', 'image/webp']
export const PAGE_MAX_BYTES = 25 * 1024 * 1024

// Eser + bütün sayfaları aynı duruma (tek işlem: lex.set_source_status)
export async function setSourceStatus(id: string, status: Status): Promise<string> {
  const { error } = await lexDb().rpc('set_source_status', { p_id: id, p_status: status })
  return error ? explainError(error) : ''
}

// Kova gizli: görseller süreli imzalı adresle açılır (1 saat)
export async function signedPageUrls(paths: string[]): Promise<Record<string, string>> {
  const uniq = Array.from(new Set(paths.filter(Boolean)))
  if (!uniq.length) return {}
  const { data } = await createClient().storage.from(PAGES_BUCKET).createSignedUrls(uniq, 3600)
  const out: Record<string, string> = {}
  for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl
  return out
}

function extOf(f: File): string {
  if (f.type === 'image/png') return 'png'
  if (f.type === 'image/webp') return 'webp'
  return 'jpg'
}

async function imageSize(f: File): Promise<{ w: number | null; h: number | null }> {
  try {
    const b = await createImageBitmap(f)
    const r = { w: b.width, h: b.height }
    b.close()
    return r
  } catch {
    return { w: null, h: null }
  }
}

// Görseli <eser id>/<sayfa id>.<uzantı> yoluna yükler (aynı yol varsa üzerine yazar)
export async function uploadPageImage(workId: string, pageId: string, f: File) {
  if (!PAGE_MIME.includes(f.type)) return { error: `${f.name}: yalnız JPEG, PNG veya WebP` }
  if (f.size > PAGE_MAX_BYTES) return { error: `${f.name}: 25 MB sınırını aşıyor` }
  const path = `${workId}/${pageId}.${extOf(f)}`
  const { error } = await createClient().storage.from(PAGES_BUCKET)
    .upload(path, f, { contentType: f.type, upsert: true, cacheControl: '3600' })
  if (error) return { error: `${f.name}: ${error.message}` }
  const size = await imageSize(f)
  return { path, width: size.w, height: size.h, error: '' }
}

// Yeni sayfa: önce görsel, sonra satır. Sıra çakışırsa bir sonraki sıra denenir.
export async function addPage(workId: string, seq: number, f: File, label: string): Promise<{ page?: PageRow; error: string }> {
  const id = crypto.randomUUID()
  const up = await uploadPageImage(workId, id, f)
  if (up.error) return { error: up.error }
  for (let s = seq; s < seq + 20; s++) {
    const { data, error } = await lexDb().from('page').insert({
      id, source_work_id: workId, seq: s, label: label || null,
      image_path: up.path, width_px: up.width, height_px: up.height,
    }).select(PAGE_SELECT).single()
    if (!error) return { page: data as unknown as PageRow, error: '' }
    if (error.code !== '23505') return { error: `${f.name}: ${explainError(error)}` }
  }
  return { error: `${f.name}: sayfa sırası bulunamadı` }
}

// Dosya adlarını insan sırasıyla diz (s2 < s10)
export function naturalSort(files: File[]): File[] {
  const c = new Intl.Collator('tr', { numeric: true, sensitivity: 'base' })
  return [...files].sort((a, b) => c.compare(a.name, b.name))
}

export function sourceLabel(s: { siglum: string | null; title: string }): string {
  return s.siglum ? `${s.siglum} — ${s.title}` : s.title
}

export function pageLabel(p: { seq: number; label: string | null }): string {
  return p.label ? `${p.seq} · ${p.label}` : `${p.seq}`
}

// Kaynak ekranları için hata açıklaması (kısıt adlarına göre)
export function sourceError(e: { code?: string; message?: string } | null): string {
  if (!e) return ''
  const m = e.message ?? ''
  if (e.code === '23505' && /siglum/.test(m)) return 'Bu kısa ad (siglum) başka bir eserde kullanılıyor.'
  if (e.code === '23505' && /seq/.test(m)) return 'Bu sayfa sırası bu eserde zaten var.'
  if (/siglum_format/.test(m)) return 'Kısa ad harf veya rakamla başlamalı; yalnız harf, rakam, nokta, - ve _ içerebilir (ör. PS, SFERMELE).'
  if (/title_nonblank/.test(m)) return 'Başlık gerekli.'
  if (/headword_nonblank/.test(m)) return 'Başlık kelimesi gerekli.'
  if (/page_seq_positive/.test(m)) return 'Sayfa sırası 1 veya daha büyük olmalı.'
  if (/page_image_in_work/.test(m)) return 'Görsel yolu bu esere ait değil.'
  if (e.code === '23503' && /source_work/.test(m)) return 'Bu esere bağlı örnek cümle var; önce onları başka esere taşıyın veya kaynağını kaldırın.'
  return explainError(e)
}

// ---------------------------------------------------------------------
// Medya (008): ses ve görsel — madde, anlam, form veya örneğe bağlı
// ---------------------------------------------------------------------
export type MediaKind = 'audio' | 'image'
export type MediaTarget = { field: 'lexeme_id' | 'sense_id' | 'word_form_id' | 'example_id'; id: string }
export type MediaRow = {
  id: string
  kind: MediaKind
  storage_path: string
  vocalization: 'west' | 'east' | null
  speaker: string | null
  license: LicenseKind
  credit: string | null
  source_note: string | null
  status: Status
  created_at: string
}
export const MEDIA_SELECT = 'id,kind,storage_path,vocalization,speaker,license,credit,source_note,status,created_at'
export const MEDIA_BUCKET = 'lex-media'
export const MEDIA_MAX_BYTES = 25 * 1024 * 1024
export const VOCALIZATION_LABEL: Record<'west' | 'east', string> = { west: 'Batı okunuşu', east: 'Doğu okunuşu' }

const MEDIA_EXT: Record<string, string> = {
  'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac', 'audio/ogg': 'ogg',
  'audio/webm': 'webm', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/flac': 'flac',
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
}

// Tarayıcının verdiği türü sadeleştir ("audio/webm;codecs=opus" → "audio/webm")
export function baseMime(t: string): string {
  return (t || '').split(';')[0].trim().toLowerCase()
}

export function mediaKindOf(f: Blob): MediaKind | null {
  const m = baseMime(f.type)
  if (!MEDIA_EXT[m]) return null
  return m.startsWith('audio/') ? 'audio' : 'image'
}

export async function fetchMedia(t: MediaTarget): Promise<{ rows: MediaRow[]; error: string }> {
  const { data, error } = await lexDb().from('media').select(MEDIA_SELECT).eq(t.field, t.id).order('created_at')
  return { rows: (data ?? []) as unknown as MediaRow[], error: error ? explainError(error) : '' }
}

// Kova gizli: dosyalar süreli imzalı adresle açılır (1 saat)
export async function signedMediaUrls(paths: string[]): Promise<Record<string, string>> {
  const uniq = Array.from(new Set(paths.filter(Boolean)))
  if (!uniq.length) return {}
  const { data } = await createClient().storage.from(MEDIA_BUCKET).createSignedUrls(uniq, 3600)
  const out: Record<string, string> = {}
  for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl
  return out
}

export type MediaMeta = {
  vocalization: '' | 'west' | 'east'
  speaker: string
  license: LicenseKind
  credit: string
  source_note: string
}

// Önce dosya (<tür>/<id>.<uzantı>), sonra kayıt. Kayıt yazılamazsa dosya kovada
// sahipsiz kalır; admin "Sahipsiz dosyalar" listesinden siler.
export async function addMedia(t: MediaTarget, f: Blob, meta: MediaMeta, name = 'dosya'): Promise<{ row?: MediaRow; error: string }> {
  const mime = baseMime(f.type)
  const kind = mediaKindOf(f)
  if (!kind) return { error: `${name}: desteklenmeyen dosya türü (${mime || 'bilinmiyor'})` }
  if (f.size > MEDIA_MAX_BYTES) return { error: `${name}: 25 MB sınırını aşıyor` }
  const id = crypto.randomUUID()
  const path = `${kind}/${id}.${MEDIA_EXT[mime]}`
  const { error: ue } = await createClient().storage.from(MEDIA_BUCKET)
    .upload(path, f, { contentType: mime, upsert: false, cacheControl: '3600' })
  if (ue) return { error: `${name}: ${ue.message}` }
  const { data, error } = await lexDb().from('media').insert({
    id, kind, storage_path: path, [t.field]: t.id,
    vocalization: kind === 'audio' ? meta.vocalization || null : null,
    speaker: meta.speaker.trim() || null,
    license: meta.license,
    credit: meta.credit.trim() || null,
    source_note: meta.source_note.trim() || null,
  }).select(MEDIA_SELECT).single()
  if (error) return { error: `${name}: ${explainError(error)}` }
  return { row: data as unknown as MediaRow, error: '' }
}

// Admin: önce kayıt, sonra dosya (kayıt silinemezse dosyaya dokunulmaz)
export async function deleteMedia(m: MediaRow): Promise<string> {
  const { error, count } = await lexDb().from('media').delete({ count: 'exact' }).eq('id', m.id)
  if (error || !count) return error ? explainError(error) : 'Silinemedi (yetki yok).'
  const { error: se } = await createClient().storage.from(MEDIA_BUCKET).remove([m.storage_path])
  return se ? `Kayıt silindi, dosya silinemedi: ${se.message}` : ''
}

export type OrphanFile = { bucket: string; name: string; created_at: string }
export async function fetchOrphanFiles(): Promise<{ rows: OrphanFile[]; error: string }> {
  const { data, error } = await lexDb().rpc('orphan_files')
  return { rows: (data ?? []) as OrphanFile[], error: error ? explainError(error) : '' }
}

// ---------------------------------------------------------------------
// Öğrenme editörü (011): ünite → ders → içerik → alıştırma
// ---------------------------------------------------------------------
export type UnitRow = {
  id: string; slug: string; seq: number; level: string | null; title_tr: string; title_en: string | null
  description: string | null; source_note: string | null; status: Status
}
export const UNIT_SELECT = 'id,slug,seq,level,title_tr,title_en,description,source_note,status'
export const UNIT_SLUG_RE = /^[a-z0-9-]+$/

export type LessonRow = {
  id: string; unit_id: string; seq: number; title_tr: string; title_en: string | null
  goal: string | null; intro: string | null; source_note: string | null; status: Status
}
export const LESSON_SELECT = 'id,unit_id,seq,title_tr,title_en,goal,intro,source_note,status'

export type ItemKind = 'sense' | 'word_form' | 'example' | 'paradigm' | 'text'
export const ITEM_KIND_LABEL: Record<ItemKind, string> = {
  sense: 'Kelime (anlam)', word_form: 'Çekimli form', example: 'Örnek cümle', paradigm: 'Çekim tablosu', text: 'Açıklama metni',
}

// lex.lesson_content() çıktısındaki içerik satırı
export type ContentItem = {
  id: string; seq: number; kind: ItemKind; note?: string
  body?: string
  sense_id?: string; lexeme_id?: string; word_form_id?: string; example_id?: string; paradigm_class_id?: string
  skeleton?: string; west?: string; east?: string; transliteration?: string; pos?: string; gender?: string
  lemma?: string; verb_form?: VerbForm; person?: Person; number?: GramNumber; state?: GramState
  meaning?: string; definition?: string; translation?: string; code?: string; label?: string
  published?: boolean
  audio?: { path: string; vocalization: 'west' | 'east' | null }[]
}
export type ExerciseKind =
  'flashcard' | 'multiple_choice' | 'matching' | 'listening' | 'fill_blank' | 'sentence_build' | 'reading'
export type ExerciseConfig = {
  items?: string[]; lang?: Lang
  front?: 'syriac' | 'meaning'
  direction?: 'syr_to_meaning' | 'meaning_to_syr'
  choices?: number; pairs?: number
  blanks?: Record<string, number>
  show_translation?: boolean
}
export type ExerciseRow = {
  id: string; lesson_id: string; seq: number; kind: ExerciseKind; title: string | null
  instructions: string | null; config: ExerciseConfig; source_note: string | null; status: Status
}
export const EXERCISE_SELECT = 'id,lesson_id,seq,kind,title,instructions,config,source_note,status'
export type LessonContent = {
  lesson: LessonRow & { unit: { id: string; slug: string; title_tr: string; level?: string; status: Status } }
  lang: Lang
  items: ContentItem[]
  exercises: (Omit<ExerciseRow, 'lesson_id' | 'source_note'>)[]
}

export const EXERCISE_KIND_LABEL: Record<ExerciseKind, string> = {
  flashcard: 'Kelime kartı', multiple_choice: 'Çoktan seçmeli', matching: 'Eşleştirme', listening: 'Dinleme',
  fill_blank: 'Boşluk doldurma', sentence_build: 'Cümle kurma', reading: 'Okuma',
}
export const EXERCISE_KIND_HELP: Record<ExerciseKind, string> = {
  flashcard: 'Kartın bir yüzünde Süryanice, öbür yüzünde anlam.',
  multiple_choice: 'Bir kelime gösterilir, doğru anlam (veya tersi) seçenekler arasından seçilir.',
  matching: 'Süryanice kelimeler anlamlarıyla eşleştirilir.',
  listening: 'Ses dinlenir, doğru kelime seçilir. Yalnız sesi olan içerik kullanılır.',
  fill_blank: 'Örnek cümlede bir kelime boş bırakılır, seçeneklerden tamamlanır.',
  sentence_build: 'Örnek cümlenin kelimeleri karışık verilir, doğru sıraya dizilir.',
  reading: 'Örnek cümle okunur; çeviri istenirse gösterilir.',
}
// Kelime alıştırmaları anlam/form, cümle alıştırmaları örnek içerikle çalışır (SQL'deki kuralın aynısı)
export const VOCAB_EXERCISES: ExerciseKind[] = ['flashcard', 'multiple_choice', 'matching', 'listening']
export function itemFitsExercise(kind: ExerciseKind, item: { kind: ItemKind }): boolean {
  return VOCAB_EXERCISES.includes(kind)
    ? item.kind === 'sense' || item.kind === 'word_form'
    : item.kind === 'example'
}
// Türün varsayılan ayarı (yeni alıştırma)
export function defaultConfig(kind: ExerciseKind): ExerciseConfig {
  switch (kind) {
    case 'flashcard': return { front: 'syriac', lang: 'tr' }
    case 'multiple_choice': return { direction: 'syr_to_meaning', choices: 4, lang: 'tr' }
    case 'matching': return { direction: 'syr_to_meaning', pairs: 5, lang: 'tr' }
    case 'listening': return { choices: 4, lang: 'tr' }
    case 'fill_blank': return { blanks: {}, choices: 4, lang: 'tr' }
    case 'sentence_build': return { lang: 'tr' }
    case 'reading': return { show_translation: true, lang: 'tr' }
  }
}

export function learningError(e: { code?: string; message?: string } | null): string {
  if (!e) return ''
  if (e.code === '23505') {
    if (/unit_slug_key/.test(e.message ?? '')) return 'Bu kısa adla (slug) bir ünite zaten var.'
    return 'Sıra çakıştı; sayfayı yenileyip tekrar deneyin.'
  }
  if (e.code === '23503' && e.message && !/violates foreign key/.test(e.message)) return e.message
  if (e.code === '23514' && e.message && /yayımlanamaz/.test(e.message)) return e.message
  if (e.code === '23514') return 'Kayıt kuralı tutmadı: ' + (e.message ?? '')
  return explainError(e)
}

// Kardeş kayıtların tamamını yeni sırayla yaz (tek işlem: lex.reorder)
export async function reorder(table: 'unit' | 'lesson' | 'lesson_item' | 'exercise', ids: string[]): Promise<string> {
  const { error } = await lexDb().rpc('reorder', { p_table: table, p_ids: ids })
  return error ? learningError(error) : ''
}
export function moved<T>(list: T[], i: number, d: -1 | 1): T[] {
  const j = i + d
  if (j < 0 || j >= list.length) return list
  const out = list.slice()
  ;[out[i], out[j]] = [out[j], out[i]]
  return out
}
export async function fetchLessonContent(id: string, lang: Lang = 'tr'): Promise<{ content: LessonContent | null; error: string }> {
  const { data, error } = await lexDb().rpc('lesson_content', { p_lesson: id, p_lang: lang })
  return { content: (data as LessonContent | null) ?? null, error: error ? learningError(error) : '' }
}
