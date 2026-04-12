const SYRIAC_DIACRITICS_REGEX =
  /[\u0700-\u070F\u0730-\u074A\u074C-\u074F]/g

const SYRIAC_LETTER_TO_LATIN: Record<string, string> = {
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

export function stripSyriacDiacritics(value: string) {
  return value.replace(SYRIAC_DIACRITICS_REGEX, '')
}

export function normalizeSyriacForLookup(value: string) {
  return stripSyriacDiacritics(String(value || ''))
    .replace(/[^\u0710-\u072C\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function transliterateSyriac(value: string) {
  const normalized = normalizeSyriacForLookup(value)

  return normalized
    .split('')
    .map((char) => {
      if (char === ' ') return ' '
      return SYRIAC_LETTER_TO_LATIN[char] || ''
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}