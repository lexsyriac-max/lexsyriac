// lib/services/sedra.ts
// Sedra doğrulama + Claude Syriac çeviri

export interface SedraResult {
  verified: boolean
  syriac?: string
  stem?: string
  category?: string
  tense?: string
  glosses_en?: string[]
  transliteration?: string
  lexeme_id?: number
  sedra_url?: string
  message?: string
}

// Süryanice → Latin transliterasyon (client-side)
export function toTranslit(syriac: string): string {
  const map: Record<string, string> = {
    'ܐ':'ʾ','ܒ':'b','ܓ':'g','ܕ':'d','ܗ':'h','ܘ':'w','ܙ':'z','ܚ':'ḥ',
    'ܛ':'ṭ','ܝ':'y','ܟ':'k','ܠ':'l','ܡ':'m','ܢ':'n','ܣ':'s','ܥ':'˕',
    'ܦ':'p','ܨ':'ṣ','ܩ':'q','ܪ':'r','ܫ':'š','ܬ':'t',
  }
  return syriac.split('').map(c => map[c] || '').join('')
}

// Sedra ile Süryanice doğrula
export async function verifySyriac(syriac: string): Promise<SedraResult> {
  if (!syriac.trim()) return { verified: false, message: 'Boş girdi' }
  try {
    const res = await fetch(`/api/sedra?syriac=${encodeURIComponent(syriac.trim())}`)
    if (!res.ok) return { verified: false, message: 'Sedra erişim hatası' }
    return await res.json()
  } catch {
    return { verified: false, message: 'Bağlantı hatası' }
  }
}

// Claude ile EN/TR → Süryanice tahmin
export async function claudeToSyriac(english: string, turkish: string): Promise<string | null> {
  try {
    const res = await fetch('/api/claude-syriac', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ english, turkish }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.syriac || null
  } catch {
    return null
  }
}

// Sedra kategorisi → Türkçe kelime türü
export function sedraToWordType(category: string): string | null {
  const map: Record<string, string> = {
    verb: 'fiil', noun: 'isim', adjective: 'sıfat', adverb: 'zarf',
    pronoun: 'zamir', preposition: 'edat', conjunction: 'bağlaç', particle: 'edat',
  }
  return map[category.toLowerCase()] || null
}
