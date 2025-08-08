// app/admin-users/dashboard/referrals/page.tsx
'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { deleteReferral, updateReferralStatus } from '@/app/actions/referralActions';
import type { Database } from '@/lib/database.types';

type Referral = Database['public']['Tables']['referrals']['Row'];

// רכיב קטן לאייקון של וואטסאפ
const WhatsAppIcon = () => (
    <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current text-green-500 hover:text-green-600">
        <path d=" M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.044-.53-.044-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.888 2.722.888.817 0 2.15-.515 2.52-1.29.372-.775.372-1.45.258-1.59-.115-.143-.302-.215-.42-.215z M15.7 4.42a11.285 11.285 0 0 0-11.285 11.285c0 3.225 1.348 6.147 3.543 8.262L4.42 30l4.312-1.348a11.285 11.285 0 0 0 8.262-3.543 11.285 11.285 0 0 0 3.543-8.262 11.285 11.285 0 0 0-11.285-11.285z"></path>
    </svg>
);

export default function ReferralsPage() {
    const supabase = createClient();
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const fetchReferrals = useCallback(async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('referrals')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            setError(error.message);
        } else {
            setReferrals(data || []);
        }
        setIsLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchReferrals();
    }, [fetchReferrals]);

    const handleDelete = (referralId: number) => {
        if (confirm("האם למחוק את ההמלצה?")) {
            startTransition(async () => {
                const result = await deleteReferral(referralId);
                if (result.success) {
                    setReferrals(current => current.filter(r => r.id !== referralId));
                } else {
                    alert(`שגיאה במחיקה: ${result.error}`);
                }
            });
        }
    };

    const handleStatusChange = (referralId: number, newStatus: { contacted?: boolean; is_completed?: boolean }) => {
        setReferrals(current => current.map(r => 
            r.id === referralId ? { ...r, ...newStatus } : r
        ));
        
        startTransition(async () => {
            const result = await updateReferralStatus(referralId, newStatus);
            if (result.error) {
                alert(`שגיאה בעדכון: ${result.error}`);
                fetchReferrals();
            }
        });
    };

    const formatWhatsAppLink = (phone: string | null) => {
        if (!phone) return '';
        let cleanedPhone = phone.replace(/\D/g, '');
        if (cleanedPhone.startsWith('0') && cleanedPhone.length === 10) {
            cleanedPhone = '972' + cleanedPhone.substring(1);
        }
        const message = encodeURIComponent('שלום, הגעתי אליך דרך המלצה מקהילת מדברים ביז.');
        return `https://wa.me/${cleanedPhone}?text=${message}`;
    };

    const formatGmailLink = (email: string | null) => {
        if (!email) return '#';
        return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;
    };

    return (
        <div dir="rtl" className="min-h-screen p-4 sm:p-6 lg:p-8 bg-cover bg-center bg-fixed" style={{ backgroundImage: "url('/images/background.jpg')" }}>
            <div className="max-w-screen-xl mx-auto">
                <div className="flex justify-center mb-8">
                    <div className="bg-blue-600 text-white py-4 px-8 rounded-xl shadow-lg w-auto inline-block">
                        <h1 className="text-3xl font-bold">ניהול המלצות "חבר מביא חבר"</h1>
                    </div>
                </div>
                
                {isLoading && <p className="text-center">טוען המלצות...</p>}
                {error && <p className="text-center text-red-500">שגיאה: {error}</p>}

                {!isLoading && !error && (
                    <div className="bg-white/80 backdrop-blur-sm border rounded-xl shadow-lg overflow-x-auto">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-slate-50/70">
                                <tr className="text-slate-600 font-semibold">
                                    {/* --- תוספת: עמודת מספור --- */}
                                    <th className="p-4 text-right w-12"></th>
                                    <th className="p-4 text-right">תאריך</th>
                                    <th className="p-4 text-right">שם הממליץ</th>
                                    <th className="p-4 text-right">שם המומלץ</th>
                                    <th className="p-4 text-right">טלפון המומלץ</th>
                                    <th className="p-4 text-right">מייל המומלץ</th>
                                    <th className="p-4 text-right">הערות</th>
                                    <th className="p-4 text-center">נוצר קשר</th>
                                    <th className="p-4 text-center">בוצע</th>
                                    <th className="p-4 text-center">פעולות</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {referrals.map((r, index) => (
                                    <tr key={r.id} className={`hover:bg-slate-50/50 ${r.is_completed ? 'bg-green-50/50' : ''}`}>
                                        {/* --- תוספת: תא מספור --- */}
                                        <td className="p-4 text-slate-500">{index + 1}</td>
                                        <td className="p-4 text-slate-500 whitespace-nowrap">{new Date(r.created_at!).toLocaleDateString('he-IL')}</td>
                                        <td className="p-4 text-slate-700">{r.referrer_name}</td>
                                        <td className="p-4 font-semibold text-slate-900">{r.recommended_name}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                {r.recommended_phone && (
                                                    <>
                                                        <span className="text-slate-700">{r.recommended_phone}</span>
                                                        <a 
                                                            href={formatWhatsAppLink(r.recommended_phone)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            title="שלח הודעת וואטסאפ"
                                                        >
                                                            <WhatsAppIcon />
                                                        </a>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {r.recommended_email && (
                                                <a 
                                                    href={formatGmailLink(r.recommended_email)} 
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    {r.recommended_email}
                                                </a>
                                            )}
                                        </td>
                                        <td className="p-4 max-w-xs text-slate-600 truncate" title={r.notes || ''}>{r.notes}</td>
                                        <td className="p-4 text-center">
                                            <input 
                                                type="checkbox"
                                                checked={r.contacted || false}
                                                onChange={(e) => handleStatusChange(r.id, { contacted: e.target.checked })}
                                                disabled={isPending}
                                                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                        </td>
                                        <td className="p-4 text-center">
                                            <input 
                                                type="checkbox"
                                                checked={r.is_completed || false}
                                                onChange={(e) => handleStatusChange(r.id, { is_completed: e.target.checked })}
                                                disabled={isPending}
                                                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                        </td>
                                        <td className="p-4 text-center">
                                            <button onClick={() => handleDelete(r.id)} disabled={isPending} className="text-red-600 hover:text-red-800 font-semibold">
                                                מחק
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}