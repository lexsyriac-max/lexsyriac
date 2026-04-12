'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { AddWordPayload } from '@/lib/services/db'
import { Word, TYPE_OPTIONS } from '@/lib/types/words'

interface WordFormProps {
  editingWord: Word | null
  onAdd: (payload: AddWordPayload) => Promise<{ error: string | null }>
  onUpdate: (id: string, payload: AddWordPayload) => Promise<{ error: string | null }>
  onCancel: () => void
  isEnglishConfirmed?: boolean
  setIsEnglishConfirmed?: (val: boolean) => void
  loadingEnglish?: boolean
  englishSuggestion?: string
  onTurkishChange?: (val: string) => void
  categories: { id: string; name: string }[]
}

type ResolveInputType = 'turkish' | 'english' | 'syriac' | 'transliteration'
type ResolveStatus = 'idle' | 'loading' | 'success' | 'error'
type SedraStatus = 'idle' | 'checking' | 'found' | 'not_found'
type ImageTab = 'wikimedia' | 'pixabay' | 'url' | 'upload'

type FormState = AddWordPayload & {
  category_id?: string
  image_verification_note?: string
  image_verification_status?: string
}

const EMPTY_FORM: FormState = {
  turkish: '',
  english: '',
  syriac: '',
  transliteration: '',
  root: '',
  word_type: 'isim',
  image_url: '',
  audio_url: '',
  source: 'manual',
  is_verified: false,
  sedra_verified: false,
  notes: '',
  practice_group: null,
  category_id: '',
  image_verification_note: '',
  image_verification_status: 'pending',
}

const INPUT_LANGUAGE_OPTIONS: Array<{ value: ResolveInputType; label: string }> = [
  { value: 'turkish', label: 'Türkçe' },
  { value: 'english', label: 'İngilizce' },
  { value: 'syriac', label: 'Süryanice' },
  { value: 'transliteration', label: 'Transliterasyon' },
]

const SYRIAC_TO_LATIN_MAP: Record<string, string> = {
  'ܐ': 'ʾ',
  'ܒ': 'b',
  'ܓ': 'g',
  'ܕ': 'd',
  'ܗ': 'h',
  'ܘ': 'w',
  'ܙ': 'z',
  'ܚ': 'ḥ',
  'ܛ': 'ṭ',
  'ܝ': 'y',
  'ܟ': 'k',
  'ܠ': 'l',
  'ܡ': 'm',
  'ܢ': 'n',
  'ܣ': 's',
  'ܥ': 'ʿ',
  'ܦ': 'p',
  'ܨ': 'ṣ',
  'ܩ': 'q',
  'ܪ': 'r',
  'ܫ': 'š',
  'ܬ': 't',
}

const SPECIAL_CHARS = [
  { char: 'ʾ', label: 'Alaph' },
  { char: 'ʿ', label: 'Ayn' },
  { char: 'ḥ', label: 'Ḥeth' },
  { char: 'ṭ', label: 'Ṭeth' },
  { char: 'ṣ', label: 'Ṣade' },
  { char: 'š', label: 'Shin' },
]

function clean(value: unknown) {
  return String(value ?? '').trim()
}

function transliterateSyriac(value: string) {
  return clean(value)
    .split('')
    .map((char) => SYRIAC_TO_LATIN_MAP[char] || '')
    .join('')
    .trim()
}

function latinToSyriac(value: string) {
  if (!value) return ''

  const input = value.toLowerCase()

  const multiMap: Array<[string, string]> = [
    ['sh', 'ܫ'],
    ['kh', 'ܟ'],
    ['ph', 'ܦ'],
    ['th', 'ܬ'],
    ['ch', 'ܟ'],
    ['ṭ', 'ܛ'],
    ['ṣ', 'ܨ'],
    ['ḥ', 'ܚ'],
    ['š', 'ܫ'],
    ['ʿ', 'ܥ'],
    ['ʾ', 'ܐ'],
  ]

  const singleMap: Record<string, string> = {
    a: 'ܐ',
    b: 'ܒ',
    g: 'ܓ',
    d: 'ܕ',
    h: 'ܗ',
    w: 'ܘ',
    z: 'ܙ',
    y: 'ܝ',
    k: 'ܟ',
    l: 'ܠ',
    m: 'ܡ',
    n: 'ܢ',
    s: 'ܣ',
    p: 'ܦ',
    q: 'ܩ',
    r: 'ܪ',
    t: 'ܬ',
    e: '',
    i: '',
    o: '',
    u: '',
    f: 'ܦ',
    v: 'ܒ',
    c: 'ܟ',
    j: 'ܓ',
    x: 'ܟ',
  }

  let result = ''
  let i = 0

  while (i < input.length) {
    if (input[i] === ' ') {
      result += ' '
      i += 1
      continue
    }

    let matched = false

    for (const [latin, syriac] of multiMap) {
      if (input.slice(i, i + latin.length) === latin) {
        result += syriac
        i += latin.length
        matched = true
        break
      }
    }

    if (matched) continue

    const current = input[i]
    result += singleMap[current] ?? ''
    i += 1
  }

  return result.replace(/\s+/g, ' ').trim()
}

function statusBoxStyle(color: string, bg: string, border: string): React.CSSProperties {
  return {
    fontSize: '0.82rem',
    fontWeight: 600,
    color,
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: 10,
    padding: '0.75rem 0.9rem',
  }
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.74rem',
  fontWeight: 700,
  color: '#6b7280',
  marginBottom: '0.45rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '42px',
  border: '1px solid #d1d5db',
  borderRadius: '10px',
  padding: '0 12px',
  background: '#fff',
}

function tabButtonStyle(active: boolean): React.CSSProperties {
  return {
    border: 'none',
    borderBottom: active ? '2px solid #10b981' : '2px solid transparent',
    background: 'none',
    color: active ? '#10b981' : '#6b7280',
    fontWeight: active ? 700 : 500,
    padding: '8px 4px',
    cursor: 'pointer',
  }
}

export default function WordForm({
  editingWord,
  onAdd,
  onUpdate,
  onCancel,
  categories,
}: WordFormProps) {
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM)

  const [inputLanguage, setInputLanguage] = useState<ResolveInputType>('turkish')
  const [inputValue, setInputValue] = useState('')

  const [resolveStatus, setResolveStatus] = useState<ResolveStatus>('idle')
  const [resolveMessage, setResolveMessage] = useState('')
  const [sedraStatus, setSedraStatus] = useState<SedraStatus>('idle')

  const [showResolvedForm, setShowResolvedForm] = useState(false)
  const [manualMode, setManualMode] = useState(false)

  const [showImageModal, setShowImageModal] = useState(false)
  const [activeTab, setActiveTab] = useState<ImageTab>('wikimedia')
  const [fetchingImages, setFetchingImages] = useState(false)
  const [imageOptions, setImageOptions] = useState<string[]>([])
  const [imageSource, setImageSource] = useState<'Wikimedia Commons' | 'Pixabay' | ''>('')

  const [customUrl, setCustomUrl] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const [recording, setRecording] = useState(false)
  const [audioUploading, setAudioUploading] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    if (!editingWord) {
      resetWholeForm()
      return
    }

    const safeWord = editingWord as Word & {
      source?: string | null
      is_verified?: boolean | null
      sedra_verified?: boolean | null
      notes?: string | null
      category_id?: string | null
      root?: string | null
    }

    const nextForm: FormState = {
      turkish: safeWord.turkish || '',
      english: safeWord.english || '',
      syriac: safeWord.syriac || '',
      transliteration:
        safeWord.transliteration || transliterateSyriac(safeWord.syriac || ''),
      root: safeWord.root || '',
      word_type: safeWord.word_type || 'isim',
      image_url: safeWord.image_url || '',
      audio_url: safeWord.audio_url || '',
      source: safeWord.source || 'manual',
      is_verified: safeWord.is_verified ?? false,
      sedra_verified: safeWord.sedra_verified ?? false,
      notes: safeWord.notes || '',
      practice_group: safeWord.practice_group ?? null,
      category_id: safeWord.category_id || '',
      image_verification_note: '',
      image_verification_status: 'pending',
    }

    setFormData(nextForm)
    setInputLanguage('turkish')
    setInputValue(safeWord.turkish || '')
    setResolveStatus('success')
    setResolveMessage('Düzenleme modu hazır.')
    setSedraStatus(safeWord.sedra_verified ? 'found' : 'idle')
    setShowResolvedForm(true)
    setManualMode(false)
  }, [editingWord])

  const canResolve = useMemo(() => clean(inputValue).length > 0, [inputValue])

  const canOpenImages = useMemo(() => {
    return !!(clean(formData.english) || clean(formData.turkish))
  }, [formData.english, formData.turkish])

  function resetWholeForm() {
    setFormData(EMPTY_FORM)
    setInputLanguage('turkish')
    setInputValue('')
    setResolveStatus('idle')
    setResolveMessage('')
    setSedraStatus('idle')
    setShowResolvedForm(false)
    setCustomUrl('')
    setUploadFile(null)
    setRecording(false)
    setAudioUploading(false)
    setManualMode(false)
  }

  function openManualForm() {
    setManualMode(true)
    setShowResolvedForm(true)
    setResolveStatus('success')
    setResolveMessage('Manuel giriş modu açık. Alanları doldurup kaydedin.')
    setSedraStatus('idle')

    setFormData((prev) => ({
      ...EMPTY_FORM,
      ...prev,
      source: 'manual',
      word_type: prev.word_type || 'isim',
      category_id: prev.category_id || '',
      image_url: prev.image_url || '',
      audio_url: prev.audio_url || '',
      image_verification_note: prev.image_verification_note || '',
      image_verification_status: prev.image_verification_status || 'pending',
    }))
  }

  function applyResolvedData(data: Record<string, unknown>) {
    const incomingSyriac = clean(data.syriac)
    const incomingTrans =
      clean(data.transliteration) || (incomingSyriac ? transliterateSyriac(incomingSyriac) : '')

    const next: FormState = {
      ...EMPTY_FORM,
      ...formData,
      turkish: clean(data.turkish) || formData.turkish,
      english: clean(data.english) || formData.english,
      syriac: incomingSyriac || formData.syriac,
      transliteration: incomingTrans || formData.transliteration,
      root: clean(data.root) || formData.root,
      word_type: clean(data.word_type) || formData.word_type || 'diğer',
      source: clean(data.source) || 'ai',
      is_verified: Boolean(data.is_verified),
      sedra_verified: Boolean(data.sedra_verified),
      notes:
        clean(data.notes) ||
        (Boolean(data.sedra_verified)
          ? 'SEDRA üzerinden doğrulandı.'
          : 'AI çözümlemesi ile getirildi.'),
      category_id: formData.category_id || '',
      image_url: formData.image_url || '',
      audio_url: formData.audio_url || '',
      image_verification_note: formData.image_verification_note || '',
      image_verification_status: formData.image_verification_status || 'pending',
    }

    setFormData(next)
    setShowResolvedForm(true)
    setManualMode(false)

    if (Boolean(data.sedra_checked)) {
      setSedraStatus(Boolean(data.sedra_found) ? 'found' : 'not_found')
    } else {
      setSedraStatus('idle')
    }
  }

  async function resolveWord() {
    const rawValue = clean(inputValue)
    if (!rawValue) return

    setResolveStatus('loading')
    setResolveMessage('Sözcük çözümleme başlatıldı...')
    setSedraStatus(
      inputLanguage === 'english' || inputLanguage === 'syriac' ? 'checking' : 'idle'
    )

    try {
      let requestInput = rawValue
      let requestType: ResolveInputType = inputLanguage

      if (inputLanguage === 'transliteration') {
        const syriacCandidate = latinToSyriac(rawValue)
        requestInput = syriacCandidate || rawValue
        requestType = 'syriac'
      }

      const res = await fetch('/api/word-resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: requestInput, inputType: requestType }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(clean(data?.error) || 'Çözümleme başarısız oldu.')
      }

      applyResolvedData(data)
      setResolveStatus('success')
      setResolveMessage('Sözcük çözümlendi. Alanları kontrol edip kaydedin.')
    } catch (error) {
      console.error('word-resolve error:', error)
      setResolveStatus('error')
      setResolveMessage(error instanceof Error ? error.message : 'Beklenmeyen hata oluştu.')
      setShowResolvedForm(false)
      if (inputLanguage === 'english' || inputLanguage === 'syriac') {
        setSedraStatus('not_found')
      }
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target

    setFormData((prev) => {
      const next = {
        ...prev,
        [name]: value,
      }

      if (name === 'syriac') {
        const auto = transliterateSyriac(value)
        next.transliteration = auto || prev.transliteration
      }

      return next
    })
  }

  const handleSpecialChar = (char: string) => {
    setFormData((prev) => ({
      ...prev,
      transliteration: `${prev.transliteration || ''}${char}`,
    }))
  }

  const handleFetchImages = async (source: 'wikimedia' | 'pixabay') => {
    const searchTerm = clean(formData.english) || clean(formData.turkish)
    if (!searchTerm) return

    setFetchingImages(true)
    setImageOptions([])
    setImageSource(source === 'wikimedia' ? 'Wikimedia Commons' : 'Pixabay')

    try {
      let urls: string[] = []

      if (source === 'wikimedia') {
        const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(searchTerm)}&gsrlimit=9&prop=imageinfo&iiprop=url`
        const wikiRes = await fetch(wikiUrl)
        const wikiData = await wikiRes.json()

        if (wikiData?.query?.pages) {
          const pages = Object.values(wikiData.query.pages) as Array<{
            imageinfo?: Array<{ url?: string }>
          }>
          urls = pages.map((p) => p.imageinfo?.[0]?.url || '').filter(Boolean)
        }
      } else {
        const pixabayKey = process.env.NEXT_PUBLIC_PIXABAY_KEY

        if (pixabayKey) {
          const pixabayUrl = `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(
            searchTerm
          )}&image_type=photo&per_page=9`

          const pixabayRes = await fetch(pixabayUrl)

          if (pixabayRes.ok) {
            const pixabayData = await pixabayRes.json()
            urls = (pixabayData?.hits || [])
              .map((img: { webformatURL?: string }) => img?.webformatURL || '')
              .filter(Boolean)
          }
        }
      }

      setImageOptions(urls)
    } catch (error) {
      console.error('Görsel çekme hatası:', error)
    } finally {
      setFetchingImages(false)
    }
  }

  const handleOpenImageModal = () => {
    if (!canOpenImages) return
    setShowImageModal(true)
    setActiveTab('wikimedia')
    void handleFetchImages('wikimedia')
  }

  const handleSelectImage = (url: string) => {
    setFormData((prev) => ({ ...prev, image_url: url }))
    setShowImageModal(false)
  }

  const handleFileUpload = async () => {
    if (!uploadFile) return

    setUploading(true)

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const fileExt = uploadFile.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`
      const filePath = `words/${fileName}`

      const { error } = await supabase.storage
        .from('images')
        .upload(filePath, uploadFile, { cacheControl: '3600', upsert: false })

      if (error) throw error

      const { data: publicUrlData } = supabase.storage.from('images').getPublicUrl(filePath)
      handleSelectImage(publicUrlData.publicUrl)
    } catch (err) {
      console.error('Upload error:', err)
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      alert(`Yükleme başarısız: ${message}`)
    } finally {
      setUploading(false)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = async () => {
        setRecording(false)
        setAudioUploading(true)

        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })

          const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          )

          const filePath = `audios/${Date.now()}-${Math.random().toString(36).slice(2)}.webm`

          const { error } = await supabase.storage
            .from('word-media')
            .upload(filePath, audioBlob, {
              contentType: 'audio/webm',
              upsert: false,
            })

          if (error) throw error

          const { data } = supabase.storage.from('word-media').getPublicUrl(filePath)

          setFormData((prev) => ({
            ...prev,
            audio_url: data.publicUrl,
          }))
        } catch (error) {
          console.error('Audio upload error:', error)
          alert('Ses yükleme başarısız oldu.')
        } finally {
          setAudioUploading(false)
          stream.getTracks().forEach((track) => track.stop())
        }
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch (error) {
      console.error('Recording error:', error)
      alert('Mikrofon izni alınamadı.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload: AddWordPayload = {
      turkish: clean(formData.turkish),
      english: clean(formData.english),
      syriac: clean(formData.syriac),
      transliteration: clean(formData.transliteration),
      root: clean(formData.root) || null,
      word_type: formData.word_type,
      image_url: clean(formData.image_url) || null,
      audio_url: clean(formData.audio_url) || null,
      source: clean(formData.source) || 'manual',
      is_verified: formData.is_verified ?? false,
      sedra_verified: formData.sedra_verified ?? false,
      notes: clean(formData.notes) || null,
      practice_group: formData.practice_group ?? null,
      category_id: clean(formData.category_id) || null,
    }

    if (editingWord) {
      await onUpdate(editingWord.id, payload)
      return
    }

    await onAdd(payload)
  }

  function renderResolveStatus() {
    if (resolveStatus === 'idle') {
      return (
        <div style={statusBoxStyle('#6b7280', '#f8fafc', '#e5e7eb')}>
          Giriş dili ve sözcüğü seçip çözümlemeyi başlatın.
        </div>
      )
    }

    if (resolveStatus === 'loading') {
      return (
        <div style={statusBoxStyle('#1d4ed8', '#eff6ff', '#bfdbfe')}>
          ⏳ {resolveMessage || 'Çözümleme sürüyor...'}
        </div>
      )
    }

    if (resolveStatus === 'success') {
      return (
        <div style={statusBoxStyle('#166534', '#ecfdf5', '#bbf7d0')}>
          ✅ {resolveMessage}
        </div>
      )
    }

    return (
      <div style={statusBoxStyle('#b91c1c', '#fef2f2', '#fecaca')}>
        ⚠ {resolveMessage}
      </div>
    )
  }

  function renderSedraInfo() {
    if (sedraStatus === 'idle') {
      return (
        <div style={statusBoxStyle('#6b7280', '#f8fafc', '#e5e7eb')}>
          — Sedra kontrolü yapılmadı
        </div>
      )
    }

    if (sedraStatus === 'checking') {
      return (
        <div style={statusBoxStyle('#1d4ed8', '#eff6ff', '#bfdbfe')}>
          ⏳ Sedra kontrol ediliyor
        </div>
      )
    }

    if (sedraStatus === 'found') {
      return (
        <div style={statusBoxStyle('#166534', '#ecfdf5', '#bbf7d0')}>
          ✅ Sedra’da doğrulandı
        </div>
      )
    }

    return (
      <div style={statusBoxStyle('#b45309', '#fffbeb', '#fcd34d')}>
        ⚠ Sedra’da bulunamadı
      </div>
    )
  }

  return (
    <>
      <section
        className="card"
        style={{
          padding: '1.25rem',
          marginBottom: '1.25rem',
          border: '1px solid var(--color-border)',
          borderRadius: '16px',
          background: 'var(--color-surface, #fff)',
        }}
      >
        <h3
          style={{
            marginBottom: '1rem',
            fontSize: '1.15rem',
            fontWeight: 700,
            color: 'var(--color-text)',
          }}
        >
          {editingWord ? '✏️ Sözcük Düzenleme Motoru' : '⚡ Akıllı Sözcük Çözümleyici'}
        </h3>

        {renderResolveStatus()}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginTop: '14px',
            marginBottom: '10px',
            flexWrap: 'wrap',
          }}
        >
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.9rem',
              color: '#374151',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={manualMode}
              onChange={(e) => {
                if (e.target.checked) {
                  openManualForm()
                } else {
                  setManualMode(false)
                  setShowResolvedForm(false)
                  setResolveStatus('idle')
                  setResolveMessage('')
                }
              }}
            />
            Manuel giriş modu
          </label>
        </div>

        {!manualMode && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '220px 1fr auto auto',
              gap: '12px',
              marginTop: '14px',
              alignItems: 'end',
            }}
          >
            <div>
              <label style={labelStyle}>Giriş Dili</label>
              <select
                value={inputLanguage}
                onChange={(e) => setInputLanguage(e.target.value as ResolveInputType)}
                style={inputStyle}
              >
                {INPUT_LANGUAGE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Sözcük Girişi</label>
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  inputLanguage === 'syriac'
                    ? 'ܟܬܒܐ'
                    : inputLanguage === 'transliteration'
                    ? 'ktābā / ktaba'
                    : 'Sözcük girin'
                }
                style={{
                  ...inputStyle,
                  direction: inputLanguage === 'syriac' ? 'rtl' : 'ltr',
                  fontFamily:
                    inputLanguage === 'syriac' ? 'Estrangelo Edessa, serif' : 'inherit',
                  fontSize: inputLanguage === 'syriac' ? '1.15rem' : '1rem',
                }}
              />
            </div>

            <button
              type="button"
              onClick={resolveWord}
              disabled={!canResolve || resolveStatus === 'loading'}
              style={{
                height: '42px',
                minWidth: '120px',
                border: 'none',
                borderRadius: '10px',
                background: !canResolve || resolveStatus === 'loading' ? '#9ca3af' : '#0f766e',
                color: '#fff',
                fontWeight: 700,
                cursor: !canResolve || resolveStatus === 'loading' ? 'not-allowed' : 'pointer',
                padding: '0 16px',
              }}
            >
              {resolveStatus === 'loading' ? 'Çözülüyor...' : 'Çözümle'}
            </button>

            <button
              type="button"
              onClick={resetWholeForm}
              style={{
                height: '42px',
                minWidth: '110px',
                border: '1px solid #d1d5db',
                borderRadius: '10px',
                background: '#fff',
                color: '#b91c1c',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '0 16px',
              }}
            >
              Temizle
            </button>
          </div>
        )}

        {manualMode && (
          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginTop: '14px',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={resetWholeForm}
              style={{
                height: '42px',
                minWidth: '110px',
                border: '1px solid #d1d5db',
                borderRadius: '10px',
                background: '#fff',
                color: '#b91c1c',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '0 16px',
              }}
            >
              Temizle
            </button>
          </div>
        )}
      </section>

      {showResolvedForm && (
        <section
          className="card"
          style={{
            padding: '1.25rem',
            marginBottom: '2rem',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            background: 'var(--color-surface, #fff)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: '1.15rem',
                fontWeight: 700,
                color: 'var(--color-text)',
              }}
            >
              {editingWord
                ? '✏️ Sözcük Kaydını Düzenle'
                : manualMode
                ? '🖊️ Manuel Sözcük Kaydı'
                : '🧩 Sözcük Kaydı'}
            </h3>
          </div>

          {renderSedraInfo()}

          <form
            onSubmit={handleSubmit}
            style={{
              display: 'grid',
              gap: '16px',
              marginTop: '16px',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px',
              }}
            >
              <div>
                <label style={labelStyle}>Türkçe</label>
                <input
                  name="turkish"
                  value={formData.turkish}
                  onChange={handleChange}
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>İngilizce</label>
                <input
                  name="english"
                  value={formData.english}
                  onChange={handleChange}
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>Süryanice</label>
                <input
                  name="syriac"
                  value={formData.syriac}
                  onChange={handleChange}
                  style={{
                    ...inputStyle,
                    direction: 'rtl',
                    fontFamily: 'Estrangelo Edessa, serif',
                    fontSize: '1.15rem',
                  }}
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>Transliterasyon</label>
                <input
                  name="transliteration"
                  value={formData.transliteration}
                  onChange={handleChange}
                  style={inputStyle}
                  required
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                  {SPECIAL_CHARS.map((item) => (
                    <button
                      key={item.char}
                      type="button"
                      onClick={() => handleSpecialChar(item.char)}
                      style={{
                        minWidth: '34px',
                        height: '28px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        background: '#fff',
                        cursor: 'pointer',
                      }}
                      title={item.label}
                    >
                      {item.char}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Kök (Root)</label>
                <input
                  name="root"
                  value={formData.root || ''}
                  onChange={handleChange}
                  placeholder="örn: k-t-b"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Kelime Türü</label>
                <select
                  name="word_type"
                  value={formData.word_type}
                  onChange={handleChange}
                  style={inputStyle}
                  required
                >
                  {TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Kategori</label>
                <select
                  name="category_id"
                  value={formData.category_id || ''}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  <option value="">Kategori seç</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Kaynak</label>
                <select
                  name="source"
                  value={formData.source || 'manual'}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  <option value="manual">manual</option>
                  <option value="database">database</option>
                  <option value="sedra">sedra</option>
                  <option value="ai">ai</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Görsel URL</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    name="image_url"
                    value={formData.image_url || ''}
                    onChange={handleChange}
                    placeholder="https://..."
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleOpenImageModal}
                    disabled={!canOpenImages}
                    style={{
                      width: '42px',
                      height: '42px',
                      border: 'none',
                      borderRadius: '10px',
                      background: formData.image_url ? '#10b981' : '#f59e0b',
                      color: '#fff',
                      cursor: !canOpenImages ? 'not-allowed' : 'pointer',
                    }}
                    title="Görsel seç"
                  >
                    🖼️
                  </button>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Ses URL</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    name="audio_url"
                    value={formData.audio_url || ''}
                    onChange={handleChange}
                    placeholder="https://..."
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={recording ? stopRecording : startRecording}
                    disabled={audioUploading}
                    style={{
                      width: '42px',
                      height: '42px',
                      border: 'none',
                      borderRadius: '10px',
                      background: recording ? '#ef4444' : '#0ea5e9',
                      color: '#fff',
                      cursor: audioUploading ? 'not-allowed' : 'pointer',
                    }}
                    title="Ses kaydet"
                  >
                    {audioUploading ? '⏳' : recording ? '⏹' : '🎙️'}
                  </button>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Görsel Doğrulama Durumu</label>
                <select
                  name="image_verification_status"
                  value={formData.image_verification_status || 'pending'}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  <option value="pending">pending</option>
                  <option value="verified">verified</option>
                  <option value="rejected">rejected</option>
                </select>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '14px',
              }}
            >
              <div>
                <label style={labelStyle}>Notlar</label>
                <textarea
                  name="notes"
                  value={formData.notes || ''}
                  onChange={handleChange}
                  placeholder="Sözcük ile ilgili not..."
                  style={{
                    ...inputStyle,
                    minHeight: '110px',
                    resize: 'vertical',
                    paddingTop: '10px',
                  }}
                />
              </div>

              <div>
                <label style={labelStyle}>Görsel Doğrulama Notu</label>
                <textarea
                  name="image_verification_note"
                  value={formData.image_verification_note || ''}
                  onChange={handleChange}
                  placeholder="İleride Sedra / görsel doğrulama için not alanı..."
                  style={{
                    ...inputStyle,
                    minHeight: '110px',
                    resize: 'vertical',
                    paddingTop: '10px',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={onCancel}
                style={{
                  height: '42px',
                  borderRadius: '10px',
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  color: '#ef4444',
                  cursor: 'pointer',
                  padding: '0 18px',
                  fontWeight: 700,
                }}
              >
                İptal
              </button>

              <button
                type="submit"
                style={{
                  height: '42px',
                  border: 'none',
                  borderRadius: '10px',
                  background: '#10b981',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '0 18px',
                }}
              >
                {editingWord ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </form>
        </section>
      )}

      {showImageModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '760px',
              maxHeight: '85vh',
              overflow: 'hidden',
              background: '#fff',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#1A5F6E' }}>
                Görsel Seç{' '}
                <span style={{ color: '#666', fontWeight: 400 }}>
                  ({formData.english || formData.turkish})
                </span>
              </h4>

              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('wikimedia')
                  void handleFetchImages('wikimedia')
                }}
                style={tabButtonStyle(activeTab === 'wikimedia')}
              >
                Wikimedia
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('pixabay')
                  void handleFetchImages('pixabay')
                }}
                style={tabButtonStyle(activeTab === 'pixabay')}
              >
                Pixabay
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('url')}
                style={tabButtonStyle(activeTab === 'url')}
              >
                URL
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                style={tabButtonStyle(activeTab === 'upload')}
              >
                Yükle
              </button>
            </div>

            {(activeTab === 'wikimedia' || activeTab === 'pixabay') && (
              <div style={{ overflowY: 'auto' }}>
                {fetchingImages ? (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    ⏳ Görseller aranıyor...
                  </div>
                ) : imageOptions.length > 0 ? (
                  <>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                        gap: '12px',
                      }}
                    >
                      {imageOptions.map((url, i) => (
                        <button
                          key={`${url}-${i}`}
                          type="button"
                          onClick={() => handleSelectImage(url)}
                          style={{
                            border:
                              formData.image_url === url
                                ? '3px solid #10b981'
                                : '1px solid #ddd',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            padding: 0,
                            background: '#fff',
                            cursor: 'pointer',
                            aspectRatio: '1 / 1',
                          }}
                        >
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              backgroundImage: `url(${url})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          />
                        </button>
                      ))}
                    </div>

                    {imageSource && (
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: '#666',
                          marginTop: '12px',
                          textAlign: 'center',
                        }}
                      >
                        Kaynak: <strong>{imageSource}</strong>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
                    Görsel bulunamadı.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'url' && (
              <div style={{ display: 'grid', gap: '12px' }}>
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://ornek.com/resim.jpg"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => handleSelectImage(customUrl)}
                  disabled={!customUrl}
                  style={{
                    height: '42px',
                    border: 'none',
                    borderRadius: '10px',
                    background: customUrl ? '#10b981' : '#9ca3af',
                    color: '#fff',
                    fontWeight: 700,
                  }}
                >
                  Bu görseli kullan
                </button>
              </div>
            )}

            {activeTab === 'upload' && (
              <div style={{ display: 'grid', gap: '12px' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={handleFileUpload}
                  disabled={!uploadFile || uploading}
                  style={{
                    height: '42px',
                    border: 'none',
                    borderRadius: '10px',
                    background: !uploadFile || uploading ? '#9ca3af' : '#10b981',
                    color: '#fff',
                    fontWeight: 700,
                  }}
                >
                  {uploading ? 'Yükleniyor...' : 'Yükle ve kullan'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}