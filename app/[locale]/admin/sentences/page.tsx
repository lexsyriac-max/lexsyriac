'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'

export default function SentenceBuilderAdvanced() {
  const locale = useLocale()

  const [words, setWords] = useState<any[]>([])
  const [subject, setSubject] = useState('ܐܢܐ')
  const [verb, setVerb] = useState('')
  const [object, setObject] = useState('')
  const [sentence, setSentence] = useState('')
  const [loading, setLoading] = useState(false)

  // 🔥 WORDS ÇEK
  useEffect(() => {
    fetch('/api/words')
      .then(res => res.json())
      .then(data => setWords(data || []))
  }, [])

  async function buildSentence() {
    setLoading(true)

    const res = await fetch('/api/sentences/build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject,
        word_text: verb,
        object,
        tense: 'past',
        person: '1st',
        number: 'singular',
      }),
    })

    const data = await res.json()

    setSentence(data.sentence || '')
    setLoading(false)
  }

  const verbs = words.filter(w => w.word_type === 'verb')
  const nouns = words.filter(w => w.word_type === 'noun')

  return (
    <main style={{ padding: '2rem' }}>
      
      <h1>Sentence Builder Advanced</h1>

      <Link href={`/${locale}/admin`}>← Admin</Link>

      {/* SUBJECT */}
      <div style={{ marginTop: '20px' }}>
        <label>Subject</label>
        <select value={subject} onChange={e => setSubject(e.target.value)}>
          <option value="ܐܢܐ">ܐܢܐ (Ben)</option>
          <option value="ܐܢܬ">ܐܢܬ (Sen)</option>
          <option value="ܗܘ">ܗܘ (O)</option>
        </select>
      </div>

      {/* VERB */}
      <div style={{ marginTop: '20px' }}>
        <label>Verb</label>
        <select value={verb} onChange={e => setVerb(e.target.value)}>
          <option value="">Seç</option>
          {verbs.map(v => (
            <option key={v.id} value={v.syriac}>
              {v.syriac} ({v.turkish})
            </option>
          ))}
        </select>
      </div>

      {/* OBJECT */}
      <div style={{ marginTop: '20px' }}>
        <label>Object</label>
        <select value={object} onChange={e => setObject(e.target.value)}>
          <option value="">Yok</option>
          {nouns.map(n => (
            <option key={n.id} value={n.syriac}>
              {n.syriac} ({n.turkish})
            </option>
          ))}
        </select>
      </div>

      {/* BUTTON */}
      <button
        onClick={buildSentence}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          background: 'black',
          color: 'white',
        }}
      >
        {loading ? 'Oluşturuluyor...' : 'Cümle Oluştur'}
      </button>

      {/* RESULT */}
      {sentence && (
        <div style={{ marginTop: '30px' }}>
          <h2>Sonuç</h2>
          <div style={{
            fontSize: '24px',
            direction: 'rtl',
            border: '1px solid #ddd',
            padding: '10px'
          }}>
            {sentence}
          </div>
        </div>
      )}
    </main>
  )
}