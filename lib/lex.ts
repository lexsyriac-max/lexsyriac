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
  'id,lemma_skeleton,lemma_west,lemma_east,transliteration,pos,gender,stem_code,variety_code,homonym_no,notes,source_note,status,origin,updated_at,' +
  'root:root_id(id,radicals),sense(id,sense_no,definition,usage_note,status,gloss(id,lang,text,is_primary))'

// Postgres hata kodlarını Türkçe açıklamaya çevir
export function explainError(e: { code?: string; message?: string } | null): string {
  if (!e) return ''
  switch (e.code) {
    case '23505':
      return 'Bu kayıt zaten var (aynı iskelet, tür, eş sesli no ve lehçe).'
    case '23514':
      return 'Yazım kontrolü tutmadı: harekeli yazımın iskeleti madde iskeletiyle aynı olmalı.'
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

export async function myLexRole(): Promise<'admin' | 'editor' | 'contributor' | null> {
  const db = lexDb()
  for (const r of ['admin', 'editor', 'contributor'] as const) {
    const { data } = await db.rpc('has_role', { min_role: r })
    if (data === true) return r
  }
  return null
}
