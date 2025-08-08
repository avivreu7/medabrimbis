'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client'; 
// --- הוספנו ייבוא ל-Link ---
import Link from 'next/link';

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage('');

    if (!email) {
      setError('יש להזין כתובת מייל');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      setError('שגיאה בשליחת קישור. ודא שהמייל נכון ונסה שוב.');
    } else {
      setMessage('נשלח קישור לשחזור הסיסמה למייל שלך.');
    }

    setLoading(false);
  };

  if (!mounted) return null;

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gray-50 bg-cover bg-center flex items-center justify-center"
      style={{ backgroundImage: "url('/images/background.jpg')" }}
    >
      <div className="flex flex-col items-center w-full max-w-sm p-8 bg-white bg-opacity-70 rounded-lg shadow-lg">
        <h1 className="text-3xl font-extrabold text-[#1877F2] mb-2 animate-fade-in">
          שחזור סיסמה
        </h1>
        <p className="text-sm text-gray-700 text-center mb-6">
          הזן את כתובת המייל שלך ונשלח אליך קישור לאיפוס הסיסמה
        </p>

        <form onSubmit={handleResetPassword} className="w-full space-y-3">
          <input
            type="email"
            placeholder="כתובת מייל"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1877F2]"
            disabled={loading}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white py-3 rounded-lg font-semibold text-base transition duration-200"
          >
            {loading ? 'שולח...' : 'שלח קישור לשחזור'}
          </button>
        </form>

        {error && <p className="mt-4 text-sm text-red-500 text-center">{error}</p>}
        {message && <p className="mt-4 text-sm text-green-600 text-center">{message}</p>}

        <p className="mt-6 text-sm text-gray-600">
          {/* --- התיקון כאן: החלפת <a> ב-Link --- */}
          נזכרת בסיסמה? <Link href="/" className="text-[#1877F2] hover:underline">להתחברות</Link>
        </p>
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