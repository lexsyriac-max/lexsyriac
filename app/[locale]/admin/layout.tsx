import AdminNav from './components/AdminNav'
import { AuthProvider } from '../AuthContext'

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <AuthProvider>
      <AdminNav locale={locale} />
      {children}
    </AuthProvider>
  )
}
