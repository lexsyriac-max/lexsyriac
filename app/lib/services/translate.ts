// lib/services/translate.ts
// MyMemory API — sadece pure async function
// Debounce WordForm'un sorumluluğu

export async function trToEn(text: string): Promise<string> {
  return _call(text, 'tr', 'en')
}

export async function enToTr(text: string): Promise<string> {
  return _call(text, 'en', 'tr')
}

async function _call(text: string, from: string, to: string): Promise<string> {
  if (!text.trim()) return ''
  try {
    const res = await fetch(
      `/api/translate?text=${encodeURIComponent(text.trim())}&from=${from}&to=${to}`
    )
    if (!res.ok) return ''
    const data = await res.json()
    return data.translated?.trim() || ''
  } catch {
    return ''
  }
}
