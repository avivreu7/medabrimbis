// app/dashboard/refer/page.tsx
'use client';

import { useEffect, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { submitReferral } from '@/app/actions/referralActions';

export default function ReferPage() {
    const supabase = createClient();
    const [isPending, startTransition] = useTransition();

    const [referrerName, setReferrerName] = useState('');
    const [referrerEmail, setReferrerEmail] = useState('');

    const [recommendedName, setRecommendedName] = useState('');
    const [recommendedPhone, setRecommendedPhone] = useState('');
    const [recommendedEmail, setRecommendedEmail] = useState('');
    const [notes, setNotes] = useState('');
    
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const fetchUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // שולפים את השם מהפרופיל רק כערך התחלתי
                const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', user.id).single();
                if (profile) {
                    setReferrerName(profile.full_name || '');
                    setReferrerEmail(profile.email || '');
                } else {
                    // אם אין פרופיל, עדיין נציג את המייל
                    setReferrerEmail(user.email || '');
                }
            }
        };
        fetchUserData();
    }, [supabase]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        startTransition(async () => {
            const result = await submitReferral({
                referrer_name: referrerName, // שולחים את השם מה-state
                recommended_name: recommendedName,
                recommended_phone: recommendedPhone,
                recommended_email: recommendedEmail,
                notes: notes,
            });

            if (result.error) {
                setMessage({ type: 'error', text: result.error });
            } else {
                setMessage({ type: 'success', text: 'הטופס נשלח בהצלחה!' });
                setRecommendedName('');
                setRecommendedPhone('');
                setRecommendedEmail('');
                setNotes('');
                setTimeout(() => setMessage(null), 3000);
            }
        });
    };

    return (
        <div dir="rtl" className="min-h-screen p-6 flex items-center justify-center bg-cover bg-center bg-fixed" style={{ backgroundImage: "url('/images/background.jpg')" }}>
            <div className="max-w-2xl w-full bg-white/80 backdrop-blur-sm border rounded-xl shadow-lg p-8">
                <h1 className="text-4xl font-bold text-slate-800 mb-4 text-center">המלץ על חבר</h1>
                <p className="text-slate-600 mb-8 text-center">מלא את פרטי החבר שברצונך להמליץ עליו, ואנחנו ניצור איתו קשר.</p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">שם מלא (הממליץ)</label>
                            {/* התיקון: השדה הזה ניתן לעריכה */}
                            <input type="text" value={referrerName} onChange={(e) => setReferrerName(e.target.value)} required className="mt-1 block w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">מייל (הממליץ)</label>
                            <input type="email" value={referrerEmail} readOnly className="mt-1 block w-full p-2 border rounded bg-slate-100 cursor-not-allowed" />
                        </div>
                    </div>
                    <hr className="my-4"/>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">שם מלא (המומלץ)</label>
                            <input type="text" value={recommendedName} onChange={(e) => setRecommendedName(e.target.value)} required className="mt-1 block w-full p-2 border rounded" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700">מייל (המומלץ)</label>
                            <input type="email" value={recommendedEmail} onChange={(e) => setRecommendedEmail(e.target.value)} required className="mt-1 block w-full p-2 border rounded" />
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700">טלפון (המומלץ)</label>
                        <input type="tel" value={recommendedPhone} onChange={(e) => setRecommendedPhone(e.target.value)} className="mt-1 block w-full p-2 border rounded" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">הערות</label>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 block w-full p-2 border rounded"></textarea>
                    </div>
                    <button type="submit" disabled={isPending} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-400">
                        {isPending ? 'שולח...' : 'שלח המלצה'}
                    </button>
                    {message && (
                        <p className={`mt-4 text-center font-semibold ${message.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                            {message.text}
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
}