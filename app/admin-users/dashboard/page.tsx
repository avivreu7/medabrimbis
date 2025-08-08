'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const navItems = [
    { title: ' ניהול עסקאות', href: '/admin-users/dashboard/deals' },
    { title: ' ניהול משתמשים', href: '/admin-users/dashboard/users' },
    { title: ' אנליזות קהילתיות', href: '/admin-users/dashboard/analytics' },
    { title: ' לוח מודעות קהילתי', href: '/admin-users/dashboard/board' },
    { title: ' עסקאות זמן אמת', href: '/admin-users/dashboard/api' },
    { title: 'המלצות "חבר מביא חבר"', href: '/admin-users/dashboard/referrals' },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 bg-cover bg-center p-6"
      style={{ backgroundImage: "url('/images/background.jpg')" }}
    >
      <div className="bg-white bg-opacity-80 rounded-lg shadow-lg p-8 max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold text-[#1877F2] mb-4 text-center drop-shadow">
          דשבורד מנהלת הקהילה 
        </h1>

        <p className="text-center text-gray-700 mb-8">
          ברוכה הבאה שירן! כאן תוכלי לנהל את הקהילה, המשתמשים והעסקאות.
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          {navItems.map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white py-4 px-6 rounded-lg text-lg font-semibold transition duration-200 shadow-md"
            >
              {item.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
