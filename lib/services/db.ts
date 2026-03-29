// lib/services/db.ts
// Tüm Supabase işlemleri burada — page.tsx sadece bu fonksiyonları çağırır

import { createClient } from '@/lib/supabase'
import { Word, VALID_TYPES } from '@/lib/types/words'

export interface DbResult<T = void> {
  data: T | null
  error: string | null
}

// Supabase client — her fonksiyon kendi client'ını oluşturur (singleton)
function db() {
  return createClient()
}

// ─── Kelime okuma ─────────────────────────────────────────────────────────────

export async function getWords(): Promise<DbResult<Word[]>> {
  const { data, error } = await db()
    .from('words')
    .select(
      'id,turkish,english,syriac,transliteration,word_type,practice_group,image_url,audio_url,created_at'
    )
    .order('created_at', { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data: data as Word[], error: null }
}

// ─── Kelime ekleme ────────────────────────────────────────────────────────────

export interface AddWordPayload {
  turkish: string
  english: string
  syriac: string
  transliteration: string
  word_type: string
  practice_group?: string | null
  image_url?: string | null
  audio_url?: string | null
}

export async function addWord(payload: AddWordPayload): Promise<DbResult> {
  const supabase = db()

  // Duplicate kontrol
  const { data: existing } = await supabase
    .from('words')
    .select('id')
    .eq('turkish', payload.turkish.trim())
    .maybeSingle()

  if (existing) return { data: null, error: 'Bu Türkçe kelime zaten kayıtlı.' }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Geçersiz kelime türünü 'diğer' yap
  const wordType = VALID_TYPES.includes(payload.word_type as (typeof VALID_TYPES)[number])
    ? payload.word_type
    : 'diğer'

  const { error } = await supabase.from('words').insert({
    turkish: payload.turkish.trim(),
    english: payload.english.trim(),
    syriac: payload.syriac.trim(),
    transliteration: payload.transliteration.trim(),
    word_type: wordType,
    practice_group: payload.practice_group || null,
    image_url: payload.image_url || null,
    audio_url: payload.audio_url || null,
    created_by: user?.id ?? null,
  })

  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

// ─── Kelime güncelleme ────────────────────────────────────────────────────────

export interface UpdateWordPayload {
  id: string
  turkish: string
  english: string
  syriac: string
  transliteration: string
  word_type: string
  practice_group?: string | null
  image_url?: string | null
  audio_url?: string | null
}

export async function updateWord(payload: UpdateWordPayload): Promise<DbResult> {
  const wordType = VALID_TYPES.includes(payload.word_type as (typeof VALID_TYPES)[number])
    ? payload.word_type
    : 'diğer'

  const { data, error } = await db()
    .from('words')
    .update({
      turkish: payload.turkish,
      english: payload.english,
      syriac: payload.syriac,
      transliteration: payload.transliteration,
      word_type: wordType,
      practice_group: payload.practice_group ?? null,
      image_url: payload.image_url ?? null,
      audio_url: payload.audio_url ?? null,
    })
    .eq('id', payload.id)
    .select('id, turkish, practice_group')

  if (error) {
    return { data: null, error: error.message }
  }

  if (!data || data.length === 0) {
    return {
      data: null,
      error: 'Veritabanı güncelleme yapmadı. Muhtemelen yetki/RLS veya eşleşen kayıt sorunu var.',
    }
  }

  return { data: data[0], error: null }
}

// ─── Kelime silme ─────────────────────────────────────────────────────────────

export async function deleteWord(id: string): Promise<DbResult> {
  const { error } = await db().from('words').delete().eq('id', id)
  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

// ─── Tümünü sil ───────────────────────────────────────────────────────────────

export async function deleteAllWords(): Promise<DbResult> {
  const { error } = await db()
    .from('words')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

// ─── Excel import - toplu ekleme ──────────────────────────────────────────────

export interface ImportResult {
  added: number
  skipped: number
  errors: string[]
}

export async function importWords(rows: AddWordPayload[]): Promise<ImportResult> {
  const supabase = db()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let added = 0
  let skipped = 0
  const errors: string[] = []

  for (const row of rows) {
    if (!row.turkish?.trim()) {
      skipped++
      continue
    }

    const { data: existing } = await supabase
      .from('words')
      .select('id')
      .eq('turkish', row.turkish.trim())
      .maybeSingle()

    if (existing) {
      skipped++
      continue
    }

    const wordType = VALID_TYPES.includes(row.word_type as (typeof VALID_TYPES)[number])
      ? row.word_type
      : 'diğer'

    const { error } = await supabase.from('words').insert({
      turkish: row.turkish.trim(),
      english: row.english.trim(),
      syriac: row.syriac.trim(),
      transliteration: row.transliteration.trim(),
      word_type: wordType,
      practice_group: row.practice_group || null,
      image_url: row.image_url || null,
      audio_url: row.audio_url || null,
      created_by: user?.id ?? null,
    })

    if (!error) {
      added++
    } else {
      skipped++
      errors.push(`${row.turkish}: ${error.message}`)
    }
  }

  return { added, skipped, errors }
}

// ─── Storage upload ───────────────────────────────────────────────────────────

export async function uploadToStorage(
  file: File | Blob,
  type: 'image' | 'audio',
  filename?: string
): Promise<DbResult<string>> {
  const supabase = db()
  const ext = filename?.split('.').pop() || (type === 'image' ? 'jpg' : 'mp3')
  const path = `${type}s/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const contentType =
    file instanceof File ? file.type : type === 'image' ? 'image/jpeg' : 'audio/webm'

  const { data, error } = await supabase.storage
    .from('word-media')
    .upload(path, file, { contentType })

  if (error || !data) return { data: null, error: error?.message || 'Yükleme hatası' }

  const { data: urlData } = supabase.storage.from('word-media').getPublicUrl(data.path)
  return { data: urlData.publicUrl, error: null }
}