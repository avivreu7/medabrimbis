'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

// רכיב אייקון גוגל
const GoogleIcon = () => (
    <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.022,35.283,44,30.038,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
    </svg>
);

export default function LoginPage() {
    const supabase = createClient();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- התיקון כאן: הוספת לוגיקת הפניה ---
    const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
            if (signInError) throw signInError;
            if (!data.user) throw new Error("User not found after sign in.");

            // אחרי התחברות מוצלחת, בודקים את הפרופיל
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role, status')
                .eq('id', data.user.id)
                .single();

            if (profileError) throw profileError;

            // ומפנים לדף הנכון
            if (profile.role === 'admin') {
                router.push('/admin-users/dashboard');
            } else if (profile.status === 'approved') {
                router.push('/dashboard');
            } else {
                router.push('/pending-approval');
            }

        } catch (err) {
            setError('שגיאה בהתחברות, בדוק את הפרטים ונסה שוב');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError(null);
        setLoading(true);
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${location.origin}/auth/callback` },
        });
    };

    return (
        <div dir="rtl" className="min-h-screen bg-gray-50 bg-cover bg-center flex items-center justify-center" style={{ backgroundImage: "url('/images/background.jpg')" }}>
            <div className="relative flex flex-col items-center w-full max-w-sm p-8 bg-white bg-opacity-70 rounded-lg shadow-lg">
                <Link href="/admin-users" className="absolute top-4 left-4 text-xs text-slate-500 hover:text-blue-600 hover:underline transition-colors">
                    כניסת מנהלים
                </Link>
                <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#1877F2] to-[#42A5F5] drop-shadow-md mb-2">
                    medabrim
                </h1>
                <p className="text-lg text-gray-700 text-center mb-8">
                    ברוכים הבאים למערכת ניהול העסקאות של קבוצת מדברים עסקאות
                </p>
                <div className="w-full">
                    <form onSubmit={handleEmailLogin} className="space-y-3">
                        <input
                            type="email"
                            placeholder="כתובת מייל"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1877F2]"
                            disabled={loading}
                        />
                        <input
                            type="password"
                            placeholder="סיסמה"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1877F2]"
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white py-3 rounded-lg font-semibold text-base transition duration-200"
                            disabled={loading}
                        >
                            {loading ? 'מתחבר...' : 'התחברות'}
                        </button>
                    </form>
                    <div className="my-6 flex items-center">
                        <div className="flex-grow border-t border-gray-300" />
                        <span className="flex-shrink mx-4 text-gray-400">או</span>
                        <div className="flex-grow border-t border-gray-300" />
                    </div>
                    <button
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="w-full flex items-center justify-center p-3 border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <GoogleIcon />
                        התחבר באמצעות גוגל
                    </button>
                    {error && <p className="mt-3 text-sm text-red-500 text-center">{error}</p>}
                    <div className="text-sm text-center mt-4 space-y-1">
                        <p>
                            שכחת סיסמה?{' '}
                            <Link href="/reset-password" className="text-[#1877F2] underline hover:text-[#1458c8]">
                                לחץ כאן
                            </Link>
                        </p>
                        <p>
                            אין לך חשבון?{' '}
                            <Link href="/register" className="text-[#1877F2] underline hover:text-[#1458c8]">
                                להרשמה
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}