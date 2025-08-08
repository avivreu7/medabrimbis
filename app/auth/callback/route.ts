// app/auth/callback/route.ts
import { NextResponse, NextRequest } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/', url.origin))
  }

  const supabase = await createRouteClient()

  // מחליף קוד לסשן וכותב קובצי עוגיות
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('exchangeCodeForSession error:', error.message)
    return NextResponse.redirect(new URL('/auth/error', url.origin))
  }

  // מושך את המשתמש
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/auth/error', url.origin))
  }

  // מושך/יוצר פרופיל
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single()

  if (!profile) {
    // ליתר ביטחון — אם משום מה הטריגר לא רץ, ניצור פרופיל כאן
    const { error: upsertErr } = await supabase
      .from('profiles')
      .upsert({ id: user.id, email: user.email ?? null, role: 'user', status: 'pending' })
    if (upsertErr) {
      console.error('profiles upsert error:', upsertErr.message)
      return NextResponse.redirect(new URL('/auth/error', url.origin))
    }
    // משתמש חדש → בהגדרה pending
    return NextResponse.redirect(new URL('/pending-approval', url.origin))
  }

  // הפניות לפי role/status
  if (profile.role === 'admin') {
    return NextResponse.redirect(new URL('/admin-users/dashboard', url.origin))
  }
  if (profile.status === 'pending') {
    return NextResponse.redirect(new URL('/pending-approval', url.origin))
  }
  return NextResponse.redirect(new URL('/dashboard', url.origin))
}
