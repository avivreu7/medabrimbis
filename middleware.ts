// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // יוצרים תגובה וקליינט Supabase כדי לרענן את הסשן
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name, value, options) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // --- לוגיקת הניתוב ---

  // 1. אם המשתמש לא מחובר, הפנה אותו לדף הבית
  if (!user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 2. אם המשתמש מחובר, בדוק את הפרופיל שלו
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single()

  // אם אין פרופיל, משהו השתבש. הפנה לדף הבית
  if (!profile) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 3. אם הסטטוס הוא "ממתין", הפנה לדף ההמתנה (אלא אם הוא כבר שם)
  if (profile.status === 'pending' && pathname !== '/pending-approval') {
    return NextResponse.redirect(new URL('/pending-approval', request.url))
  }

  // 4. אם המשתמש הוא 'member' ומנסה לגשת לאזור המנהל, הפנה אותו לדשבורד הרגיל
  if (profile.role === 'member' && pathname.startsWith('/admin-users/dashboard')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // אם כל הבדיקות עברו, אפשר למשתמש להמשיך ליעדו
  return response
}

// --- התיקון כאן ---
// המידלוור ירוץ רק על הדפים המוגנים שבתוך הדשבורדים
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin-users/dashboard/:path*', // מגן רק על מה שבתוך הדשבורד
  ],
}