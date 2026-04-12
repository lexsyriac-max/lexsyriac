function applyRule(word: string, transformation: any, meta: any) {
  const tense = meta?.tense
  const person = meta?.person
  const number = meta?.number || 'singular'

  // 🔥 ROOT HER ZAMAN TEMEL
  const base = word

  /**
   * 🔥 1. DB RULE (EN YÜKSEK ÖNCELİK)
   */
  if (transformation && transformation.type) {
    const value = transformation.value || ''

    if (transformation.type === 'prefix') {
      return value + base
    }

    if (transformation.type === 'suffix') {
      return base + value
    }

    if (transformation.type === 'replace') {
      return value
    }
  }

  /**
   * 🔥 2. ROOT ENGINE
   */
  const rootResult = applyRootPattern(base, {
    tense,
    person,
    number,
  })

  if (rootResult) {
    return rootResult
  }

  /**
   * 🔥 3. MATRIX FALLBACK
   */
  if (
    conjugationMatrix[tense] &&
    conjugationMatrix[tense][person] &&
    conjugationMatrix[tense][person][number]
  ) {
    const affix = conjugationMatrix[tense][person][number]

    if (affix) {
      return affix + base
    }
  }

  /**
   * 🔥 4. DEFAULT
   */
  return base
}