import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const prompt = body?.prompt

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Geçerli bir prompt gerekli.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY tanımlı değil.' },
        { status: 500 }
      )
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    })

    const data = await anthropicRes.json()

    if (!anthropicRes.ok) {
      return NextResponse.json(
        {
          error: data?.error?.message || 'Claude API hatası',
          raw: data,
        },
        { status: anthropicRes.status }
      )
    }

    const text = Array.isArray(data?.content)
      ? data.content
          .filter((item: { type?: string; text?: string }) => item?.type === 'text')
          .map((item: { text?: string }) => item?.text || '')
          .join('\n')
      : ''

    return NextResponse.json({ text })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Bilinmeyen sunucu hatası',
      },
      { status: 500 }
    )
  }
}