// lib/services/db.ts
// Tüm Supabase işlemleri burada — page.tsx sadece bu fonksiyonları çağırır

import { createClient } from '@/lib/supabase'
import { Word, VALID_TYPES } from '@/lib/types/words'

export interface DbResult<T = void> {
  data: T | null
  error: string | null
}

function db() {
  return createClient()
}

type UpdatedWordResult = {
  id: string
  turkish: string
  root: string | null
  practice_group: string | null
  source: string | null
  is_verified: boolean | null
  sedra_verified: boolean | null
  notes: string | null
  category_id: string | null
}

// ─── Kelime okuma ─────────────────────────────────────────────────────────────

export async function getWords(): Promise<DbResult<Word[]>> {
  const { data, error } = await db()
    .from('words')
    .select(
      `
      id,
      turkish,
      english,
      syriac,
      transliteration,
      root,
      word_type,
      practice_group,
      image_url,
      audio_url,
      created_at,
      created_by,
      source,
      is_verified,
      sedra_verified,
      notes,
      category_id
      `
    )
    .order('created_at', { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data: (data || []) as Word[], error: null }
}

// ─── Kelime ekleme ────────────────────────────────────────────────────────────

export interface AddWordPayload {
  turkish: string
  english: string
  syriac: string
  transliteration: string
  root?: string | null
  word_type: string
  practice_group?: string | null
  image_url?: string | null
  audio_url?: string | null
  source?: string | null
  is_verified?: boolean | null
  sedra_verified?: boolean | null
  notes?: string | null
  category_id?: string | null
}

export async function addWord(payload: AddWordPayload): Promise<DbResult> {
  const supabase = db()

  const { data: existing } = await supabase
    .from('words')
    .select('id')
    .eq('turkish', payload.turkish.trim())
    .maybeSingle()

  if (existing) {
    return { data: null, error: 'Bu Türkçe kelime zaten kayıtlı.' }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const wordType = VALID_TYPES.includes(payload.word_type as (typeof VALID_TYPES)[number])
    ? payload.word_type
    : 'diğer'

  const { error } = await supabase.from('words').insert({
    turkish: payload.turkish.trim(),
    english: payload.english.trim(),
    syriac: payload.syriac.trim(),
    transliteration: payload.transliteration.trim(),
    root: payload.root?.trim() ?? null,
    word_type: wordType,
    practice_group: payload.practice_group ?? null,
    image_url: payload.image_url ?? null,
    audio_url: payload.audio_url ?? null,
    source: payload.source ?? 'manual',
    is_verified: payload.is_verified ?? false,
    sedra_verified: payload.sedra_verified ?? false,
    notes: payload.notes?.trim() ?? null,
    category_id: payload.category_id?.trim() || null,
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
  root?: string | null
  word_type: string
  practice_group?: string | null
  image_url?: string | null
  audio_url?: string | null
  source?: string | null
  is_verified?: boolean | null
  sedra_verified?: boolean | null
  notes?: string | null
  category_id?: string | null
}

export async function updateWord(
  payload: UpdateWordPayload
): Promise<DbResult<UpdatedWordResult>> {
  const wordType = VALID_TYPES.includes(payload.word_type as (typeof VALID_TYPES)[number])
    ? payload.word_type
    : 'diğer'

  const { data, error } = await db()
    .from('words')
    .update({
      turkish: payload.turkish.trim(),
      english: payload.english.trim(),
      syriac: payload.syriac.trim(),
      transliteration: payload.transliteration.trim(),
      root: payload.root?.trim() ?? null,
      word_type: wordType,
      practice_group: payload.practice_group ?? null,
      image_url: payload.image_url ?? null,
      audio_url: payload.audio_url ?? null,
      source: payload.source ?? 'manual',
      is_verified: payload.is_verified ?? false,
      sedra_verified: payload.sedra_verified ?? false,
      notes: payload.notes?.trim() ?? null,
      category_id: payload.category_id?.trim() || null,
    })
    .eq('id', payload.id)
    .select(
      `
      id,
      turkish,
      root,
      practice_group,
      source,
      is_verified,
      sedra_verified,
      notes,
      category_id
      `
    )
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  if (!data) {
    return {
      data: null,
      error: 'Veritabanı güncelleme yapmadı. Muhtemelen yetki/RLS veya eşleşen kayıt sorunu var.',
    }
  }

  return { data: data as UpdatedWordResult, error: null }
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
      root: row.root?.trim() ?? null,
      word_type: wordType,
      practice_group: row.practice_group ?? null,
      image_url: row.image_url ?? null,
      audio_url: row.audio_url ?? null,
      source: row.source ?? 'manual',
      is_verified: row.is_verified ?? false,
      sedra_verified: row.sedra_verified ?? false,
      notes: row.notes?.trim() ?? null,
      category_id: row.category_id?.trim() || null,
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

  if (error || !data) {
    return { data: null, error: error?.message || 'Yükleme hatası' }
  }

  const { data: urlData } = supabase.storage.from('word-media').getPublicUrl(data.path)
  return { data: urlData.publicUrl, error: null }
}