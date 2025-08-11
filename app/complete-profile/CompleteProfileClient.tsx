'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  join_date: string | null; // ISO date string
  status: 'pending' | 'approved' | 'suspended' | null;
};

export default function CompleteProfileClient() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [joinDate,  setJoinDate]  = useState(''); // YYYY-MM-DD

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          router.replace('/');
          return;
        }

        // טוען נתונים קיימים כדי להציג למשתמש (אם יש)
        const { data: profile, error: selErr } = await supabase
          .from('profiles')
          .select('first_name, last_name, join_date, status')
          .eq('id', session.user.id)
          .single();

        if (selErr) {
          console.error('profiles select error:', selErr.message);
          // ממשיכים — המשתמש יוכל למלא ידנית
        }

        if (profile) {
          setFirstName(profile.first_name ?? '');
          setLastName(profile.last_name ?? '');
          const d = profile.join_date ? String(profile.join_date).slice(0, 10) : '';
          setJoinDate(d);
        } else {
          // אפשר לקלוט ברירות מחדל מ־URL אם העברת, לא חובה:
          const initFirst = searchParams.get('first') || '';
          const initLast  = searchParams.get('last')  || '';
          setFirstName(initFirst);
          setLastName(initLast);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
    // searchParams בטוח לשימוש כאן כי אנחנו בעטיפה של Suspense בעמוד
  }, [router, supabase, searchParams]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!firstName || !lastName || !joinDate) {
      setError('נא למלא שם פרטי, שם משפחה ותאריך הצטרפות');
      return;
    }

    setSaving(true);
    try {
      // עדכון דרך RPC (כמו בקוד שלך)
      const { error: rpcErr } = await supabase.rpc('upsert_own_profile', {
        p_first_name: firstName.trim(),
        p_last_name:  lastName.trim(),
        p_join_date:  joinDate, // YYYY-MM-DD
      });

      if (rpcErr) {
        console.error('upsert_own_profile error:', rpcErr.message);
        throw new Error('שגיאה בשמירת הפרופיל');
      }

      // לאחר שמירה — הפניה בהתאם לסטטוס
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/');
        return;
      }
      const { data: profile, error: selErr } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', user.id)
        .single();

      if (selErr) {
        router.replace('/dashboard');
        return;
      }

      if (profile?.status === 'approved') {
        // אם העברת next= ב־URL, אפשר לכבד אותו
        const next = searchParams.get('next');
        router.replace(next || '/dashboard');
      } else {
        router.replace('/pending-approval');
      }
    } catch (err: any) {
      setError(err?.message || 'שגיאה בשמירת הפרופיל, נסו שוב.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center text-slate-700">
        טוען פרטי פרופיל...
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gray-50 bg-cover bg-center flex items-center justify-center"
      style={{ backgroundImage: "url('/images/background.jpg')" }}
    >
      <div className="w-full max-w-md bg-white/80 p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          השלמת פרופיל
        </h1>
        <p className="text-slate-600 mb-6">
          כדי להשלים את ההרשמה, נא למלא את הפרטים הבאים:
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <input
            type="text"
            placeholder="שם פרטי"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1877F2]"
            disabled={saving}
            autoComplete="given-name"
          />
          <input
            type="text"
            placeholder="שם משפחה"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1877F2]"
            disabled={saving}
            autoComplete="family-name"
          />
          <div className="space-y-1">
            <label className="text-xs text-slate-600">תאריך הצטרפות לקהילה</label>
            <input
              type="date"
              value={joinDate}
              onChange={(e) => setJoinDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1877F2]"
              disabled={saving}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white py-3 rounded-lg font-semibold text-base transition duration-200 disabled:opacity-60"
            disabled={saving}
          >
            {saving ? 'שומר…' : 'שמירה והמשך'}
          </button>
        </form>

        {error && (
          <p className="mt-3 text-sm text-red-500 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
