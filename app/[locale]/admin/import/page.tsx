'use client'

import { useMemo, useRef, useState } from 'react'
import { createClient } from '@/app/lib/supabase'
import { VALID_TYPES } from '@/lib/types/words'
import * as XLSX from 'xlsx'

type ImportStep = 'upload' | 'review' | 'done'
type ImportStatus = 'new' | 'duplicate' | 'conflict' | 'incomplete'
type ImportAction = 'add' | 'skip' | 'update' | 'delete'

type AddWordPayload = {
  turkish: string
  english: string
  syriac: string
  transliteration: string
  word_type: string
  image_url?: string | null
  audio_url?: string | null
}

type ExistingWord = {
  id: string
  turkish: string | null
  english: string | null
  syriac: string | null
  transliteration: string | null
  word_type: string | null
  image_url: string | null
  audio_url: string | null
  created_at?: string | null
}

type ImportRow = AddWordPayload & {
  rowNumber: number
  status: ImportStatus
  action: ImportAction
  reason: string
  match: ExistingWord | null
}

const CSV_TEMPLATE = `Türkçe,İngilizce,Süryanice,Transliterasyon,Kelime Türü,Görsel URL,Ses URL
kitap,book,ܟܬܒܐ,ktābā,isim,,
ev,house,ܒܝܬܐ,baytā,isim,,
yazmak,to write,ܟܬܒ,ktab,fiil,,`

export default function ImportPage() {
  const supabase = createClient()

  const [step, setStep] = useState<ImportStep>('upload')
  const [rows, setRows] = useState<ImportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const summary = useMemo(() => {
    return {
      total: rows.length,
      new: rows.filter((r) => r.status === 'new').length,
      duplicate: rows.filter((r) => r.status === 'duplicate').length,
      conflict: rows.filter((r) => r.status === 'conflict').length,
      incomplete: rows.filter((r) => r.status === 'incomplete').length,
      add: rows.filter((r) => r.action === 'add').length,
      skip: rows.filter((r) => r.action === 'skip').length,
      update: rows.filter((r) => r.action === 'update').length,
      delete: rows.filter((r) => r.action === 'delete').length,
    }
  }, [rows])

  function resetAll() {
    setStep('upload')
    setRows([])
    setLoading(false)
    setApplying(false)
    setError('')
    setMessage('')
    setDragOver(false)
    setFileName('')
  }

  async function processFile(file: File) {
    if (!file) return

    setLoading(true)
    setError('')
    setMessage('')
    setRows([])
    setFileName(file.name)

    try {
      const lowerName = file.name.toLowerCase()
      let parsed: AddWordPayload[] = []

      const isCsv =
        lowerName.endsWith('.csv') || lowerName.endsWith('.txt')

      const isExcel =
        lowerName.endsWith('.xlsx') ||
        lowerName.endsWith('.xls') ||
        lowerName.endsWith('.xlsm') ||
        lowerName.endsWith('.xlsb')

      if (isCsv) {
        const text = await file.text()

        if (!text.trim()) {
          throw new Error('Dosya boş görünüyor.')
        }

        parsed = parseCSV(text)
      } else if (isExcel) {
        const buffer = await file.arrayBuffer()
        parsed = parseExcel(buffer)
      } else {
        throw new Error(
          'Desteklenen formatlar: CSV, XLSX, XLS, XLSM, XLSB. Eğer dosya .numbers ise önce Excel veya CSV olarak dışa aktar.'
        )
      }

      if (!parsed.length) {
        throw new Error('Dosyada geçerli veri bulunamadı.')
      }

      if (parsed.length > 500) {
        setMessage(`Dosya okundu. ${parsed.length} satır taranıyor, bu işlem biraz sürebilir.`)
      }

      const analyzed = await analyzeRows(parsed)
      setRows(analyzed)
      setStep('review')
      setMessage(`${parsed.length} satır başarıyla tarandı.`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function parseCSV(text: string): AddWordPayload[] {
    const lines = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .filter((l) => l.trim())

    if (lines.length < 2) return []

    const dataLines = lines.slice(1)

    return dataLines
      .map((line) => parseCSVLine(line))
      .map((cols) => {
        const rawType = (cols[4] || '').trim()
        const wordType = VALID_TYPES.includes(rawType as (typeof VALID_TYPES)[number])
          ? rawType
          : 'diğer'

        return {
          turkish: cols[0]?.trim() || '',
          english: cols[1]?.trim() || '',
          syriac: cols[2]?.trim() || '',
          transliteration: cols[3]?.trim() || '',
          word_type: wordType,
          image_url: cols[5]?.trim() || null,
          audio_url: cols[6]?.trim() || null,
        }
      })
      .filter((row) => row.turkish || row.english || row.syriac || row.transliteration)
  }

  function parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const next = line[i + 1]

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    result.push(current.trim())

    while (result.length < 7) {
      result.push('')
    }

    return result
  }

  function parseExcel(buffer: ArrayBuffer): AddWordPayload[] {
    const workbook = XLSX.read(buffer, { type: 'array' })

    if (!workbook.SheetNames.length) {
      throw new Error('Excel dosyasında sayfa bulunamadı.')
    }

    const firstSheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[firstSheetName]

    if (!sheet) {
      throw new Error('Excel sayfası okunamadı.')
    }

    const data: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    if (!data.length) {
      throw new Error('Excel sayfası boş görünüyor.')
    }

    return data
      .map((row) => {
        const turkish = row['Türkçe'] || row['turkish'] || row['TR'] || ''
        const english = row['İngilizce'] || row['english'] || row['EN'] || ''
        const syriac = row['Süryanice'] || row['syriac'] || row['SYR'] || ''
        const transliteration =
          row['Transliterasyon'] || row['transliteration'] || row['LATIN'] || ''
        const rawType =
          row['Kelime Türü'] || row['type'] || row['word_type'] || ''

        const wordType = VALID_TYPES.includes(String(rawType).trim() as (typeof VALID_TYPES)[number])
          ? String(rawType).trim()
          : 'diğer'

        return {
          turkish: String(turkish).trim(),
          english: String(english).trim(),
          syriac: String(syriac).trim(),
          transliteration: String(transliteration).trim(),
          word_type: wordType,
          image_url: row['Görsel URL'] ? String(row['Görsel URL']).trim() : row['image_url'] ? String(row['image_url']).trim() : null,
          audio_url: row['Ses URL'] ? String(row['Ses URL']).trim() : row['audio_url'] ? String(row['audio_url']).trim() : null,
        }
      })
      .filter((row) => row.turkish || row.english || row.syriac || row.transliteration)
  }

  async function analyzeRows(parsed: AddWordPayload[]): Promise<ImportRow[]> {
    const analyzed: ImportRow[] = []

    for (let i = 0; i < parsed.length; i++) {
      const row = parsed[i]
      const match = await findBestMatch(row)

      let status: ImportStatus = 'new'
      let action: ImportAction = 'add'
      let reason = 'Yeni kayıt'

      if (!row.turkish.trim()) {
        status = 'incomplete'
        action = 'skip'
        reason = 'Türkçe alanı eksik'
      } else if (!match) {
        status = 'new'
        action = 'add'
        reason = 'Sistemde eşleşme bulunamadı'
      } else {
        const exact =
          normalize(row.turkish) === normalize(match.turkish) &&
          normalize(row.english) === normalize(match.english) &&
          normalize(row.syriac) === normalize(match.syriac) &&
          normalize(row.transliteration) === normalize(match.transliteration)

        const canComplete =
          (!!row.transliteration &&
            normalize(row.transliteration) === normalize(match.transliteration) &&
            !row.syriac &&
            !!match.syriac) ||
          (!!row.english &&
            normalize(row.english) === normalize(match.english) &&
            !row.syriac &&
            !!match.syriac)

        if (exact) {
          status = 'duplicate'
          action = 'skip'
          reason = 'Birebir aynı kayıt zaten mevcut'
        } else if (canComplete) {
          status = 'incomplete'
          action = 'update'
          reason = 'Mevcut kayıt üzerinden eksik alan tamamlanabilir'
        } else {
          status = 'conflict'
          action = 'update'
          reason = 'Benzer/eşleşen kayıt bulundu, inceleme gerekli'
        }
      }

      analyzed.push({
        ...row,
        rowNumber: i + 2,
        status,
        action,
        reason,
        match,
      })
    }

    return analyzed
  }

  async function findBestMatch(row: AddWordPayload): Promise<ExistingWord | null> {
    const candidates: ExistingWord[] = []

    async function collect(field: keyof AddWordPayload, value: string) {
      if (!value.trim()) return

      const { data } = await supabase
        .from('words')
        .select(
          'id,turkish,english,syriac,transliteration,word_type,image_url,audio_url,created_at'
        )
        .eq(field, value.trim())
        .limit(5)

      if (data?.length) {
        for (const item of data as ExistingWord[]) {
          if (!candidates.find((c) => c.id === item.id)) {
            candidates.push(item)
          }
        }
      }
    }

    await collect('syriac', row.syriac)
    await collect('transliteration', row.transliteration)
    await collect('english', row.english)
    await collect('turkish', row.turkish)

    if (!candidates.length) return null

    const scored = candidates.map((candidate) => {
      let score = 0

      if (normalize(candidate.syriac) === normalize(row.syriac) && row.syriac) score += 5
      if (
        normalize(candidate.transliteration) === normalize(row.transliteration) &&
        row.transliteration
      )
        score += 4
      if (normalize(candidate.english) === normalize(row.english) && row.english) score += 3
      if (normalize(candidate.turkish) === normalize(row.turkish) && row.turkish) score += 2

      return { candidate, score }
    })

    scored.sort((a, b) => b.score - a.score)
    return scored[0].candidate
  }

  function normalize(value?: string | null) {
    return (value || '').trim().toLowerCase()
  }

  function updateRowAction(index: number, action: ImportAction) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, action } : row)))
  }

  async function applyChanges() {
    setApplying(true)
    setError('')
    setMessage('')

    let added = 0
    let updated = 0
    let deleted = 0
    let skipped = 0
    const errors: string[] = []

    try {
      for (const row of rows) {
        const payload = {
          turkish: row.turkish.trim(),
          english: row.english.trim(),
          syriac: row.syriac.trim() || row.match?.syriac || '',
          transliteration: row.transliteration.trim(),
          word_type: row.word_type,
          image_url: row.image_url || null,
          audio_url: row.audio_url || null,
        }

        if (row.action === 'skip') {
          skipped++
          continue
        }

        if (row.action === 'add') {
          const { error } = await supabase.from('words').insert(payload)
          if (error) {
            errors.push(`Satır ${row.rowNumber}: ${error.message}`)
          } else {
            added++
          }
          continue
        }

        if (row.action === 'update') {
          if (!row.match?.id) {
            errors.push(`Satır ${row.rowNumber}: Güncellenecek eşleşme bulunamadı`)
            continue
          }

          const { error } = await supabase
            .from('words')
            .update(payload)
            .eq('id', row.match.id)

          if (error) {
            errors.push(`Satır ${row.rowNumber}: ${error.message}`)
          } else {
            updated++
          }
          continue
        }

        if (row.action === 'delete') {
          if (!row.match?.id) {
            errors.push(`Satır ${row.rowNumber}: Silinecek eşleşme bulunamadı`)
            continue
          }

          const { error } = await supabase
            .from('words')
            .delete()
            .eq('id', row.match.id)

          if (error) {
            errors.push(`Satır ${row.rowNumber}: ${error.message}`)
          } else {
            deleted++
          }
        }
      }

      setMessage(
        `İşlem tamamlandı. Eklenen: ${added}, Güncellenen: ${updated}, Silinen: ${deleted}, Atlanan: ${skipped}`
      )

      if (errors.length) {
        setError(errors.slice(0, 8).join(' | '))
      }

      setStep('done')
    } catch (e) {
      setError('Toplu uygulama sırasında hata oluştu: ' + (e as Error).message)
    }

    setApplying(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  function downloadTemplate() {
    const blob = new Blob(['\uFEFF' + CSV_TEMPLATE], {
      type: 'text/csv;charset=utf-8;',
    })

    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'lexsyriac-sablon.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function downloadExcelTemplate() {
    const rows = [
      ['Türkçe', 'İngilizce', 'Süryanice', 'Transliterasyon', 'Kelime Türü', 'Görsel URL', 'Ses URL'],
      ['kitap', 'book', 'ܟܬܒܐ', 'ktābā', 'isim', '', ''],
      ['ev', 'house', 'ܒܝܬܐ', 'baytā', 'isim', '', ''],
      ['yazmak', 'to write', 'ܟܬܒ', 'ktab', 'fiil', '', ''],
    ]

    const worksheet = XLSX.utils.aoa_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Kelimeler')
    XLSX.writeFile(workbook, 'lexsyriac-sablon.xlsx')
  }

  return (
    <main style={{ padding: '2rem 0 4rem' }}>
      <div className="container">
        <div style={{ marginBottom: '2rem' }}>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
            }}
          >
            İçe Aktar
          </h1>
          <p
            style={{
              color: 'var(--color-text-muted)',
              fontSize: '0.875rem',
              marginTop: '0.25rem',
            }}
          >
            CSV veya Excel yükle, sistemdeki kelimelerle karşılaştır, sonra uygula
          </p>
        </div>

        {message && (
          <div
            style={{
              marginBottom: '1rem',
              background: '#EEF8F1',
              border: '1px solid #B7DEC2',
              color: '#216A3A',
              borderRadius: 12,
              padding: '0.875rem 1rem',
              fontSize: '0.9rem',
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            style={{
              marginBottom: '1rem',
              background: '#FFF7F7',
              border: '1px solid #E5C7C7',
              color: '#A94442',
              borderRadius: 12,
              padding: '0.875rem 1rem',
              fontSize: '0.9rem',
            }}
          >
            {error}
          </div>
        )}

        {step === 'upload' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.5rem',
              alignItems: 'start',
            }}
          >
            <div>
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${
                    dragOver ? 'var(--color-primary)' : 'var(--color-border)'
                  }`,
                  borderRadius: 16,
                  padding: '3rem 2rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: dragOver ? 'rgba(26,95,110,0.04)' : 'var(--color-bg)',
                  transition: 'all 0.2s',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📂</div>
                <p
                  style={{
                    fontWeight: 600,
                    color: 'var(--color-text)',
                    marginBottom: '0.35rem',
                  }}
                >
                  CSV veya Excel dosyasını sürükleyin veya tıklayın
                </p>
                <p
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Dosya önce taranır, sonra karar ekranı açılır
                </p>

                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.xlsm,.xlsb,.csv,.txt"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) processFile(f)
                    e.target.value = ''
                  }}
                  style={{ display: 'none' }}
                />
              </div>

              {fileName && !loading && (
                <div
                  style={{
                    marginBottom: '1rem',
                    fontSize: '0.82rem',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Son seçilen dosya: <strong>{fileName}</strong>
                </div>
              )}

              {loading && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '1.5rem',
                    color: 'var(--color-primary)',
                    fontWeight: 500,
                  }}
                >
                  ⟳ Dosya taranıyor...
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div className="card" style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                  📋 Çalışma Mantığı
                </h3>
                <ol
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--color-text)',
                    paddingLeft: '1.25rem',
                    lineHeight: 1.9,
                  }}
                >
                  <li>CSV veya Excel yüklenir</li>
                  <li>Her satır mevcut kelimelerle karşılaştırılır</li>
                  <li>Yeni / Aynı / Çakışma / Eksik durumları belirlenir</li>
                  <li>Kullanıcı aksiyon seçer</li>
                  <li>Toplu uygulama yapılır</li>
                </ol>
              </div>

              <div className="card" style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  📥 Şablon İndir
                </h3>
                <p
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--color-text-muted)',
                    marginBottom: '0.875rem',
                  }}
                >
                  CSV ve Excel için örnek şablonlar
                </p>

                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  <button
                    onClick={downloadTemplate}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem', width: '100%' }}
                  >
                    ⬇ CSV Şablonu İndir
                  </button>

                  <button
                    onClick={downloadExcelTemplate}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem', width: '100%' }}
                  >
                    ⬇ Excel Şablonu İndir
                  </button>
                </div>
              </div>

              <div className="card" style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  ℹ Geçerli Kelime Türleri
                </h3>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.3rem',
                    marginTop: '0.5rem',
                  }}
                >
                  {VALID_TYPES.map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: '0.72rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: 20,
                        background: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'review' && (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              {[
                { label: 'TOPLAM SATIR', value: summary.total, color: 'var(--color-primary)' },
                { label: 'YENİ', value: summary.new, color: '#10B981' },
                { label: 'AYNI KAYIT', value: summary.duplicate, color: '#6B7280' },
                { label: 'ÇAKIŞMA', value: summary.conflict, color: '#F97316' },
                { label: 'EKSİK', value: summary.incomplete, color: '#8B5CF6' },
              ].map((item) => (
                <div key={item.label} className="card" style={{ padding: '1rem' }}>
                  <div
                    style={{
                      fontSize: '1.6rem',
                      fontWeight: 700,
                      color: item.color,
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {item.value}
                  </div>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      letterSpacing: '0.07em',
                      color: 'var(--color-text-muted)',
                      marginTop: '0.3rem',
                      fontWeight: 600,
                    }}
                  >
                    {item.label}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                marginBottom: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <button className="btn btn-ghost" onClick={() => setStep('upload')}>
                ← Geri Dön
              </button>

              <button
                className="btn btn-primary"
                onClick={applyChanges}
                disabled={applying}
              >
                {applying ? 'Uygulanıyor...' : 'Değişiklikleri Uygula'}
              </button>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {rows.map((row, index) => (
                <div key={`${row.rowNumber}-${index}`} className="card" style={{ padding: '1.25rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      flexWrap: 'wrap',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--color-text-muted)',
                          marginBottom: '0.35rem',
                        }}
                      >
                        Satır {row.rowNumber}
                      </div>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '0.25rem 0.6rem',
                          borderRadius: 999,
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          background:
                            row.status === 'new'
                              ? '#E8F7EE'
                              : row.status === 'duplicate'
                              ? '#F1F3F5'
                              : row.status === 'conflict'
                              ? '#FFF4E8'
                              : '#F3E8FF',
                          color:
                            row.status === 'new'
                              ? '#1F7A3E'
                              : row.status === 'duplicate'
                              ? '#4B5563'
                              : row.status === 'conflict'
                              ? '#C26A00'
                              : '#7C3AED',
                        }}
                      >
                        {row.status === 'new'
                          ? 'Yeni'
                          : row.status === 'duplicate'
                          ? 'Aynı Kayıt'
                          : row.status === 'conflict'
                          ? 'Çakışma'
                          : 'Eksik'}
                      </div>
                    </div>

                    <div style={{ minWidth: 180 }}>
                      <label style={miniLabelStyle}>Aksiyon</label>
                      <select
                        value={row.action}
                        onChange={(e) => updateRowAction(index, e.target.value as ImportAction)}
                        className="input"
                        style={{ fontSize: '0.85rem' }}
                      >
                        <option value="add">Ekle</option>
                        <option value="skip">Atla</option>
                        <option value="update">Güncelle</option>
                        <option value="delete">Mevcutu Sil</option>
                      </select>
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: '0.84rem',
                      color: 'var(--color-text-muted)',
                      marginBottom: '0.85rem',
                    }}
                  >
                    {row.reason}
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '1rem',
                    }}
                  >
                    <div
                      style={{
                        border: '1px solid var(--color-border)',
                        borderRadius: 12,
                        padding: '1rem',
                        background: 'var(--color-bg)',
                      }}
                    >
                      <div style={compareTitleStyle}>Yüklenecek Veri</div>
                      <CompareLine label="Türkçe" value={row.turkish} />
                      <CompareLine label="İngilizce" value={row.english} />
                      <CompareLine label="Süryanice" value={row.syriac} rtl />
                      <CompareLine label="Translit." value={row.transliteration} />
                      <CompareLine label="Tür" value={row.word_type} />
                    </div>

                    <div
                      style={{
                        border: '1px solid var(--color-border)',
                        borderRadius: 12,
                        padding: '1rem',
                        background: '#FAFAF8',
                      }}
                    >
                      <div style={compareTitleStyle}>Sistemde Bulunan</div>
                      {row.match ? (
                        <>
                          <CompareLine label="Türkçe" value={row.match.turkish} />
                          <CompareLine label="İngilizce" value={row.match.english} />
                          <CompareLine label="Süryanice" value={row.match.syriac} rtl />
                          <CompareLine label="Translit." value={row.match.transliteration} />
                          <CompareLine label="Tür" value={row.match.word_type} />
                        </>
                      ) : (
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                          Eşleşme bulunamadı
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {step === 'done' && (
          <div className="card" style={{ padding: '2rem' }}>
            <h2
              style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                marginBottom: '0.75rem',
              }}
            >
              İşlem Tamamlandı
            </h2>

            <p
              style={{
                fontSize: '0.9rem',
                color: 'var(--color-text-muted)',
                marginBottom: '1rem',
              }}
            >
              Toplu içe aktarma işlemi tamamlandı. Yeni bir dosya yükleyebilir veya admin panelde devam edebilirsin.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={resetAll}>
                Yeni Dosya Yükle
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

function CompareLine({
  label,
  value,
  rtl = false,
}: {
  label: string
  value?: string | null
  rtl?: boolean
}) {
  return (
    <div style={{ marginBottom: '0.45rem' }}>
      <div style={miniLabelStyle}>{label}</div>
      <div
        style={{
          fontSize: '0.88rem',
          color: 'var(--color-text)',
          direction: rtl ? 'rtl' : 'ltr',
          fontFamily: rtl ? 'serif' : 'inherit',
          minHeight: 20,
        }}
      >
        {value || '—'}
      </div>
    </div>
  )
}

const miniLabelStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  color: 'var(--color-text-muted)',
  marginBottom: '0.15rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontWeight: 600,
}

const compareTitleStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)',
  marginBottom: '0.75rem',
}