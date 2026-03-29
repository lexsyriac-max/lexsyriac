// components/DeleteAllButton.tsx
// 3 aşamalı güvenli silme — tamamen bağımsız, onDelete callback ile

'use client'

import { useState } from 'react'

interface Props {
  onDelete: () => Promise<void>
  disabled?: boolean
}

export default function DeleteAllButton({ onDelete, disabled }: Props) {
  const [step, setStep]           = useState(0)
  const [confirmText, setConfirm] = useState('')
  const [loading, setLoading]     = useState(false)

  function reset() { setStep(0); setConfirm('') }

  async function handleFinal() {
    if (confirmText !== 'SİL') return
    setLoading(true)
    await onDelete()
    setLoading(false)
    reset()
  }

  if (step === 0) return (
    <button onClick={() => setStep(1)} disabled={disabled}
      style={{ padding:'0.4rem 0.85rem', borderRadius:8, border:'1px solid #C0392B',
        background:'transparent', color:'#C0392B', cursor:'pointer', fontSize:'0.85rem', fontWeight:500 }}>
      🗑 Tümünü Sil
    </button>
  )

  if (step === 1) return (
    <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
      <span style={{ fontSize:'0.82rem', color:'#C0392B', fontWeight:600 }}>Emin misin?</span>
      <button onClick={() => setStep(2)}
        style={{ padding:'0.3rem 0.7rem', borderRadius:8, border:'1px solid #C0392B', background:'transparent', color:'#C0392B', cursor:'pointer', fontSize:'0.82rem' }}>
        Evet, devam
      </button>
      <button onClick={reset}
        style={{ padding:'0.3rem 0.7rem', borderRadius:8, border:'1px solid #ccc', background:'transparent', color:'#666', cursor:'pointer', fontSize:'0.82rem' }}>
        İptal
      </button>
    </div>
  )

  return (
    <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', flexWrap:'wrap' }}>
      <span style={{ fontSize:'0.82rem', color:'#C0392B', fontWeight:600 }}>
        Onaylamak için <strong>&quot;SİL&quot;</strong> yazın:
      </span>
      <input value={confirmText} onChange={e => setConfirm(e.target.value)}
        placeholder="SİL"
        style={{ width:70, padding:'0.3rem 0.5rem', border:'1.5px solid #C0392B', borderRadius:8, fontSize:'0.85rem', textAlign:'center' }} />
      <button onClick={handleFinal} disabled={confirmText !== 'SİL' || loading}
        style={{ padding:'0.3rem 0.7rem', borderRadius:8, border:'none',
          background: confirmText === 'SİL' ? '#C0392B' : '#eee',
          color: confirmText === 'SİL' ? 'white' : '#999', cursor: confirmText === 'SİL' ? 'pointer' : 'default', fontSize:'0.82rem' }}>
        {loading ? '⟳' : 'Sil'}
      </button>
      <button onClick={reset}
        style={{ padding:'0.3rem 0.7rem', borderRadius:8, border:'1px solid #ccc', background:'transparent', color:'#666', cursor:'pointer', fontSize:'0.82rem' }}>
        İptal
      </button>
    </div>
  )
}
