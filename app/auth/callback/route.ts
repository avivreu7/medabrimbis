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
  const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeErr) {
    console.error('exchangeCodeForSession error:', exchangeErr.message)
    return NextResponse.redirect(new URL('/auth/error', url.origin))
  }

  // מושך את המשתמש
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/auth/error', url.origin))
  }

  // metadata מגוגל (אם קיים)
  const meta = user.user_metadata || {}
  const firstNameFromAuth = meta.given_name || meta.first_name || ''
  const lastNameFromAuth  = meta.family_name || meta.last_name || ''
  const fullNameFromAuth  = meta.name || `${firstNameFromAuth} ${lastNameFromAuth}`.trim() || null

  // מוודאים שיש פרופיל; אם אין — ניצור עם המידע שיש לנו
  const { data: existingProfile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, role, status, first_name, last_name, join_date, full_name, email')
    .eq('id', user.id)
    .maybeSingle()

  if (profileErr) {
    console.error('profiles select error:', profileErr.message)
    return NextResponse.redirect(new URL('/auth/error', url.origin))
  }

  if (!existingProfile) {
    const { error: upsertErr } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email ?? null,
        role: 'member',         // שמרתי על שמותיך: user_role = member כברירת מחדל
        status: 'pending',      // user_status = pending כברירת מחדל
        first_name: firstNameFromAuth || null,
        last_name: lastNameFromAuth || null,
        full_name: fullNameFromAuth,
        // join_date נשלים במסך ההשלמה אם אין
      })
    if (upsertErr) {
      console.error('profiles upsert error:', upsertErr.message)
      return NextResponse.redirect(new URL('/auth/error', url.origin))
    }
  } else {
    // עדכון רך רק אם חסר
    const patch: Record<string, any> = {}
    if (!existingProfile.first_name && firstNameFromAuth) patch.first_name = firstNameFromAuth
    if (!existingProfile.last_name  && lastNameFromAuth)  patch.last_name  = lastNameFromAuth
    if (!existingProfile.full_name  && fullNameFromAuth)  patch.full_name  = fullNameFromAuth
    if (!existingProfile.email      && user.email)        patch.email      = user.email

    if (Object.keys(patch).length) {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', user.id)
      if (updateErr) {
        console.error('profiles update patch error:', updateErr.message)
        // לא מפילים ל־/error; ממשיכים הלאה למסך השלמה אם צריך
      }
    }
  }

  // שולפים שוב כדי לבדוק אם צריך השלמת פרופיל
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status, first_name, last_name, join_date')
    .eq('id', user.id)
    .single()

  // אם חסר אחד מהשדות — מפנים להשלמת פרופיל
  if (!profile?.first_name || !profile?.last_name || !profile?.join_date) {
    return NextResponse.redirect(new URL('/complete-profile', url.origin))
  }

  // הפניות קיימות שלך
  if (profile.role === 'admin') {
    return NextResponse.redirect(new URL('/admin-users/dashboard', url.origin))
  }
  if (profile.status === 'pending') {
    return NextResponse.redirect(new URL('/pending-approval', url.origin))
  }

  return NextResponse.redirect(new URL('/dashboard', url.origin))
}
