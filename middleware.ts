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

  // Lex ekibi (lex.user_role): /admin/lex bölümüne girer, demo admin
  // sayfalarına giremez. Demo admin (profiles.role = 'admin') her yere girer.
  const isLexPage = /^\/(tr|en)\/admin\/lex(\/|$)/.test(pathname)

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role === 'banned') {
      return NextResponse.redirect(
        new URL(`/${locale}/auth/login?banned=1`, request.url)
      )
    }

    const isDemoAdmin = profile?.role === 'admin'
    let lexRole: string | null = null
    if (!isDemoAdmin) {
      const { data: lr } = await supabase
        .schema('lex')
        .from('user_role')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()
      lexRole = lr?.role ?? null
    }

    if (!profile && !lexRole) {
      return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url))
    }

    if (!isDemoAdmin && lexRole) {
      if (isLexPage) return response
      if (isAdminPage) {
        return NextResponse.redirect(new URL(`/${locale}/admin/lex`, request.url))
      }
    }

    if (isAdminPage && !isDemoAdmin) {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url))
    }

    // Test aşaması: admin olmayan kullanıcıları coming-soon'a yönlendir
    const isComingSoonPage = pathname.includes('/coming-soon')
    const isAuthPage = pathname.includes('/auth/')
    const isLoginPage = pathname.includes('/login')

    if (!isDemoAdmin && !isComingSoonPage && !isAuthPage && !isLoginPage) {
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