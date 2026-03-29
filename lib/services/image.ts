export interface ImageResult {
  url: string
  thumb: string
  source: 'wikimedia' | 'pixabay'
}

export function normalizeImageResults(raw: unknown): ImageResult[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((r): r is Record<string, string> => r !== null && typeof r === 'object' && typeof r.thumb === 'string' && typeof r.url === 'string')
    .map(r => ({ url: r.url, thumb: r.thumb, source: (r.source === 'pixabay' ? 'pixabay' : 'wikimedia') as 'wikimedia' | 'pixabay' }))
}

export async function searchImages(query: string): Promise<ImageResult[]> {
  const q = (query || '').replace(/^to\s+/i, '').split(/[/,]/)[0].trim().toLowerCase()
  if (!q) return []
  try {
    const res = await fetch(`/api/image-search?q=${encodeURIComponent(q)}`)
    if (!res.ok) return []
    const data = await res.json()
    return normalizeImageResults(data.results)
  } catch {
    return []
  }
}

export async function saveImageToStorage(
  thumbUrl: string,
  uploadFn: (blob: Blob, path: string, type: string) => Promise<string | null>
): Promise<string> {
  try {
    const res = await fetch(thumbUrl)
    const blob = await res.blob()
    const ext = blob.type.includes('png') ? 'png' : 'jpg'
    const path = `images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const stored = await uploadFn(blob, path, blob.type)
    return stored || thumbUrl
  } catch {
    return thumbUrl
  }
}
