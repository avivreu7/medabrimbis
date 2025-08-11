import { Suspense } from 'react';
import CompleteProfileClient from './CompleteProfileClient';

export const dynamic = 'force-dynamic';

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={<div dir="rtl" className="min-h-screen flex items-center justify-center text-slate-700">טוען…</div>}>
      <CompleteProfileClient />
    </Suspense>
  );
}
