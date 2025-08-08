'use client';

import { useState, useTransition } from 'react';
import { updateAllPrices } from '@/app/actions/apiSettingsActions';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export default function ApiUpdatePage() {
  // useTransition מונע מה-UI "לקפוא" בזמן שה-Action רץ
  const [isUpdating, startUpdateTransition] = useTransition();
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleTriggerUpdate = () => {
    setMessage(null); // איפוס הודעה קודמת
    startUpdateTransition(async () => {
        const result = await updateAllPrices();
        if (result.error) {
            setMessage({ type: 'error', text: result.error });
        } else {
            setMessage({ type: 'success', text: result.success! });
        }
    });
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen p-4 sm:p-6 lg:p-8 bg-cover bg-center bg-fixed flex items-center justify-center"
      style={{ backgroundImage: "url('/images/background.jpg')" }}
    >
      <div className="max-w-xl w-full">
        <div className="flex justify-center mb-8">
            <div className="bg-blue-600 text-white py-4 px-8 rounded-xl shadow-lg w-auto inline-block">
                <h1 className="text-3xl font-bold">עדכון מחירי מניות</h1>
            </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl shadow-lg p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 text-center">עדכון נתונים ידני</h2>
            <p className="mt-2 text-slate-600 text-center">
              לחץ על הכפתור כדי למשוך את המחירים העדכניים ביותר מה-API עבור כל העסקאות הפתוחות במערכת. 
              העדכון יופיע בזמן אמת אצל כל המשתמשים.
            </p>
          </div>
          
          <div className="pt-6 border-t border-slate-200/80">
            <Button onClick={handleTriggerUpdate} disabled={isUpdating} className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg disabled:opacity-70 disabled:cursor-not-allowed">
              <RefreshCw className={`ml-2 h-5 w-5 ${isUpdating ? 'animate-spin' : ''}`} />
              {isUpdating ? 'מעדכן, נא להמתין...' : 'הפעל עדכון מחירים'}
            </Button>
            {message && (
              <p className={`mt-4 text-sm text-center font-semibold ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {message.text}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}