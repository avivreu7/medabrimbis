import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';
import React, { ReactNode } from 'react';

// =======================================================================
// רכיבי עזר (ללא שינוי)
// =======================================================================
const AnalyticsCard = ({ title, children, className }: { title: string, children: ReactNode, className?: string }) => (
    <div className={`bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl shadow-lg p-6 ${className}`}>
        <h3 className="text-lg font-bold text-slate-800 mb-4">{title}</h3>
        {children}
    </div>
);

// =======================================================================
// שליפת ועיבוד נתונים
// =======================================================================

async function getProfitabilityAnalytics() {
    const supabase = createClient();

    const { data: closedTrades, error } = await supabase
        .from('portfolio_trades')
        .select('symbol, quantity, entry_price, closed_price, result')
        .eq('is_closed', true)
        .not('closed_price', 'is', null);

    if (error) {
        console.error("Error fetching closed trades:", error);
        return null;
    }
    
    const { data: openTrades } = await supabase
        .from('portfolio_trades')
        .select('symbol, quantity');

    // --- חישובים ---

    let totalProfit = 0;
    let totalLoss = 0;
    let profitableTradesCount = 0;
    const symbolPnl: Record<string, number> = {};

    closedTrades.forEach(trade => {
        if (trade.closed_price && trade.entry_price && trade.quantity) {
            const pnl = (trade.closed_price - trade.entry_price) * trade.quantity;
            symbolPnl[trade.symbol] = (symbolPnl[trade.symbol] || 0) + pnl;

            if (pnl > 0) {
                totalProfit += pnl;
                profitableTradesCount++;
            } else {
                totalLoss += pnl;
            }
        }
    });

    const totalClosedTrades = closedTrades.length;
    const successRate = totalClosedTrades > 0 ? (profitableTradesCount / totalClosedTrades) * 100 : 0;
    const netProfit = totalProfit + totalLoss;

    const openTradesCount = openTrades?.length || 0;
    const investedQuantities = (openTrades || []).reduce((acc: Record<string, number>, trade) => {
        acc[trade.symbol] = (acc[trade.symbol] || 0) + trade.quantity;
        return acc;
    }, {});

    const mostInvestedStock = Object.entries(investedQuantities).sort((a, b) => b[1] - a[1])[0] || [null, 0];

    const sortedPnl = Object.entries(symbolPnl).sort((a, b) => b[1] - a[1]);
    const mostProfitableStock = sortedPnl[0] || [null, 0];
    const mostLosingStock = sortedPnl.length > 0 ? sortedPnl[sortedPnl.length - 1] : [null, 0];

    return {
        totalProfit,
        totalLoss,
        netProfit,
        successRate,
        profitableTradesCount,
        losingTradesCount: totalClosedTrades - profitableTradesCount,
        openTradesCount,
        mostInvestedStock: { symbol: mostInvestedStock[0], quantity: mostInvestedStock[1] as number },
        mostProfitableStock: { symbol: mostProfitableStock[0], pnl: mostProfitableStock[1] as number },
        mostLosingStock: { symbol: mostLosingStock[0], pnl: mostLosingStock[1] as number },
    };
}


// =======================================================================
// רכיב העמוד
// =======================================================================

export default async function AnalyticsPage() {
  const data = await getProfitabilityAnalytics();

  if (!data) {
    return <div className="p-8 text-center text-red-500">שגיאה בטעינת נתוני האנליטיקס.</div>
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen p-4 sm:p-6 lg:p-8 bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/images/background.jpg')" }}
    >
      <div className="max-w-screen-xl mx-auto">
        <div className="flex justify-center mb-8">
          <div className="bg-blue-600 text-white py-4 px-8 rounded-xl shadow-lg w-auto inline-block">
            <h1 className="text-3xl font-bold">ניתוח רווחיות הקהילה</h1>
          </div>
        </div>

        {/* מדדי רווחיות כלליים */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <AnalyticsCard title="רווח נקי (כלל החברים)">
                <p className={`text-4xl font-bold ${data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {data.netProfit >= 0 ? '+' : ''}${data.netProfit.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </p>
                <p className="text-sm text-slate-500 mt-2">מעסקאות סגורות</p>
            </AnalyticsCard>
            <AnalyticsCard title="אחוז הצלחה">
                <p className="text-4xl font-bold text-slate-800">{data.successRate.toFixed(1)}%</p>
                <p className="text-sm text-slate-500 mt-2">{data.profitableTradesCount} עסקאות רווח / {data.losingTradesCount} הפסד</p>
            </AnalyticsCard>
            <AnalyticsCard title="סה&quot;כ רווח">
                <p className="text-4xl font-bold text-green-600">
                    +${data.totalProfit.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </p>
                <p className="text-sm text-slate-500 mt-2">סכום כל העסקאות הרווחיות</p>
            </AnalyticsCard>
            <AnalyticsCard title="סה&quot;כ הפסד">
                <p className="text-4xl font-bold text-red-600">
                    ${data.totalLoss.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </p>
                <p className="text-sm text-slate-500 mt-2">סכום כל העסקאות המפסידות</p>
            </AnalyticsCard>
        </div>

        {/* ניתוח מניות ופוזיציות */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <AnalyticsCard title="סה&quot;כ עסקאות פתוחות">
                <div className="text-center h-full flex flex-col justify-center">
                    <p className="text-6xl font-bold text-slate-800">{data.openTradesCount}</p>
                    <p className="text-slate-600 font-medium mt-2">פוזיציות פעילות כרגע בקהילה</p>
                </div>
            </AnalyticsCard>
            <AnalyticsCard title="המניה המושקעת ביותר (בכמות)">
                <div className="text-center h-full flex flex-col justify-center">
                    {data.mostInvestedStock.symbol ? (
                        <>
                            <span className="bg-blue-200 text-blue-800 text-lg font-semibold px-4 py-2 rounded-full">{data.mostInvestedStock.symbol}</span>
                            <p className="text-sm text-slate-500 pt-4">הפוזיציה הגדולה ביותר בקהילה</p>
                            <p className="text-4xl font-bold text-blue-600 mt-2">{data.mostInvestedStock.quantity.toLocaleString()}</p>
                            <p className="text-slate-600">מניות מוחזקות</p>
                        </>
                    ) : <p className="text-slate-500">אין נתונים</p>}
                </div>
            </AnalyticsCard>
             <AnalyticsCard title="המניה הרווחית / המפסידה ביותר">
                <div className="space-y-4">
                    {data.mostProfitableStock.symbol && data.mostProfitableStock.pnl > 0 && (
                        <div className="text-center p-4 bg-green-50/50 rounded-lg">
                            <p className="text-sm font-semibold text-green-800">הכי רווחית</p>
                            <span className="text-lg font-bold text-green-700">{data.mostProfitableStock.symbol}</span>
                            <p className="text-2xl font-bold text-green-600">
                                +${data.mostProfitableStock.pnl.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                    )}
                     {/* --- התיקון כאן: בדיקה שהערך קיים ושהוא שלילי --- */}
                     {data.mostLosingStock.symbol && typeof data.mostLosingStock.pnl === 'number' && data.mostLosingStock.pnl < 0 && (
                        <div className="text-center p-4 bg-red-50/50 rounded-lg">
                            <p className="text-sm font-semibold text-red-800">הכי מפסידה</p>
                            <span className="text-lg font-bold text-red-700">{data.mostLosingStock.symbol}</span>
                            <p className="text-2xl font-bold text-red-600">
                                ${data.mostLosingStock.pnl.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                    )}
                    {(!data.mostProfitableStock.symbol || data.mostProfitableStock.pnl <= 0) && (!data.mostLosingStock.symbol || data.mostLosingStock.pnl >= 0) && (
                        <p className="text-slate-500 text-center">אין נתונים על עסקאות סגורות</p>
                    )}
                </div>
            </AnalyticsCard>
        </div>
      </div>
    </div>
  );
}