import { redirect } from 'next/navigation'

// Admin ana sayfası yeni sistemdir (Lex). Eski demo paneli: /admin/demo
export default async function AdminHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  redirect(`/${locale}/admin/lex`)
}
