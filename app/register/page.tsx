'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const supabase = createClient()
  const router = useRouter()

  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleEmailSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!email || !password) {
      setError('נא למלא את כל השדות')
      return
    }

    setLoadingEmail(true)
    setError(null)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError || !data.user) {
        throw signUpError ?? new Error('Failed to sign up')
      }

      // משתמש חדש יופנה לאישור
      router.push('/pending-approval')
    } catch (err: any) {
      const msg =
        err?.message?.includes('User already registered')
          ? 'כבר קיימת הרשמה עם המייל הזה. נסה להתחבר.'
          : 'שגיאה בהרשמה, נסה שנית'
      setError(msg)
    } finally {
      setLoadingEmail(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoadingGoogle(true)
    setError(null)
    try {
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback`
          : '/auth/callback'

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })

      if (error) throw error
      // הדפדפן יעבור להפניית OAuth של גוגל
    } catch (err) {
      setError('שגיאה בהתחברות עם Google, נסה שוב.')
      setLoadingGoogle(false)
    }
  }

  if (!mounted) return null

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gray-50 bg-cover bg-center flex items-center justify-center"
      style={{ backgroundImage: "url('/images/background.jpg')" }}
    >
      <div className="flex flex-col items-center w-full max-w-sm p-8 bg-white/80 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold mb-6 text-[#1877F2] drop-shadow-sm tracking-tight border-b-2 border-[#166FE5] pb-2">
          הצטרפו אלינו
        </h2>

        <form onSubmit={handleEmailSignUp} className="w-full space-y-4">
          <input
            type="email"
            placeholder="כתובת מייל"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1877F2]"
            disabled={loadingEmail || loadingGoogle}
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="סיסמה"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1877F2]"
            disabled={loadingEmail || loadingGoogle}
            autoComplete="new-password"
          />

          <button
            type="submit"
            className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white py-3 rounded-lg font-semibold text-base transition duration-200 disabled:opacity-60"
            disabled={loadingEmail || loadingGoogle}
          >
            {loadingEmail ? 'נרשם...' : 'הרשמה במייל'}
          </button>
        </form>

        <div className="my-4 flex items-center w-full">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="mx-3 text-xs text-gray-500">או</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* כפתור Google עם אייקון */}
        <button
          onClick={handleGoogleSignIn}
          className="w-full border border-gray-300 hover:bg-gray-50 text-gray-800 py-3 rounded-lg font-medium text-base transition duration-200 disabled:opacity-60 flex items-center justify-center gap-2"
          disabled={loadingEmail || loadingGoogle}
          aria-label="התחברות מהירה עם Google"
        >
          {/* אייקון Google (SVG) */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3A12.9 12.9 0 1 1 24 11a12.6 12.6 0 0 1 8.9 3.5l5.7-5.7A20.9 20.9 0 1 0 24 45c10.5 0 19.1-7.6 19.6-18 .1-.5 0-4.5 0-6.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12.9 12.9 0 0 1 24 11c3.5 0 6.6 1.3 9 3.5l5.7-5.7A20.9 20.9 0 0 0 24 3 20.9 20.9 0 0 0 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 45c5.4 0 10.3-2.1 13.9-5.5l-6.4-5.2A12.9 12.9 0 0 1 11.8 28l-6.7 5.2A20.9 20.9 0 0 0 24 45z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3A13 13 0 0 1 24 41c3.3 0 6.3-1.3 8.5-3.6l6.4 5.2C35.3 45.1 29.9 47 24 47 12 47 2 37 2 25S12 3 24 3c5.9 0 11.3 2.4 15.2 6.1l-5.7 5.7C31.9 12.3 28.8 11 25.3 11a13 13 0 0 0-13 13c0 7.2 5.8 13 13 13 6.4 0 11.8-4.6 12.7-10.6H24v-8h19.6c.3 1.2 .4 2.5 .4 3.9 0 2-.1 6 0 6.5z"/>
          </svg>
          {loadingGoogle ? 'מפנה לגוגל…' : 'התחברות מהירה עם Google'}
        </button>

        {error && <p className="mt-3 text-sm text-red-500 text-center">{error}</p>}

        <div className="mt-6 text-sm text-gray-700">
          כבר רשומים?{' '}
          <button
            onClick={() => router.push('/')}
            className="text-[#1877F2] hover:underline font-medium"
          >
            לחצו כאן להתחברות
          </button>
        </div>
      </div>
    </div>
  )
}
