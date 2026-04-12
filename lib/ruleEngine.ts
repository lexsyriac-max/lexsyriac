/**
 * RULE ENGINE - PHASE 4
 * Grammar rules'ları words'e uygulama logic
 */

export interface GrammarRule {
  id: number
  name: string
  category: string
  rule_text_en: string
  rule_text_tr: string
  rule_text_syc: string
  example_input: string
  example_output_en: string
  example_output_tr: string
  example_output_syc: string
  example_explanation_en: string
  example_explanation_tr: string
  difficulty_level: number
}

export interface Word {
  id: number
  word_tr: string
  word_syc: string
  word_en: string
  root?: string
  category?: string
}

export interface AppliedRuleResult {
  ruleId: number
  ruleName: string
  originalWord: string
  transformedWord: string
  explanation: string
  confidence: number // 0-1
}

export interface RuleApplicationResponse {
  wordId: number
  originalWord: string
  appliedRules: AppliedRuleResult[]
  transformedWords: string[]
}

/**
 * Simple string similarity (Levenshtein distance)
 * 1.0 = identical, 0.0 = completely different
 */
export function stringSimilarity(a: string, b: string): number {
  const longer = a.length > b.length ? a : b
  const shorter = a.length > b.length ? b : a

  if (longer.length === 0) return 1.0

  const editDistance = getEditDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

function getEditDistance(a: string, b: string): number {
  const costs = []
  for (let i = 0; i <= a.length; i++) {
    let lastValue = i
    for (let j = 0; j <= b.length; j++) {
      if (i === 0) {
        costs[j] = j
      } else if (j > 0) {
        let newValue = costs[j - 1]
        if (a.charAt(i - 1) !== b.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
        }
        costs[j - 1] = lastValue
        lastValue = newValue
      }
    }
    if (i > 0) costs[b.length] = lastValue
  }
  return costs[b.length]
}

/**
 * Apply grammar rule to a word using example-based pattern matching
 */
export function applyRule(
  word: string,
  rule: GrammarRule,
  language: 'tr' | 'syc' | 'en' = 'tr'
): AppliedRuleResult | null {
  // Get example output based on language
  const exampleOutput =
    language === 'tr'
      ? rule.example_output_tr
      : language === 'syc'
        ? rule.example_output_syc
        : rule.example_output_en

  const exampleExplanation =
    language === 'tr'
      ? rule.example_explanation_tr
      : rule.example_explanation_en

  // Calculate similarity between input word and example input
  const similarity = stringSimilarity(word.toLowerCase(), rule.example_input.toLowerCase())

  // If similarity > 0.6, apply the rule
  if (similarity > 0.6) {
    // Simple suffix-based transformation
    const inputLength = rule.example_input.length
    const outputLength = exampleOutput.length
    const suffix = exampleOutput.slice(inputLength)

    const transformed = word + suffix

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      originalWord: word,
      transformedWord: transformed,
      explanation: exampleExplanation,
      confidence: similarity,
    }
  }

  return null
}

/**
 * Apply multiple rules to a word
 */
export function applyRules(
  word: string,
  rules: GrammarRule[],
  language: 'tr' | 'syc' | 'en' = 'tr'
): AppliedRuleResult[] {
  return rules
    .map((rule) => applyRule(word, rule, language))
    .filter((result): result is AppliedRuleResult => result !== null)
}
