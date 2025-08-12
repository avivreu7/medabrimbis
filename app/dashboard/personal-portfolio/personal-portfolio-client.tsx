'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';

// --- ממשקים (ללא שינוי) ---
type Deal = {
  id: number;
  user_id: string;
  symbol: string;
  quantity: number;
  entry_price: number;
  stop_loss: number | null;
  take_profit: number | null;
  is_closed: boolean;
  closed_price?: number | null;
  result?: 'profit' | 'loss' | null;
  created_at: string;
};
type DailyUpdate = {
  symbol: string;
  current_price: number;
};
interface DealWithPrice extends Deal {
  current_price?: number;
  unrealized_pnl?: number;
}

// --- פונקציות עזר לפורמט מספרים עם אלפים ---
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

// --- רכיב: מחשבון סיכונים (ללא שינוי לוגיקה, רק פורמט תצוגה) ---
function RiskCalculator() {
  const [calcEntry, setCalcEntry] = useState('');
  const [calcStop, setCalcStop] = useState('');
  const [riskAmount, setRiskAmount] = useState('');
  const [sharesToBuy, setSharesToBuy] = useState<number | null>(null);

  const calculateShares = () => {
    const entry = parseFloat(calcEntry);
    const stop = parseFloat(calcStop);
    const risk = parseFloat(riskAmount);
    if (entry > 0 && stop > 0 && risk > 0 && entry > stop) {
      const riskPerShare = entry - stop;
      const calculatedShares = risk / riskPerShare;
      setSharesToBuy(calculatedShares);
    } else {
      setSharesToBuy(null);
    }
  };

  useEffect(() => {
    calculateShares();
  }, [calcEntry, calcStop, riskAmount]);

  const resetCalculator = () => {
    setCalcEntry('');
    setCalcStop('');
    setRiskAmount('');
    setSharesToBuy(null);
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl shadow-lg p-6 space-y-4">
      <h2 className="text-xl font-bold text-slate-800">מחשבון סיכונים</h2>
      <input
        placeholder="מחיר כניסה למניה"
        type="number"
        className="w-full bg-white/80 border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2.5"
        value={calcEntry}
        onChange={(e) => setCalcEntry(e.target.value)}
      />
      <input
        placeholder="מחיר סטופ-לוס"
        type="number"
        className="w-full bg-white/80 border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2.5"
        value={calcStop}
        onChange={(e) => setCalcStop(e.target.value)}
      />
      <input
        placeholder="סכום סיכון רצוי ($)"
        type="number"
        className="w-full bg-white/80 border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2.5"
        value={riskAmount}
        onChange={(e) => setRiskAmount(e.target.value)}
      />
      {sharesToBuy !== null && (
        <div className="bg-blue-100/50 border border-blue-200 text-center p-4 rounded-lg">
          <p className="text-sm text-blue-800">כמות מניות מומלצת:</p>
          <p className="text-2xl font-bold text-blue-900">{formatNumber(sharesToBuy, 2, 2)}</p>
        </div>
      )}
      <button
        onClick={resetCalculator}
        className="w-full bg-slate-500 hover:bg-slate-600 text-white py-2 px-4 rounded-md font-semibold text-sm shadow-md transition-all"
      >
        אפס מחשבון
      </button>
    </div>
  );
}

// --- קומפוננטת הלקוח הראשית ---
export default function PersonalPortfolioClient() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const viewedUserId = searchParams.get('userId');
  const isAdminView = !!viewedUserId;

  // --- התיקון: ה-State יחזיק גם את האימייל ---
  const [portfolioOwner, setPortfolioOwner] = useState<{ id: string; fullName: string | null; email: string | null } | null>(null);

  const [deals, setDeals] = useState<Deal[]>([]);
  const [dailyUpdates, setDailyUpdates] = useState<DailyUpdate[]>([]);
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [initialBalance, setInitialBalance] = useState<number | null>(null);
  const [editedBalance, setEditedBalance] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeals = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from('portfolio_trades')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) setError('שגיאה בטעינת עסקאות');
      else setDeals(data as Deal[]);
    },
    [supabase],
  );

  const fetchPriceUpdates = useCallback(async () => {
    const { data, error } = await supabase.from('daily_portfolio_updates').select('symbol, current_price');
    if (!error) setDailyUpdates(data as DailyUpdate[]);
  }, [supabase]);

  const fetchInitialBalance = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase.from('profiles').select('initial_balance, full_name, email').eq('id', userId).single();
      if (error) setError('שגיאה בטעינת פרטי התיק');
      if (data) {
        setInitialBalance(data.initial_balance);
        setEditedBalance(String(data.initial_balance || ''));
        setPortfolioOwner({ id: userId, fullName: data.full_name, email: data.email });
      }
    },
    [supabase],
  );

  useEffect(() => {
    const loadPageData = async () => {
      setIsLoading(true);
      setError(null);
      let targetUserId: string | null = null;

      if (isAdminView) {
        targetUserId = viewedUserId;
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          targetUserId = session.user.id;
        } else {
          setError('יש להתחבר כדי לראות את התיק האישי.');
          setIsLoading(false);
          return;
        }
      }

      if (targetUserId) {
        await Promise.all([fetchDeals(targetUserId), fetchPriceUpdates(), fetchInitialBalance(targetUserId)]);
      }
      setIsLoading(false);
    };

    loadPageData();
  }, [isAdminView, viewedUserId, supabase, fetchDeals, fetchPriceUpdates, fetchInitialBalance]);

  const addDeal = async () => {
    if (!portfolioOwner) return;
    if (!symbol || !quantity || !entryPrice) {
      setError('יש למלא סימבול, כמות ומחיר כניסה.');
      return;
    }
    setError(null);
    const { error } = await supabase.from('portfolio_trades').insert({
      user_id: portfolioOwner.id,
      symbol: symbol.toUpperCase(),
      quantity: parseFloat(quantity),
      entry_price: parseFloat(entryPrice),
      stop_loss: parseFloat(stopLoss) || null,
      take_profit: parseFloat(takeProfit) || null,
    });
    if (error) {
      setError(`שגיאה בהוספת עסקה: ${error.message}`);
    } else {
      setSymbol('');
      setQuantity('');
      setEntryPrice('');
      setStopLoss('');
      setTakeProfit('');
      await fetchDeals(portfolioOwner.id);
    }
  };

  const deleteDeal = async (dealId: number) => {
    if (!portfolioOwner) return;
    if (!window.confirm('האם אתה בטוח?')) return;
    const { error } = await supabase.from('portfolio_trades').delete().match({ id: dealId, user_id: portfolioOwner.id });
    if (error) {
      setError(`שגיאה במחיקת עסקה: ${error.message}`);
    } else {
      setDeals((currentDeals) => currentDeals.filter((d) => d.id !== dealId));
    }
  };

  const closeDeal = async (deal: Deal) => {
    if (!portfolioOwner) return;
    const closingPriceStr = window.prompt(`באיזה מחיר נסגרה העסקה עבור ${deal.symbol}?`);
    if (closingPriceStr === null) return;
    const closingPrice = parseFloat(closingPriceStr);
    if (isNaN(closingPrice)) {
      setError('מחיר הסגירה חייב להיות מספר.');
      return;
    }
    const result = closingPrice >= deal.entry_price ? 'profit' : 'loss';
    const { error } = await supabase
      .from('portfolio_trades')
      .update({ is_closed: true, closed_price: closingPrice, result: result })
      .eq('id', deal.id);
    if (error) {
      setError(`שגיאה בסגירת עסקה: ${error.message}`);
    } else {
      await fetchDeals(portfolioOwner.id);
    }
  };

  const handleBalanceUpdate = async () => {
    if (!portfolioOwner) return;
    const newBalance = parseFloat(editedBalance);
    if (isNaN(newBalance)) {
      setError('ערך התיק חייב להיות מספר.');
      return;
    }
    await supabase.from('profiles').update({ initial_balance: newBalance }).eq('id', portfolioOwner.id);
    setInitialBalance(newBalance);
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

  const unrealizedPnl = useMemo(
    () => openDealsWithPriceData.reduce((acc, deal) => acc + (deal.unrealized_pnl || 0), 0),
    [openDealsWithPriceData],
  );

  const currentBalance = useMemo(
    () => (initialBalance || 0) + totalProfit - totalLoss + unrealizedPnl,
    [initialBalance, totalProfit, totalLoss, unrealizedPnl],
  );

  const percentageChange = useMemo(() => {
    if (initialBalance === null || initialBalance === 0) return 0;
    return ((currentBalance - initialBalance) / initialBalance) * 100;
  }, [currentBalance, initialBalance]);

  const balanceColor = useMemo(() => {
    if (percentageChange > 0) return 'text-green-600';
    if (percentageChange < 0) return 'text-red-600';
    return 'text-slate-900';
  }, [percentageChange]);

  const averageRiskReward = useMemo(() => {
    const allClosedDeals = [...closedProfitDeals, ...closedLossDeals];
    const dealsWithRr = allClosedDeals.filter(
      (d) => typeof d.stop_loss === 'number' && typeof d.closed_price === 'number' && d.entry_price !== d.stop_loss,
    );
    if (dealsWithRr.length === 0) return 0;
    const totalRr = dealsWithRr.reduce((acc, d) => {
      const risk = Math.abs(d.entry_price - d.stop_loss!);
      const reward = Math.abs(d.closed_price! - d.entry_price);
      if (risk > 0) {
        return acc + reward / risk;
      }
      return acc;
    }, 0);
    return totalRr / dealsWithRr.length;
  }, [closedProfitDeals, closedLossDeals]);

  // חדש: רווח/הפסד כספי כולל מול היתרה ההתחלתית
  const netChange = useMemo(() => {
    const base = initialBalance || 0;
    return currentBalance - base;
  }, [currentBalance, initialBalance]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">טוען נתונים...</div>;
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen p-4 sm:p-6 lg:p-8 bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/images/background.jpg')" }}
    >
      <div className="flex justify-center mb-8">
        <div className="bg-blue-600 text-white p-5 rounded-xl shadow-lg w-auto inline-block">
          <h1 className="text-3xl font-bold">
            {isAdminView ? `התיק של ${portfolioOwner?.fullName || portfolioOwner?.email || 'משתמש'}` : 'ניהול התיק האישי שלי'}
          </h1>
        </div>
      </div>

      {error && (
        <div className="max-w-screen-xl mx-auto bg-red-100 border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 shadow-lg">{error}</div>
      )}

      <div className="flex flex-col lg:flex-row gap-8 max-w-screen-xl mx-auto">
        <aside className="lg:w-1/3 w-full space-y-8 self-start lg:sticky top-8">
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-800">הוסף עסקה לתיק</h2>
            <input
              placeholder="סימבול"
              className="w-full bg-white/80 border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2.5"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
            />
            <input
              placeholder="כמות"
              type="number"
              className="w-full bg-white/80 border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2.5"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <input
              placeholder="מחיר כניסה"
              type="number"
              className="w-full bg-white/80 border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2.5"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
            />
            <input
              placeholder="סטופ לוס"
              type="number"
              className="w-full bg-white/80 border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2.5"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
            />
            <input
              placeholder="טייק פרופיט"
              type="number"
              className="w-full bg-white/80 border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2.5"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
            />
            <button
              onClick={addDeal}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-md font-semibold shadow-md transition-all disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'מעבד...' : 'הוסף עסקה'}
            </button>
          </div>

          <RiskCalculator />

          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-800">ביצועי התיק האישי</h2>
            {isLoading || initialBalance === null ? (
              <p className="text-center text-slate-500 py-4">טוען נתונים...</p>
            ) : (
              <>
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      placeholder="הזן יתרה התחלתית"
                      type="number"
                      value={editedBalance}
                      onChange={(e) => setEditedBalance(e.target.value)}
                      className="w-full bg-white/80 border-slate-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 px-3 py-2.5"
                    />
                    <button
                      onClick={handleBalanceUpdate}
                      disabled={isLoading}
                      className="bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-md font-semibold text-sm shadow-md transition-all disabled:bg-slate-400"
                    >
                      הגדר
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-200/80 pt-4 space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600">שווי נוכחי:</span>
                    <div className="flex flex-col items-end">
                      <span className={`font-bold text-2xl ${balanceColor}`}>{formatCurrency(currentBalance, 2, 2)}</span>
                      <span className={`text-sm font-semibold ${balanceColor}`}>
                      סה"כ  ({percentageChange >= 0 ? '+' : ''}{formatNumber(percentageChange, 2, 2)}%)
                      </span>
                      {/* חדש: רווח/הפסד כספי כולל מול ההתחלה */}
                      <span className={`text-sm font-semibold ${netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      סה"כ  {netChange >= 0 ? '+' : '-'}
                        {formatCurrency(Math.abs(netChange), 2, 2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">סה"כ עסקאות סגורות ברווח:</span>
                    <span className="font-semibold text-green-600">{formatCurrency(totalProfit, 2, 2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">סה"כ עסקאות סגורות בהפסד:</span>
                    <span className="font-semibold text-red-600">{formatCurrency(totalLoss, 2, 2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">רווח/הפסד לא ממומש:</span>
                    <span className={`font-semibold ${unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {unrealizedPnl >= 0 ? '+' : '-'}
                      {formatCurrency(Math.abs(unrealizedPnl), 2, 2)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-200/80 pt-4 space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">עסקאות רווחיות:</span>
                    <span className="font-medium text-slate-800">{formatInt(closedProfitDeals.length)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">עסקאות מפסידות:</span>
                    <span className="font-medium text-slate-800">{formatInt(closedLossDeals.length)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">יחס סיכון/סיכוי ממוצע:</span>
                    <span className="font-medium text-slate-800">
                      {averageRiskReward > 0 ? `1 : ${formatNumber(averageRiskReward, 2, 2)}` : '-'}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </aside>

        <main className="lg:w-2/3 w-full space-y-8">
          <div className="bg-slate-50/80 backdrop-blur-sm border border-slate-200/60 rounded-xl shadow-lg">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-800">העסקאות הפתוחות ({formatInt(openDeals.length)})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm rtl text-right">
                <thead className="border-b border-slate-200/80">
                  <tr>
                    <th className="p-4 font-semibold text-slate-500 text-right">סימבול</th>
                    <th className="p-4 font-semibold text-slate-500 text-right">כמות</th>
                    <th className="p-4 font-semibold text-slate-500 text-right">מחיר כניסה</th>
                    <th className="p-4 font-semibold text-slate-500 text-right">סטופ לוס</th>
                    <th className="p-4 font-semibold text-slate-500 text-right">טייק פרופיט</th>
                    <th className="p-4 font-semibold text-slate-500 text-right">מחיר נוכחי</th>
                    <th className="p-4 font-semibold text-slate-500 text-right">רווח/הפסד נוכחי</th>
                    <th className="p-4 font-semibold text-slate-500 text-right">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {openDealsWithPriceData.map((d) => (
                    <tr key={d.id} className="border-t border-slate-200/60 hover:bg-slate-100/20 align-middle">
                      <td className="p-4">
                        <span className="bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1 rounded-full">{d.symbol}</span>
                      </td>
                      <td className="p-4 text-slate-600">{formatInt(d.quantity)}</td>
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
                      <td className="p-4 flex items-center gap-2">
                        <button
                          onClick={() => closeDeal(d)}
                          disabled={isLoading}
                          className="text-xs bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-2.5 rounded-md shadow-sm transition-colors disabled:bg-slate-300"
                        >
                          סגור
                        </button>
                        <button
                          onClick={() => deleteDeal(d.id)}
                          disabled={isLoading}
                          className="text-xs bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-2.5 rounded-md shadow-sm transition-colors disabled:bg-slate-300"
                        >
                          מחק
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-green-50/80 backdrop-blur-sm border border-green-200/60 rounded-xl shadow-lg">
            <div className="p-6">
              <h3 className="text-xl font-bold text-green-800">עסקאות רווחיות ({formatInt(closedProfitDeals.length)})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm rtl text-right">
                <thead className="border-b border-green-200/80">
                  <tr>
                    <th className="p-4 font-semibold text-green-700 text-right">סימבול</th>
                    <th className="p-4 font-semibold text-green-700 text-right">מחיר כניסה</th>
                    <th className="p-4 font-semibold text-green-700 text-right">מחיר סגירה</th>
                    <th className="p-4 font-semibold text-green-700 text-right">רווח</th>
                    <th className="p-4 font-semibold text-green-700 text-right"></th>
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
                      <td className="p-4">
                        <button
                          onClick={() => deleteDeal(d.id)}
                          disabled={isLoading}
                          className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-600 font-semibold py-1 px-2.5 rounded-md transition-colors disabled:bg-slate-100"
                        >
                          מחק
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-red-50/80 backdrop-blur-sm border border-red-200/60 rounded-xl shadow-lg">
            <div className="p-6">
              <h3 className="text-lg font-bold text-red-800">עסקאות בהפסד ({formatInt(closedLossDeals.length)})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm rtl text-right">
                <thead className="border-b border-red-200/80">
                  <tr>
                    <th className="p-4 font-semibold text-red-700 text-right">סימבול</th>
                    <th className="p-4 font-semibold text-red-700 text-right">מחיר כניסה</th>
                    <th className="p-4 font-semibold text-red-700 text-right">מחיר סגירה</th>
                    <th className="p-4 font-semibold text-red-700 text-right">הפסד</th>
                    <th className="p-4 font-semibold text-red-700 text-right"></th>
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
                      <td className="p-4">
                        <button
                          onClick={() => deleteDeal(d.id)}
                          disabled={isLoading}
                          className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-600 font-semibold py-1 px-2.5 rounded-md transition-colors disabled:bg-slate-100"
                        >
                          מחק
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
