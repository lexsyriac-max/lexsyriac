import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'

const intlMiddleware = createIntlMiddleware({
  locales: ['tr', 'en'],
  defaultLocale: 'tr',
})

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next()
  }
  const intlResponse = intlMiddleware(request)
  const response = intlResponse ?? NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const locale = pathname.startsWith('/en') ? 'en' : 'tr'

  const isDashboardPage =
    pathname === '/tr/dashboard' || pathname === '/en/dashboard'

  const isAdminPage =
    pathname === '/tr/admin' ||
    pathname === '/en/admin' ||
    pathname.startsWith('/tr/admin/') ||
    pathname.startsWith('/en/admin/')

  if ((isDashboardPage || isAdminPage) && !user) {
    return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url))
  }

  if (user) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (error || !profile) {
      return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url))
    }

    if (profile.role === 'banned') {
      return NextResponse.redirect(
        new URL(`/${locale}/auth/login?banned=1`, request.url)
      )
    }

    if (isAdminPage && profile.role !== 'admin') {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url))
    }

    // Test aşaması: admin olmayan kullanıcıları coming-soon'a yönlendir
    const isComingSoonPage = pathname.includes('/coming-soon')
    const isAuthPage = pathname.includes('/auth/')
    const isLoginPage = pathname.includes('/login')

    if (profile.role !== 'admin' && !isComingSoonPage && !isAuthPage && !isLoginPage) {
      return NextResponse.redirect(new URL(`/${locale}/coming-soon`, request.url))
    }
  }

  // Giriş yapmamış kullanıcılar da coming-soon'a git (login ve coming-soon hariç)
  if (!user) {
    const isComingSoonPage = pathname.includes('/coming-soon')
    const isAuthPage = pathname.includes('/auth/')
    const isLoginPage = pathname.includes('/login')

    if (!isComingSoonPage && !isAuthPage && !isLoginPage) {
      return NextResponse.redirect(new URL(`/${locale}/coming-soon`, request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}