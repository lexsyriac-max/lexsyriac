import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import CategoryTableClient from './CategoryTableClient'

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { slug } = await params
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {},
      },
    }
  )

  const { data: category } = await supabase
    .from('word_categories')
    .select('id, label, slug, description, teaching_note')
    .eq('slug', slug)
    .single()

  if (!category) return notFound()

  const { data: items, error } = await supabase
    .from('word_category_items')
    .select(`
      id,
      sort_order,
      words (
        id,
        turkish,
        english,
        syriac,
        transliteration,
        word_type,
        image_url,
        audio_url
      )
    `)
    .eq('category_id', category.id)
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  const words = (items || [])
    .map((item: any) => (Array.isArray(item.words) ? item.words[0] : item.words))
    .filter(Boolean)

  return <CategoryTableClient category={category} words={words} />
}