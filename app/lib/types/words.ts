// lib/types/words.ts
// Tüm kelime yönetimi tipleri burada — tek kaynak

export interface Word {
  id: string
  turkish: string
  english: string
  syriac: string
  transliteration: string
  word_type: string
  practice_group?: string | null
  image_url: string | null
  audio_url: string | null
  created_at: string
  created_by?: string | null
}

export const TYPE_OPTIONS = [
  { value: 'isim', label: 'İsim (Noun)' },
  { value: 'fiil', label: 'Fiil (Verb)' },
  { value: 'sıfat', label: 'Sıfat (Adjective)' },
  { value: 'zarf', label: 'Zarf (Adverb)' },
  { value: 'zamir', label: 'Zamir (Pronoun)' },
  { value: 'edat', label: 'Edat (Preposition)' },
  { value: 'bağlaç', label: 'Bağlaç (Conjunction)' },
  { value: 'ünlem', label: 'Ünlem (Interjection)' },
  { value: 'deyim', label: 'Deyim (Idiom)' },
  { value: 'birleşik', label: 'Birleşik (Compound)' },
  { value: 'soru', label: 'Soru (Question)' },
  { value: 'diğer', label: 'Diğer (Other)' },
] as const

export const VALID_TYPES = TYPE_OPTIONS.map((t) => t.value)

export const EKSIK_OPTIONS = [
  { value: 'eksik_sy', label: '⚠ Süryanice eksik' },
  { value: 'eksik_tr', label: '⚠ Türkçe eksik' },
  { value: 'eksik_en', label: '⚠ İngilizce eksik' },
  { value: 'eksik_img', label: '⚠ Görsel eksik' },
  { value: 'eksik_audio', label: '⚠ Ses eksik' },
  { value: 'eksik_trans', label: '⚠ Transliterasyon eksik' },
] as const

export const SPECIAL_CHARS = [
  { char: 'ʾ', label: 'Alef' },
  { char: '˕', label: 'Ayn' },
  { char: 'ḥ', label: 'Het' },
  { char: 'ṭ', label: 'Tet' },
  { char: 'ṣ', label: 'Tsade' },
  { char: 'š', label: 'Shin' },
] as const