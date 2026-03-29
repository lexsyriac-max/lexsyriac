'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Word, TYPE_OPTIONS, SPECIAL_CHARS } from '@/lib/types/words'
import { AddWordPayload } from '@/lib/services/db'
import { trToEn, enToTr } from '@/lib/services/translate'
import {
  verifySyriac,
  claudeToSyriac,
  toTranslit,
  sedraToWordType,
  SedraResult,
} from '@/lib/services/sedra'
import AudioRecorder from './AudioRecorder'
import ImagePicker from './ImagePicker'

interface Props {
  editingWord?: Word | null
  onAdd: (payload: AddWordPayload) => Promise<{ error: string | null }>
  onUpdate: (id: string, payload: AddWordPayload) => Promise<{ error: string | null }>
  onCancel: () => void
}

type SyriacSource = 'manual' | 'claude' | 'sedra'

export default function WordForm({
  editingWord,
  onAdd,
  onUpdate,
  onCancel,
}: Props) {
  const isEditMode = !!editingWord

  const [turkish, setTurkish] = useState('')
  const [english, setEnglish] = useState('')
  const [syriac, setSyriac] = useState('')
  const [translit, setTranslit] = useState('')
  const [wordType, setWordType] = useState('isim')
  const [practiceGroup, setPracticeGroup] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [imageError, setImgErr] = useState(false)
  const [syriacSource, setSySource] = useState<SyriacSource>('manual')
  const [sedraResult, setSedra] = useState<SedraResult | null>(null)

  const [translating, setTranslating] = useState(false)
  const [sedraLoading, setSedraLoading] = useState(false)
  const [fetchingClaude, setFetchingClaude] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showImgPicker, setShowImgPicker] = useState(false)
  const [autoImgTriggered, setAutoImg] = useState(false)

  const timerTR = useRef<NodeJS.Timeout | null>(null)
  const timerEN = useRef<NodeJS.Timeout | null>(null)

  const enRef = useRef('')
  const trRef = useRef('')
  const syRef = useRef('')
  const enFilled = useRef(false)
  const trFilled = useRef(false)

  const setEnRef = (v: string) => {
    enRef.current = v
    setEnglish(v)
  }

  const setTrRef = (v: string) => {
    trRef.current = v
    setTurkish(v)
  }

  const setSyRef = (v: string) => {
    syRef.current = v
    setSyriac(v)
  }

  function reset() {
    setTurkish('')
    setEnglish('')
    setSyriac('')
    setTranslit('')
    setWordType('isim')
    setPracticeGroup('')
    setImageUrl('')
    setAudioUrl('')
    setImgErr(false)
    setSySource('manual')
    setSedra(null)
    setError('')
    enRef.current = ''
    trRef.current = ''
    syRef.current = ''
    enFilled.current = false
    trFilled.current = false
    setAutoImg(false)
  }

  useEffect(() => {
    if (!editingWord) {
      reset()
      return
    }

    setTurkish(editingWord.turkish || '')
    setEnglish(editingWord.english || '')
    setSyriac(editingWord.syriac || '')
    setTranslit(editingWord.transliteration || '')
    setWordType(editingWord.word_type || 'isim')
    setPracticeGroup(editingWord.practice_group || '')
    setImageUrl(editingWord.image_url || '')
    setAudioUrl(editingWord.audio_url || '')
    setImgErr(false)
    setSySource('manual')
    setSedra(null)
    setError('')
    setAutoImg(true)

    trRef.current = editingWord.turkish || ''
    enRef.current = editingWord.english || ''
    syRef.current = editingWord.syriac || ''
    trFilled.current = !!editingWord.turkish
    enFilled.current = !!editingWord.english
  }, [editingWord])

  function checkAllEmpty(tr: string, en: string, sy: string, tl: string) {
    const allEmpty = !tr.trim() && !en.trim() && !sy.trim() && !tl.trim()
    if (allEmpty && !isEditMode) {
      reset()
    }
  }

  function handleTurkishChange(v: string) {
    setTrRef(v)
    trFilled.current = !!v.trim()
    checkAllEmpty(v, enRef.current, syRef.current, translit)

    if (timerTR.current) clearTimeout(timerTR.current)
    if (!v.trim()) return

    timerTR.current = setTimeout(async () => {
      if (v.trim().length < 2) return
      if (!enFilled.current) {
        setTranslating(true)
        const en = await trToEn(v)
        if (en && !enFilled.current) {
          setEnRef(en)
          enFilled.current = true
          await autoFetchSyriac(en, v)
          if (!isEditMode) triggerAutoImage(en)
        }
        setTranslating(false)
      }
    }, 800)
  }

  function handleEnglishChange(v: string) {
    setEnRef(v)
    enFilled.current = !!v.trim()
    checkAllEmpty(trRef.current, v, syRef.current, translit)

    if (timerEN.current) clearTimeout(timerEN.current)
    if (!v.trim()) return

    timerEN.current = setTimeout(async () => {
      if (v.trim().length < 2) return

      if (!trFilled.current) {
        setTranslating(true)
        const tr = await enToTr(v)
        if (tr && !trFilled.current) {
          setTrRef(tr)
          trFilled.current = true
        }
        setTranslating(false)
      }

      await autoFetchSyriac(v, trRef.current)
      if (!isEditMode) triggerAutoImage(v)
    }, 800)
  }

  async function autoFetchSyriac(en: string, tr: string) {
    if (syRef.current.trim()) return

    setFetchingClaude(true)
    setSedra(null)

    const claudeSy = await claudeToSyriac(en, tr)
    if (!claudeSy) {
      setFetchingClaude(false)
      return
    }

    setSyRef(claudeSy)
    setTranslit(toTranslit(claudeSy))
    setSySource('claude')

    setSedraLoading(true)
    const result = await verifySyriac(claudeSy)
    setSedra(result)

    if (result?.verified && result.transliteration) {
      setTranslit(result.transliteration)
      setSySource('sedra')
    }

    setSedraLoading(false)
    setFetchingClaude(false)
  }

  async function handleManualSedra() {
    if (!syRef.current.trim()) {
      setError('Önce Süryanice alanını doldurun.')
      return
    }

    setSedraLoading(true)
    setSedra(null)

    const result = await verifySyriac(syRef.current.trim())
    setSedra(result)

    if (result?.transliteration) setTranslit(result.transliteration)
    if (result?.verified) setSySource('sedra')

    setSedraLoading(false)
  }

  function handleSedraAccept() {
    if (!sedraResult) return

    const sy = sedraResult.syriac || syRef.current
    if (sy) setSyRef(sy)

    if (sedraResult.transliteration) setTranslit(sedraResult.transliteration)
    setSySource('sedra')

    if (sedraResult.category) {
      const mapped = sedraToWordType(sedraResult.category)
      if (mapped) setWordType(mapped)
    }
  }

  function triggerAutoImage(query: string) {
    if (autoImgTriggered) return
    setAutoImg(true)
    setTimeout(() => setShowImgPicker(true), 600)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

    if (!turkish.trim() || !english.trim() || !syriac.trim() || !translit.trim()) {
      setError('Türkçe, İngilizce, Süryanice ve Transliterasyon zorunludur.')
      return
    }

    setSaving(true)
    setError('')

    const payload: AddWordPayload = {
      turkish,
      english,
      syriac,
      transliteration: translit,
      word_type: wordType,
      practice_group: practiceGroup || null,
      image_url: imageUrl || null,
      audio_url: audioUrl || null,
    }

    const result =
      isEditMode && editingWord
        ? await onUpdate(editingWord.id, payload)
        : await onAdd(payload)

    if (result.error) {
      setError(result.error)
      setSaving(false)
      return
    }

    reset()
    onCancel()
    setSaving(false)
  }

  const SyriacBadge = () => {
    const m = {
      manual: null,
      claude: <Badge bg="#FEF3C7" c="#92400E">Claude tahmini</Badge>,
      sedra: <Badge bg="#ECFDF5" c="#065F46">✅ Sedra onaylı</Badge>,
    }
    return syriac ? m[syriacSource] : null
  }

  return (
    <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
        }}
      >
        <h2
          style={{
            fontSize: '1.1rem',
            fontWeight: 600,
            color: 'var(--color-text)',
            margin: 0,
          }}
        >
          {isEditMode ? 'Kelimeyi Düzenle' : 'Yeni Kelime Ekle'}
        </h2>

        {translating && <Pill color="#C4893A">⟳ çevriliyor...</Pill>}
        {fetchingClaude && <Pill color="var(--color-primary)">⟳ Süryanice tahmin...</Pill>}
        {sedraLoading && <Pill color="#10B981">⟳ Sedra doğrulanıyor...</Pill>}
      </div>

      {error && (
        <div
          style={{
            marginBottom: '1rem',
            background: '#FFF7F7',
            border: '1px solid #E5C7C7',
            color: '#A94442',
            borderRadius: 10,
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          {error}
          <button
            onClick={() => setError('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A94442' }}
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={LS}>Türkçe *</label>
            <input
              value={turkish}
              onChange={(e) => handleTurkishChange(e.target.value)}
              className="input"
              placeholder="Türkçe kelime..."
              required
            />
            <p style={HS}>Yazınca İngilizce otomatik dolar</p>
          </div>

          <div>
            <label style={LS}>İngilizce *</label>
            <input
              value={english}
              onChange={(e) => handleEnglishChange(e.target.value)}
              className="input"
              placeholder="English word..."
              required
            />
            <p style={HS}>Yazınca Türkçe + Süryanice + görsel otomatik gelir</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <label style={{ ...LS, marginBottom: 0 }}>Süryanice *</label>
              <SyriacBadge />
            </div>

            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <input
                value={syriac}
                onChange={(e) => {
                  setSyRef(e.target.value)
                  setSySource('manual')
                  setSedra(null)
                  if (!translit) setTranslit(toTranslit(e.target.value))
                  checkAllEmpty(trRef.current, enRef.current, e.target.value, translit)
                }}
                className="input"
                placeholder="ܣܘܪܝܝܐ ..."
                required
                style={{
                  flex: 1,
                  direction: 'rtl',
                  fontFamily: 'serif',
                  fontSize: '1.15rem',
                }}
              />

              <button
                type="button"
                onClick={handleManualSedra}
                className="btn btn-secondary"
                style={{ padding: '0 0.85rem', whiteSpace: 'nowrap', minWidth: 85 }}
                disabled={sedraLoading}
              >
                {sedraLoading ? '...' : 'ܐ Sedra'}
              </button>
            </div>

            {sedraLoading && (
              <div style={sBox('#EEF4FF', '#3B82F6')}>
                ⟳ Sedra&apos;da doğrulanıyor...
              </div>
            )}

            {sedraResult &&
              (sedraResult.verified ? (
                <div style={sBox('#ECFDF5', '#10B981')}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '0.5rem',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700 }}>✅ SEDRA doğrulandı</span>
                      {sedraResult.category && (
                        <span style={{ marginLeft: '0.5rem', opacity: 0.8 }}>
                          · {sedraResult.category}
                        </span>
                      )}
                      {sedraResult.glosses_en && (
                        <div style={{ fontSize: '0.78rem', marginTop: '0.2rem' }}>
                          {sedraResult.glosses_en.join(' · ')}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={handleSedraAccept}
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.25rem 0.6rem',
                          borderRadius: 8,
                          background: '#065F46',
                          color: 'white',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        ✓ Kaydet
                      </button>

                      {sedraResult.sedra_url && (
                        <a
                          href={sedraResult.sedra_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.25rem 0.6rem',
                            borderRadius: 8,
                            background: 'rgba(6,95,70,0.12)',
                            color: '#065F46',
                            textDecoration: 'none',
                            fontWeight: 600,
                          }}
                        >
                          🔗 Sedra&apos;da Ara
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={sBox('#FFF7ED', '#F97316')}>
                  ⚠ Sedra&apos;da bulunamadı — Manuel girin
                </div>
              ))}

            <p style={HS}>Claude otomatik tahmin · Sedra ile doğrula · ✓ Kaydet ile onayla</p>
          </div>

          <div>
            <label style={LS}>Transliterasyon *</label>
            <input
              value={translit}
              onChange={(e) => {
                setTranslit(e.target.value)
                checkAllEmpty(trRef.current, enRef.current, syRef.current, e.target.value)
              }}
              className="input"
              placeholder="örn: ktāb, ʾEdta..."
              required
            />

            <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
              {SPECIAL_CHARS.map((c) => (
                <button
                  key={c.char}
                  type="button"
                  title={c.label}
                  onClick={() => setTranslit((p) => p + c.char)}
                  style={CBS}
                >
                  {c.char}
                </button>
              ))}
            </div>

            <p style={HS}>Süryanice girilince otomatik dolar</p>
          </div>
        </div>

        <div
          className="mobile-stack"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 200px',
            gap: '1rem',
            alignItems: 'start',
          }}
        >
          <div>
            <label style={LS}>Kelime Türü</label>
            <select value={wordType} onChange={(e) => setWordType(e.target.value)} className="input">
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={LS}>Pratik Grup</label>
            <select
              value={practiceGroup}
              onChange={(e) => setPracticeGroup(e.target.value)}
              className="input"
            >
              <option value="">Yok</option>
              <option value="pronouns">Zamirler</option>
              <option value="question">Soru Kelimeleri</option>
              <option value="conjunctions">Bağlaçlar</option>
              <option value="prepositions">İlgeçler</option>
              <option value="numbers">Sayılar</option>
              <option value="weekdays">Haftanın Günleri</option>
              <option value="months">Aylar</option>
            </select>
            <p style={HS}>Bu kelime hızlı pratik sayfasında ilgili başlık altında görünür.</p>
          </div>
                    <div>
            <label style={LS}>Görsel</label>
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem' }}>
              <input
                value={imageUrl}
                onChange={(e) => {
                  setImgErr(false)
                  setImageUrl(e.target.value)
                }}
                className="input"
                placeholder="URL veya ara"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={() => setShowImgPicker(true)}
                className="btn btn-secondary"
                style={{ padding: '0 0.6rem' }}
              >
                🔍
              </button>
            </div>

            <label
              style={{
                display: 'block',
                cursor: 'pointer',
                fontSize: '0.78rem',
                color: 'var(--color-text-muted)',
                padding: '0.35rem 0.6rem',
                border: '1px dashed var(--color-border)',
                borderRadius: 8,
                textAlign: 'center',
              }}
            >
              📁 Dosyadan yükle
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  const { uploadToStorage } = await import('@/lib/services/db')
                  const { data: url } = await uploadToStorage(f, 'image', f.name)
                  if (url) {
                    setImageUrl(url)
                    setImgErr(false)
                  }
                  e.target.value = ''
                }}
              />
            </label>
          </div>

          <div>
            <label style={LS}>Önizleme</label>
            <div
              style={{
                width: '100%',
                aspectRatio: '4/3',
                borderRadius: 10,
                border: '1.5px solid var(--color-border)',
                background: '#F5F5F0',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {imageUrl && !imageError ? (
                <Image
                  src={imageUrl}
                  alt="önizleme"
                  width={200}
                  height={150}
                  unoptimized
                  onError={() => setImgErr(true)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-muted)',
                    textAlign: 'center',
                    padding: '0 0.5rem',
                  }}
                >
                  {imageUrl && imageError ? '⚠ Yüklenemedi' : 'Görsel yok'}
                </span>
              )}
            </div>

            <div
              className="btn-group-mobile"
              style={{
                display: 'flex',
                gap: '0.4rem',
                flexWrap: 'wrap',
                marginTop: '0.4rem',
              }}
            >
              <button
                type="button"
                onClick={() => setShowImgPicker(true)}
                className="btn btn-secondary btn-sm"
              >
                {imageUrl ? '🔄 Değiştir' : '🖼 Görsel Seç'}
              </button>

              {imageUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl('')
                    setImgErr(false)
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  ✕ Kaldır
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label style={LS}>Ses Kaydı</label>
          <AudioRecorder
            existingAudio={audioUrl}
            onSave={(url) => setAudioUrl(url)}
            onChange={(url) => setAudioUrl(url)}
          />
        </div>

        <div
          className="btn-group-mobile"
          style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.25rem', flexWrap: 'wrap' }}
        >
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving
              ? 'Kaydediliyor...'
              : isEditMode
              ? '✓ Kelimeyi Güncelle'
              : '+ Kelimeyi Ekle'}
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              if (isEditMode && editingWord) {
                setTurkish(editingWord.turkish || '')
                setEnglish(editingWord.english || '')
                setSyriac(editingWord.syriac || '')
                setTranslit(editingWord.transliteration || '')
                setWordType(editingWord.word_type || 'isim')
                setPracticeGroup(editingWord.practice_group || '')
                setImageUrl(editingWord.image_url || '')
                setAudioUrl(editingWord.audio_url || '')
                setImgErr(false)
                setError('')
                return
              }
              reset()
            }}
          >
            Temizle
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              if (!isEditMode) reset()
              onCancel()
            }}
          >
            İptal
          </button>
        </div>
      </form>

      {showImgPicker && (
        <ImagePicker
          query={english || turkish}
          label={turkish && english ? `${turkish} · ${english}` : turkish || english}
          onSelect={(url) => {
            setImageUrl(url)
            setImgErr(false)
          }}
          onClose={() => setShowImgPicker(false)}
        />
      )}
    </div>
  )
}

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      style={{
        fontSize: '0.75rem',
        color,
        background: `${color}18`,
        padding: '0.2rem 0.6rem',
        borderRadius: 20,
      }}
    >
      {children}
    </span>
  )
}

function Badge({ children, bg, c }: { children: React.ReactNode; bg: string; c: string }) {
  return (
    <span
      style={{
        fontSize: '0.7rem',
        padding: '0.15rem 0.5rem',
        borderRadius: 20,
        background: bg,
        color: c,
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  )
}

function sBox(bg: string, c: string): React.CSSProperties {
  return {
    marginTop: '0.5rem',
    padding: '0.6rem 0.875rem',
    borderRadius: 10,
    background: bg,
    color: c,
    fontSize: '0.82rem',
    border: `1px solid ${c}33`,
  }
}

const LS: React.CSSProperties = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: 600,
  marginBottom: '0.35rem',
  color: 'var(--color-text)',
}

const HS: React.CSSProperties = {
  fontSize: '0.7rem',
  color: 'var(--color-text-muted)',
  marginTop: '0.3rem',
}

const CBS: React.CSSProperties = {
  padding: '0.2rem 0.45rem',
  borderRadius: 6,
  border: '1px solid var(--color-border)',
  background: '#F7F7F7',
  cursor: 'pointer',
  fontSize: '0.85rem',
  lineHeight: 1.2,
}