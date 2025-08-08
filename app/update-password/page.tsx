// app/update-password/page.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function UpdatePasswordPage() {
    const supabase = createClient();
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (password !== confirmPassword) {
            setError('הסיסמאות אינן תואמות.');
            return;
        }
        if (password.length < 6) {
            setError('הסיסמה חייבת להכיל לפחות 6 תווים.');
            return;
        }

        setIsSubmitting(true);

        const { error } = await supabase.auth.updateUser({ password });

        setIsSubmitting(false);

        if (error) {
            setError(error.message);
        } else {
            setSuccess('הסיסמה עודכנה בהצלחה! אתה מועבר לאזור האישי...');
            setTimeout(() => {
                router.push('/dashboard');
            }, 2000);
        }
    };

    return (
        // --- THE FIX IS HERE ---
        <div 
            dir="rtl" 
            className="flex items-center justify-center min-h-screen bg-cover bg-center bg-fixed"
            style={{ backgroundImage: "url('/images/background.jpg')" }}
        >
            <div className="p-8 bg-white/80 backdrop-blur-sm border rounded-xl shadow-lg w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6 text-center text-slate-800">הגדר סיסמה חדשה</h1>
                <form onSubmit={handleUpdatePassword}>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="סיסמה חדשה"
                        className="w-full p-3 mb-4 border rounded"
                        required
                    />
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="אימות סיסמה חדשה"
                        className="w-full p-3 mb-4 border rounded"
                        required
                    />
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 text-white p-3 rounded disabled:bg-slate-400"
                    >
                        {isSubmitting ? 'מעדכן...' : 'עדכן סיסמה'}
                    </button>
                    {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
                    {success && <p className="text-green-500 mt-4 text-center">{success}</p>}
                </form>
            </div>
        </div>
    );
}