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
