'use client'

import { useState } from 'react'

export default function ConjugationPage() {
  const [word, setWord] = useState('')
  const [tense, setTense] = useState('past')
  const [person, setPerson] = useState('1st')
  const [number, setNumber] = useState('singular')
  const [result, setResult] = useState<any>(null)

  const handleGenerate = async () => {
    const res = await fetch('/api/grammar-rules/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        word_text: word,
        category: 'VERB',
        tense,
        person,
        number,
      }),
    })

    const data = await res.json()
    setResult(data)
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Conjugation Builder</h1>

      {/* INPUT */}
      <input
        value={word}
        onChange={(e) => setWord(e.target.value)}
        placeholder="ܟܬܒ"
        style={{ marginRight: '1rem' }}
      />

      {/* TENSE */}
      <select value={tense} onChange={(e) => setTense(e.target.value)}>
        <option value="past">Past</option>
      </select>

      {/* PERSON */}
      <select value={person} onChange={(e) => setPerson(e.target.value)}>
        <option value="1st">1st</option>
        <option value="2nd">2nd</option>
        <option value="3rd">3rd</option>
      </select>

      {/* NUMBER */}
      <select value={number} onChange={(e) => setNumber(e.target.value)}>
        <option value="singular">Singular</option>
        <option value="plural">Plural</option>
      </select>

      <button onClick={handleGenerate}>Generate</button>

      {/* RESULT */}
      {result && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Result</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}