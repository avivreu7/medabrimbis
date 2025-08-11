'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function AdminLoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) {
      setError('נא למלא את כל השדות');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError || !data?.user) throw new Error('פרטי התחברות שגויים');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, status')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        // אין פרופיל? ניצור בסיסי ואז נחסום גישה
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email ?? null,
          role: 'member',
          status: 'pending',
        });
        await supabase.auth.signOut();
        throw new Error('אינך מורשה לגשת לאזור המנהלים');
      }

      if (profile.role !== 'admin' || profile.status !== 'approved') {
        await supabase.auth.signOut();
        throw new Error('אינך מורשה לגשת לאזור המנהלים');
      }

      // ✅ נתיב עם סלאש בתחלה!
      router.push('/admin-users/dashboard');
    } catch (err: any) {
      setError(err?.message || 'אירעה שגיאה. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gray-50 bg-cover bg-center flex items-center justify-center"
      style={{ backgroundImage: "url('/images/background.jpg')" }}
    >
      <div className="flex flex-col items-center w-full max-w-sm p-8 bg-white bg-opacity-80 backdrop-blur-sm rounded-lg shadow-lg">
        <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#1877F2] to-[#42A5F5] drop-shadow-md animate-fade-in mb-2">
          אזור מנהלים
        </h1>
        <p className="text-lg text-gray-700 text-center mb-8">
          כניסה למנהלי קהילת "מדברים עסקאות"
        </p>

        <div className="w-full">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              id="email"
              type="email"
              placeholder="מייל מנהל"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1877F2]"
              disabled={loading}
            />
            <input
              id="password"
              type="password"
              placeholder="סיסמה"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1877F2]"
              disabled={loading}
            />
            <button
              type="submit"
              className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white py-3 rounded-lg font-semibold text-base transition duration-200 disabled:opacity-75"
              disabled={loading}
            >
              {loading ? 'מתחבר...' : 'התחבר כמנהל'}
            </button>
          </form>

          {error && <p className="mt-3 text-sm text-red-500 text-center">{error}</p>}

          <div className="text-sm text-center mt-6">
            <Link href="/" className="text-[#1877F2] underline hover:text-[#1458c8]">
              חזרה לכניסה הרגילה
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
