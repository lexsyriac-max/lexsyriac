import { createClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GRAMMAR RULES API v2 (UPDATED)
 * grammar_rules_v2 tablosu için nihai route
 * Multi-language support + Security improvements
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validasyon
    if (!body.name || !body.category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, category',
        },
        { status: 400 }
      )
    }

    if (!body.supported_languages || body.supported_languages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least one language must be selected',
        },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // grammar_rules_v2 tablosuna insert
    const { data, error } = await supabase
      .from('grammar_rules_v2')
      .insert({
        name: body.name,
        description: body.description || null,
        category: body.category,

        // Multi-Language Rule Text
        rule_text_en: body.rule_text_en || null,
        rule_text_tr: body.rule_text_tr || null,
        rule_text_syc: body.rule_text_syc || null,
        rule_text_de: body.rule_text_de || null,
        rule_text_fr: body.rule_text_fr || null,
        supported_languages: body.supported_languages, // JSONB array

        // Grammar Properties
        tense: body.tense || null,
        mood: body.mood || null,
        aspect: body.aspect || null,
        person: body.person || null,
        number: body.number || null,
        gender: body.gender || null,
        polarity: body.polarity || null,
        voice: body.voice || null,
        word_order: body.word_order || null,

        // Examples
        example_input: body.example_input || null,
        example_output_en: body.example_output_en || null,
        example_output_tr: body.example_output_tr || null,
        example_output_syc: body.example_output_syc || null,
        example_output_de: body.example_output_de || null,
        example_output_fr: body.example_output_fr || null,
        example_explanation_en: body.example_explanation_en || null,
        example_explanation_tr: body.example_explanation_tr || null,
        example_explanation_syc: body.example_explanation_syc || null,

        // Metadata
        difficulty_level: body.difficulty_level || 1,
        is_extensible: body.is_extensible !== undefined ? body.is_extensible : true,
        source: body.source || 'manual',
        is_active: body.is_active !== undefined ? body.is_active : true,
        version: 1,
      })
      .select()

    if (error) {
      console.error('Supabase error:', error)
      throw new Error(`Database error: ${error.message}`)
    }

    return NextResponse.json(
      {
        success: true,
        message: `Rule "${body.name}" created successfully`,
        data: data?.[0] || null,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('API error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

/**
 * GET - Tüm aktif kuralları getir (filtreleme destekli)
 * 
 * Query Parameters:
 * - category: VERB, NOUN, etc. (string)
 * - language: en, tr, syc, de, fr (string)
 * - active: true|false (default: true)
 * 
 * Örn: /api/grammar-rules?category=VERB&language=syc&active=true
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()

    // Query parametreleri (opsiyonel)
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const language = searchParams.get('language')
    const onlyActive = searchParams.get('active') !== 'false' // default: true

    let query = supabase.from('grammar_rules_v2').select('*')

    // Filtreleme
    if (onlyActive) {
      query = query.eq('is_active', true)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (language) {
      // supported_languages JSONB array'inde ara (iyileştirilmiş)
      query = query.contains('supported_languages', [language])
    }

    // Sıralama
    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      data: data || [],
    })
  } catch (err) {
    console.error('API error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * PUT - Kuralı güncelle
 * 
 * Body:
 * - id: (required) Rule ID
 * - Güncellenmek istenen alanlar (opsiyonel)
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'Rule ID is required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Güvenli whitelist: update edilebilecek alanlar
    const allowedFields = [
      'description',
      'category',
      'rule_text_en',
      'rule_text_tr',
      'rule_text_syc',
      'rule_text_de',
      'rule_text_fr',
      'supported_languages',
      'tense',
      'mood',
      'aspect',
      'person',
      'number',
      'gender',
      'polarity',
      'voice',
      'word_order',
      'example_input',
      'example_output_en',
      'example_output_tr',
      'example_output_syc',
      'example_output_de',
      'example_output_fr',
      'example_explanation_en',
      'example_explanation_tr',
      'example_explanation_syc',
      'difficulty_level',
      'is_extensible',
      'is_active',
    ]

    // Whitelist'e göre filtrele
    const updateData: Record<string, any> = {}
    allowedFields.forEach(field => {
      if (field in body) {
        updateData[field] = body[field]
      }
    })

    // updated_at'ı otomatik ekle
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('grammar_rules_v2')
      .update(updateData)
      .eq('id', body.id)
      .select()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Rule updated successfully',
      data: data?.[0] || null,
    })
  } catch (err) {
    console.error('API error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Kuralı sil
 * 
 * Query Parameters:
 * - id: (required) Rule ID
 * 
 * Örn: /api/grammar-rules?id=123
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Rule ID is required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    const { error } = await supabase
      .from('grammar_rules_v2')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Rule deleted successfully',
    })
  } catch (err) {
    console.error('API error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}