'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

// --- ממשקים ---
type Deal = {
  id: number;
  symbol: string;
  quantity: number;
  entry_price: number;
  stop_loss: number | null;
  take_profit: number | null;
  is_closed: boolean;
  closed_price?: number | null;
  result?: 'profit' | 'loss' | null;
  created_at: string;
  user_id?: string;
  status?: string;
};

type DailyUpdate = {
  symbol: string;
  current_price: number;
};

interface DealWithPrice extends Deal {
  current_price?: number;
  unrealized_pnl?: number;
}

// --- פונקציות עזר לפורמט מספרים ---
const formatNumber = (n: number | null | undefined, min = 2, max = 2) => {
  if (n === null || n === undefined || Number.isNaN(n)) return '-';
  return n.toLocaleString(undefined, { minimumFractionDigits: min, maximumFractionDigits: max });
};
const formatInt = (n: number | null | undefined) => {
  if (n === null || n === undefined || Number.isNaN(n)) return '-';
  return n.toLocaleString();
};
const formatCurrency = (n: number | null | undefined, min = 2, max = 2) => {
  if (n === null || n === undefined || Number.isNaN(n)) return '-';
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: min, maximumFractionDigits: max })}`;
};

// --- רכיב העמוד הראשי ---
export default function CommunityPortfolioPage() {
  const supabase = createClient();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [dailyUpdates, setDailyUpdates] = useState<DailyUpdate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // טעינת נתונים ראשונית
    fetchCommunityDeals();
    fetchPriceUpdates();

    // האזנה לעדכונים בזמן אמת
    const dealChannel = supabase
      .channel('community-deals-view-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_deals' }, () => {
        fetchCommunityDeals();
      })
      .subscribe();

    const priceChannel = supabase
      .channel('price-updates-view-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_portfolio_updates' }, () => {
        fetchPriceUpdates();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(dealChannel);
      supabase.removeChannel(priceChannel);
    };
  }, []);

  const fetchCommunityDeals = async () => {
    const { data, error } = await supabase
      .from('community_deals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError('שגיאה בטעינת עסקאות הקהילה');
    } else {
      setDeals(data as Deal[]);
    }
    setIsLoading(false);
  };

  const fetchPriceUpdates = async () => {
    const { data, error } = await supabase.from('daily_portfolio_updates').select('symbol, current_price');
    if (!error) setDailyUpdates(data as DailyUpdate[]);
  };

  const openDeals = useMemo(() => deals.filter((d) => !d.is_closed), [deals]);
  const closedProfitDeals = useMemo(() => deals.filter((d) => d.is_closed && d.result === 'profit'), [deals]);
  const closedLossDeals = useMemo(() => deals.filter((d) => d.is_closed && d.result === 'loss'), [deals]);

  const totalProfit = useMemo(
    () => closedProfitDeals.reduce((acc, d) => acc + ((d.closed_price || 0) - d.entry_price) * d.quantity, 0),
    [closedProfitDeals],
  );
  const totalLoss = useMemo(
    () => closedLossDeals.reduce((acc, d) => acc + (d.entry_price - (d.closed_price || 0)) * d.quantity, 0),
    [closedLossDeals],
  );

  const winRate = useMemo(() => {
    const totalClosed = closedProfitDeals.length + closedLossDeals.length;
    if (totalClosed === 0) return 0;
    return (closedProfitDeals.length / totalClosed) * 100;
  }, [closedProfitDeals, closedLossDeals]);

  const averageRiskReward = useMemo(() => {
    const allClosedDeals = [...closedProfitDeals, ...closedLossDeals];
    const dealsWithRr = allClosedDeals.filter((d) => d.stop_loss && d.closed_price && d.entry_price - d.stop_loss > 0);
    if (dealsWithRr.length === 0) return 0;
    const totalRr = dealsWithRr.reduce((acc, d) => {
      const risk = d.entry_price - d.stop_loss!;
      const reward = d.closed_price! - d.entry_price;
      return acc + reward / risk;
    }, 0);
    return totalRr / dealsWithRr.length;
  }, [closedProfitDeals, closedLossDeals]);

  const openDealsWithPriceData = useMemo<DealWithPrice[]>(() => {
    return openDeals.map((deal) => {
      const currentPriceData = dailyUpdates.find((update) => update.symbol === deal.symbol);
      if (currentPriceData) {
        const unrealized_pnl = (currentPriceData.current_price - deal.entry_price) * deal.quantity;
        return { ...deal, current_price: currentPriceData.current_price, unrealized_pnl };
      }
      return { ...deal, current_price: undefined, unrealized_pnl: undefined };
    });
  }, [openDeals, dailyUpdates]);

  return (
    <div
      dir="rtl"
      className="min-h-screen p-4 sm:p-6 lg:p-8 bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/images/background.jpg')" }}
    >
      <div className="flex justify-center mb-8">
        <div className="bg-blue-600 text-white p-5 rounded-xl shadow-lg w-auto inline-block">
          <h1 className="text-3xl font-bold">התיק של שירן</h1>
        </div>
      </div>

      {error && (
        <div className="max-w-screen-xl mx-auto bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6 shadow-lg">
          {error}
        </div>
      )}

      <div className="space-y-8 max-w-screen-xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl shadow-lg p-6 space-y-4">
          <h2 className="text-xl font-bold text-slate-800">סיכום ביצועי התיק</h2>
          {isLoading ? (
            <p className="text-center text-slate-500 py-4">טוען נתונים...</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div>
                <p className="text-slate-500 text-sm">סה"כ רווח</p>
                <p className="font-bold text-2xl text-green-600">{formatCurrency(totalProfit)}</p>
              </div>
              <div>
                <p className="text-slate-500 text-sm">סה"כ הפסד</p>
                <p className="font-bold text-2xl text-red-600">{formatCurrency(totalLoss)}</p>
              </div>
              <div>
                <p className="text-slate-500 text-sm">אחוז הצלחה</p>
                <p className="font-bold text-2xl text-slate-800">
                  {formatNumber(winRate, 1, 1)}%
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-sm">יחס סיכון/סיכוי</p>
                <p className="font-bold text-2xl text-slate-800">
                  {averageRiskReward > 0 ? `1:${formatNumber(averageRiskReward, 2, 2)}` : '-'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-sm">עסקאות פתוחות</p>
                <p className="font-bold text-2xl text-slate-800">{formatInt(openDeals.length)}</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-50/80 backdrop-blur-sm border border-slate-200/60 rounded-xl shadow-lg">
          <div className="p-6">
            <h3 className="text-xl font-bold text-slate-800">עסקאות פתוחות ({formatInt(openDeals.length)})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm rtl text-right">
              <thead className="border-b border-slate-200/80">
                <tr>
                  <th className="p-4 font-semibold text-slate-500 text-right">סימבול</th>
                  <th className="p-4 font-semibold text-slate-500 text-right">מחיר כניסה</th>
                  <th className="p-4 font-semibold text-slate-500 text-right">סטופ לוס</th>
                  <th className="p-4 font-semibold text-slate-500 text-right">טייק פרופיט</th>
                  <th className="p-4 font-semibold text-slate-500 text-right">מחיר נוכחי</th>
                  <th className="p-4 font-semibold text-slate-500 text-right">רווח/הפסד נוכחי</th>
                </tr>
              </thead>
              <tbody>
                {openDealsWithPriceData.map((d) => (
                  <tr key={d.id} className="border-t border-slate-200/60 hover:bg-slate-100/20 align-middle">
                    <td className="p-4">
                      <span className="bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1 rounded-full">{d.symbol}</span>
                    </td>
                    <td className="p-4 text-slate-600">{formatCurrency(d.entry_price)}</td>
                    <td className="p-4 text-slate-600">{d.stop_loss ? formatCurrency(d.stop_loss) : '-'}</td>
                    <td className="p-4 text-slate-600">{d.take_profit ? formatCurrency(d.take_profit) : '-'}</td>
                    <td className="p-4 text-slate-600 font-medium">
                      {d.current_price ? formatCurrency(d.current_price) : 'טוען...'}
                    </td>
                    <td className="p-4 font-bold">
                      {d.unrealized_pnl !== undefined ? (
                        <span className={d.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {d.unrealized_pnl >= 0 ? '+' : '-'}
                          {formatCurrency(Math.abs(d.unrealized_pnl))}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {openDeals.length === 0 && !isLoading && (
              <p className="text-center text-slate-500 py-8">אין עסקאות פתוחות.</p>
            )}
          </div>
        </div>

        <div className="bg-green-50/80 backdrop-blur-sm border border-green-200/60 rounded-xl shadow-lg">
          <div className="p-6">
            <h3 className="text-xl font-bold text-green-800">
              עסקאות רווחיות ({formatInt(closedProfitDeals.length)})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm rtl text-right">
              <thead className="border-b border-green-200/80">
                <tr>
                  <th className="p-4 font-semibold text-green-700 text-right">סימבול</th>
                  <th className="p-4 font-semibold text-green-700 text-right">מחיר כניסה</th>
                  <th className="p-4 font-semibold text-green-700 text-right">מחיר סגירה</th>
                  <th className="p-4 font-semibold text-green-700 text-right">רווח</th>
                </tr>
              </thead>
              <tbody>
                {closedProfitDeals.map((d) => (
                  <tr key={d.id} className="border-t border-green-200/60 hover:bg-green-100/30 align-middle">
                    <td className="p-4">
                      <span className="bg-green-200/60 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">{d.symbol}</span>
                    </td>
                    <td className="p-4 text-slate-600">{formatCurrency(d.entry_price)}</td>
                    <td className="p-4 text-slate-600">{formatCurrency(d.closed_price || 0)}</td>
                    <td className="p-4 font-bold text-green-600">
                      +{formatCurrency(((d.closed_price || 0) - d.entry_price) * d.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {closedProfitDeals.length === 0 && !isLoading && (
              <p className="text-center text-green-700/70 py-8">אין עסקאות סגורות ברווח.</p>
            )}
          </div>
        </div>

        <div className="bg-red-50/80 backdrop-blur-sm border border-red-200/60 rounded-xl shadow-lg">
          <div className="p-6">
            <h3 className="text-lg font-bold text-red-800">
              עסקאות בהפסד ({formatInt(closedLossDeals.length)})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm rtl text-right">
              <thead className="border-b border-red-200/80">
                <tr>
                  <th className="p-4 font-semibold text-red-700 text-right">סימבול</th>
                  <th className="p-4 font-semibold text-red-700 text-right">מחיר כניסה</th>
                  <th className="p-4 font-semibold text-red-700 text-right">מחיר סגירה</th>
                  <th className="p-4 font-semibold text-red-700 text-right">הפסד</th>
                </tr>
              </thead>
              <tbody>
                {closedLossDeals.map((d) => (
                  <tr key={d.id} className="border-t border-red-200/60 hover:bg-red-100/30 align-middle">
                    <td className="p-4">
                      <span className="bg-red-200/60 text-red-800 text-xs font-semibold px-3 py-1 rounded-full">{d.symbol}</span>
                    </td>
                    <td className="p-4 text-slate-600">{formatCurrency(d.entry_price)}</td>
                    <td className="p-4 text-slate-600">{formatCurrency(d.closed_price || 0)}</td>
                    <td className="p-4 font-bold text-red-600">
                      -{formatCurrency((d.entry_price - (d.closed_price || 0)) * d.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {closedLossDeals.length === 0 && !isLoading && (
              <p className="text-center text-red-700/70 py-8">אין עסקאות סגורות בהפסד.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
