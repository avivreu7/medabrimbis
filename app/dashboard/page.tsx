// app/dashboard/page.tsx

import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

// --- הוספנו פריט חדש לרשימה ---
const navItems = [
    {
        href: '/dashboard/personal-portfolio',
        title: 'ניהול תיק אישי',
        description: 'עקוב אחר העסקאות האישיות שלך והצג ביצועים.',
    },
    {
        href: '/dashboard/community-portfolio',
        title: 'התיק של שירן',
        description: 'צפה בכל העסקאות הפתוחות והסגורות של הקהילה.',
    },
    {
        href: '/dashboard/board',
        title: 'לוח המודעות',
        description: 'הודעות, עדכונים ושיעורים ממנהלת הקהילה.',
    },
    {
        href: '/dashboard/risk-calculator',
        title: 'מחשבון סיכונים',
        description: 'חשב בקלות את גודל הפוזיציה הרצוי לכל עסקה.',
    },
    {
        href: '/dashboard/refer', // הנתיב לדף החדש
        title: 'חבר מביא חבר',
        description: 'הזמן חברים להצטרף וקבל הטבות עתידיות.',
    },
];

export default async function DashboardPage() {
    const supabase = createClient();
    
    // אנחנו לא משתמשים ב-session כאן, אז אפשר להסיר את השורה
    // const { data: { session } } = await supabase.auth.getSession();
    
    return (
        <div
            dir="rtl"
            className="min-h-screen p-6 bg-cover bg-center bg-fixed"
            style={{ backgroundImage: "url('/images/background.jpg')" }}
        >
            <div className="max-w-screen-xl mx-auto py-12">
                <div className="text-center mb-10">
                    <h1
                        className="text-5xl font-extrabold text-blue-600"
                        style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                    >
                        האזור האישי
                    </h1>
                </div>

                {/* --- הגדלנו את הרשת כדי להכיל את הפריט החדש --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            // הוספנו תנאי שימתח את הפריט האחרון אם מספר הפריטים אינו זוגי
                            className={`bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl shadow-lg p-8 hover:bg-white/95 hover:shadow-xl transition-all ${navItems.length % 2 !== 0 && navItems.indexOf(item) === navItems.length - 1 ? 'lg:col-span-2 lg:col-start-2' : ''}`}
                        >
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">{item.title}</h2>
                                <p className="text-slate-600 mt-2">{item.description}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}