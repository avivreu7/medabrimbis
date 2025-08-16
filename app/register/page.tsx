'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const supabase = createClient();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  // טופס
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [joinDate, setJoinDate] = useState(''); // YYYY-MM-DD

  const [loadingEmail, setLoadingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const handleEmailSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email || !password || !firstName || !lastName || !joinDate) {
      setError('נא למלא את כל השדות (כולל שם פרטי, משפחה ותאריך הצטרפות)');
      return;
    }

    setLoadingEmail(true);
    setError(null);

    try {
      // מעבירים את הנתונים כ-metadata כדי שהטריגר DB ייצור/יעדכן את השורה ב-profiles
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            join_date: joinDate, // "YYYY-MM-DD"
          },
        },
      });

      if (signUpError || !data.user) {
        // Supabase rate limit יכול להחזיר שגיאה אם לוחצים מהר מדי
        throw signUpError ?? new Error('שגיאה בהרשמה');
      }

      // מסך המתנה (עד לאישור או הפעלה ידנית)
      router.push('/pending-approval');
    } catch (err: any) {
      const msg =
        err?.message?.includes('retry') || err?.message?.includes('seconds')
          ? 'בשל אבטחה, ניתן לנסות שוב בעוד כמה שניות.'
          : err?.message?.includes('registered')
          ? 'כבר קיימת הרשמה עם המייל הזה. נסה להתחבר.'
          : 'שגיאה בהרשמה, נסה שנית.';
      setError(msg);
    } finally {
      setLoadingEmail(false);
    }
  };

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
          <div className="grid grid-cols-1 gap-3">
            <input
              type="text"
              placeholder="שם פרטי"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1877F2]"
              disabled={loadingEmail}
              autoComplete="given-name"
            />
            <input
              type="text"
              placeholder="שם משפחה"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1877F2]"
              disabled={loadingEmail}
              autoComplete="family-name"
            />
            <label className="text-xs text-slate-600">
              תאריך הצטרפות לקהילה
            </label>
            <input
              type="date"
              value={joinDate}
              onChange={(e) => setJoinDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1877F2]"
              disabled={loadingEmail}
            />
          </div>

          <input
            type="email"
            placeholder="כתובת מייל"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1877F2]"
            disabled={loadingEmail}
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="סיסמה"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1877F2]"
            disabled={loadingEmail}
            autoComplete="new-password"
          />

          <button
            type="submit"
            className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white py-3 rounded-lg font-semibold text-base transition duration-200 disabled:opacity-60"
            disabled={loadingEmail}
          >
            {loadingEmail ? 'נרשם...' : 'הרשמה במייל'}
          </button>
        </form>

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
  );
}