'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

// --- ממשקים ---
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
  status?: string | null;
  closed_at?: string | null;
  notes?: string | null;
};

type DailyUpdate = {
  symbol: string;
  current_price: number;
};

interface DealWithPrice extends Deal {
  current_price?: number;
  unrealized_pnl?: number;
}

// --- רכיב: מחשבון סיכונים ---
function RiskCalculator() {
    const [calcEntry, setCalcEntry] = useState('');
    const [calcStop, setCalcStop] = useState('');
    const [riskAmount, setRiskAmount] = useState('1000');
    const [sharesToBuy, setSharesToBuy] = useState<number | null>(null);
    const calculateShares=()=>{const entry=parseFloat(calcEntry);const stop=parseFloat(calcStop);const risk=parseFloat(riskAmount);if(entry>0&&stop>0&&risk>0&&entry>stop){const riskPerShare=entry-stop;const calculatedShares=risk/riskPerShare;setSharesToBuy(calculatedShares)}else{setSharesToBuy(null)}};useEffect(()=>{calculateShares()},[calcEntry,calcStop,riskAmount]);const resetCalculator=()=>{setCalcEntry('');setCalcStop('');setRiskAmount('');setSharesToBuy(null)};
    return(
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl shadow-lg p-6 space-y-4">
        <h2 className="text-xl font-bold text-slate-800">מחשבון סיכונים</h2>
        <input placeholder="מחיר כניסה למניה" type="number" className="w-full bg-white/80 border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2.5" value={calcEntry} onChange={(e) => setCalcEntry(e.target.value)} />
        <input placeholder="מחיר סטופ-לוס" type="number" className="w-full bg-white/80 border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2.5" value={calcStop} onChange={(e) => setCalcStop(e.target.value)} />
        <input placeholder="סכום סיכון רצוי ($)" type="number" className="w-full bg-white/80 border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2.5" value={riskAmount} onChange={(e) => setRiskAmount(e.target.value)} />
        {sharesToBuy!==null&&(<div className="bg-blue-100/50 border border-blue-200 text-center p-4 rounded-lg"><p className="text-sm text-blue-800">כמות מניות מומלצת:</p><p className="text-2xl font-bold text-blue-900">{sharesToBuy.toFixed(2)}</p></div>)}
        <button onClick={resetCalculator} className="w-full bg-slate-500 hover:bg-slate-600 text-white py-2 px-4 rounded-md font-semibold text-sm shadow-md transition-all">אפס מחשבון</button>
        </div>
    );
}

// --- רכיב העמוד הראשי ---
export default function AdminDealsPage() {
  const supabase = createClient(); 
  const [deals, setDeals] = useState<Deal[]>([]);
  const [dailyUpdates, setDailyUpdates] = useState<DailyUpdate[]>([]);
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [initialBalance, setInitialBalance] = useState<number | null>(null);
  const [editedBalance, setEditedBalance] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      } else {
        setError("משתמש אינו מחובר.");
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    if (user) {
      const loadUserData = async () => {
        setIsLoading(true);
        await Promise.all([ fetchDeals(), fetchPriceUpdates(), fetchInitialBalance() ]);
        setIsLoading(false);
      };
      loadUserData();

      const priceChannel = supabase.channel('price-updates-admin').on('postgres_changes', { event: '*', schema: 'public', table: 'daily_portfolio_updates' }, fetchPriceUpdates).subscribe();
      const dealChannel = supabase.channel('deal-updates-admin').on('postgres_changes', { event: '*', schema: 'public', table: 'community_deals'}, fetchDeals).subscribe();
      
      return () => {
        supabase.removeChannel(priceChannel);
        supabase.removeChannel(dealChannel);
      };
    }
  }, [user]);

  const fetchDeals = async () => {
    const { data, error } = await supabase.from('community_deals').select('*').order('created_at', { ascending: false });
    if (error) setError('שגיאה בטעינת עסקאות');
    else setDeals(data as Deal[]);
  };

  const fetchPriceUpdates = async () => {
    const { data, error } = await supabase.from('daily_portfolio_updates').select('symbol, current_price');
    if (!error) setDailyUpdates(data as DailyUpdate[]);
  };

  const fetchInitialBalance = async () => {
      const { data } = await supabase.from('portfolio_settings').select('initial_balance').limit(1).single();
      if (data) {
        setInitialBalance(data.initial_balance);
        setEditedBalance(data.initial_balance.toString());
      }
  };
  
  const addDeal = async () => {
    if (!user) return;
    if (!symbol || !quantity || !entryPrice) {
      setError("יש למלא סימבול, כמות ומחיר כניסה.");
      return;
    }
    setError(null);
    await supabase.from('community_deals').insert({
      user_id: user.id,
      symbol: symbol.toUpperCase(),
      quantity: parseFloat(quantity),
      entry_price: parseFloat(entryPrice),
      stop_loss: parseFloat(stopLoss) || null,
      take_profit: parseFloat(takeProfit) || null,
      is_closed: false,
      status: 'open',
    });
    // Realtime listener will handle UI update, just clear the form
    setSymbol(''); setQuantity(''); setEntryPrice(''); setStopLoss(''); setTakeProfit('');
  };

  const deleteDeal = async (dealId: number) => {
    if (!window.confirm("האם אתה בטוח?")) return;
    await supabase.from('community_deals').delete().match({ id: dealId });
    // Realtime listener will handle UI update
  };

  const closeDeal = async (deal: Deal) => {
    const closingPriceStr = window.prompt(`באיזה מחיר נסגרה העסקה עבור ${deal.symbol}?`);
    if (closingPriceStr === null) return;
    const closingPrice = parseFloat(closingPriceStr);
    if (isNaN(closingPrice)) {
      setError("מחיר הסגירה חייב להיות מספר.");
      return;
    }
    const result = closingPrice >= deal.entry_price ? 'profit' : 'loss';
    const status = result === 'profit' ? 'closed_profit' : 'closed_loss';
    await supabase
      .from('community_deals')
      .update({ 
          is_closed: true, 
          closed_price: closingPrice, 
          result: result,
          status: status,
          closed_at: new Date().toISOString()
      })
      .eq('id', deal.id);
    // Realtime listener will handle UI update
  };
  
  const handleBalanceUpdate = async () => {
    if (!user) return;
    const newBalance = parseFloat(editedBalance);
    if (isNaN(newBalance)) {
      setError("ערך התיק חייב להיות מספר.");
      return;
    }
    await supabase.from('portfolio_settings').update({ initial_balance: newBalance }).eq('id', 1);
    setInitialBalance(newBalance);
  };
  
  const openDeals = useMemo(() => deals.filter((d) => !d.is_closed), [deals]);
  const closedProfitDeals = useMemo(() => deals.filter((d) => d.is_closed && (d.result === 'profit' || d.status === 'closed_profit')), [deals]);
  const closedLossDeals = useMemo(() => deals.filter((d) => d.is_closed && (d.result === 'loss' || d.status === 'closed_loss')), [deals]);
  const totalProfit = useMemo(() => closedProfitDeals.reduce((acc, d) => acc + ((d.closed_price || 0) - d.entry_price) * d.quantity, 0), [closedProfitDeals]);
  const totalLoss = useMemo(() => closedLossDeals.reduce((acc, d) => acc + (d.entry_price - (d.closed_price || 0)) * d.quantity, 0), [closedLossDeals]);
  
  const openDealsWithPriceData = useMemo<DealWithPrice[]>(() => {
    return openDeals.map(deal => {
        const currentPriceData = dailyUpdates.find(update => update.symbol === deal.symbol);
        if (currentPriceData) {
            const unrealized_pnl = (currentPriceData.current_price - deal.entry_price) * deal.quantity;
            return { ...deal, current_price: currentPriceData.current_price, unrealized_pnl };
        }
        return { ...deal, current_price: undefined, unrealized_pnl: undefined };
    });
  }, [openDeals, dailyUpdates]);
  
  const unrealizedPnl = useMemo(() => openDealsWithPriceData.reduce((acc, deal) => acc + (deal.unrealized_pnl || 0), 0), [openDealsWithPriceData]);
  const currentBalance = useMemo(() => (initialBalance || 0) + totalProfit - totalLoss + unrealizedPnl, [initialBalance, totalProfit, totalLoss, unrealizedPnl]);
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
    const dealsWithRr = allClosedDeals.filter(d => 
        typeof d.stop_loss === 'number' && 
        typeof d.closed_price === 'number' &&
        d.entry_price !== d.stop_loss
    );
    if (dealsWithRr.length === 0) return 0;
    const totalRr = dealsWithRr.reduce((acc, d) => {
      const risk = Math.abs(d.entry_price - d.stop_loss!);
      const reward = Math.abs(d.closed_price! - d.entry_price);
      if (risk > 0) {
        return acc + (reward / risk);
      }
      return acc;
    }, 0);
    return totalRr / dealsWithRr.length;
  }, [closedProfitDeals, closedLossDeals]);

  return (
    <div dir="rtl" className="min-h-screen p-4 sm:p-6 lg:p-8 bg-cover bg-center bg-fixed" style={{ backgroundImage: "url('/images/background.jpg')" }}>
        <div className="flex justify-center mb-8">
            <div className="bg-blue-600 text-white p-5 rounded-xl shadow-lg w-auto inline-block">
                <h1 className="text-3xl font-bold">ניהול עסקאות קהילתיות</h1>
            </div>
        </div>
        {error && <div className="max-w-screen-xl mx-auto bg-red-100 border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 shadow-lg">{error}</div>}
        <div className="flex flex-col lg:flex-row gap-8 max-w-screen-xl mx-auto">
            <aside className="lg:w-1/3 w-full space-y-8 self-start lg:sticky top-8">
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl shadow-lg p-6 space-y-4">
                    <h2 className="text-xl font-bold text-slate-800">הכנס עסקה חדשה</h2>
                    <input placeholder="סימבול" className="w-full bg-white/80 border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2.5" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
                    <input placeholder="כמות" type="number" className="w-full bg-white/80 border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2.5" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                    <input placeholder="מחיר כניסה" type="number" className="w-full bg-white/80 border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2.5" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} />
                    <input placeholder="סטופ לוס" type="number" className="w-full bg-white/80 border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2.5" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} />
                    <input placeholder="טייק פרופיט" type="number" className="w-full bg-white/80 border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2.5" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} />
                    <button onClick={addDeal} disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-md font-semibold shadow-md transition-all disabled:bg-slate-400 disabled:cursor-not-allowed">
                        {isLoading ? 'מעבד...' : 'הוסף עסקה'}
                    </button>
                </div>
                <RiskCalculator />
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl shadow-lg p-6 space-y-4">
                    <h2 className="text-xl font-bold text-slate-800">סטטיסטיקות התיק</h2>
                    {isLoading || initialBalance === null ? <p className="text-center text-slate-500 py-4">טוען נתונים...</p> : (
                    <>
                        <div>
                            <div className="flex items-center gap-2">
                                <input type="number" value={editedBalance} onChange={e => setEditedBalance(e.target.value)} className="w-full bg-white/80 border-slate-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 px-3 py-2.5" />
                                <button onClick={handleBalanceUpdate} disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-md font-semibold text-sm shadow-md transition-all disabled:bg-slate-400">עדכן</button>
                            </div>
                        </div>
                        <div className="border-t border-slate-200/80 pt-4 space-y-2">
                            <div className="flex justify-between items-baseline"><span className="text-slate-600">שווי נוכחי:</span> 
                                <div className='flex flex-col items-end'>
                                    <span className={`font-bold text-2xl ${balanceColor}`}>${currentBalance.toFixed(2)}</span>
                                    <span className={`text-sm font-semibold ${balanceColor}`}>({percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(2)}%)</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center"><span className="text-slate-600">סה"כ רווח:</span> <span className="font-semibold text-green-600">${totalProfit.toFixed(2)}</span></div>
                            <div className="flex justify-between items-center"><span className="text-slate-600">סה"כ הפסד:</span> <span className="font-semibold text-red-600">${totalLoss.toFixed(2)}</span></div>
                             <div className="flex justify-between items-center"><span className="text-slate-600">רווח/הפסד לא ממומש:</span> <span className={`font-semibold ${unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>{unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)}</span></div>
                        </div>
                        <div className="border-t border-slate-200/80 pt-4 space-y-2 text-sm">
                            <div className="flex justify-between items-center"><span className="text-slate-600">עסקאות רווחיות:</span> <span className="font-medium text-slate-800">{closedProfitDeals.length}</span></div>
                            <div className="flex justify-between items-center"><span className="text-slate-600">עסקאות מפסידות:</span> <span className="font-medium text-slate-800">{closedLossDeals.length}</span></div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600">יחס סיכון/סיכוי ממוצע:</span>
                                <span className="font-medium text-slate-800">
                                    {averageRiskReward > 0 ? `1 : ${averageRiskReward.toFixed(2)}` : '-'}
                                </span>
                            </div>
                        </div>
                    </>
                    )}
                </div>
            </aside>
            <main className="lg:w-2/3 w-full space-y-8">
                {isLoading && !deals.length && <div className="text-center text-white/80 font-bold text-xl">טוען נתונים...</div>}
                
                <div className="bg-slate-50/80 backdrop-blur-sm border border-slate-200/60 rounded-xl shadow-lg">
                    <div className="p-6">
                        <h3 className="text-xl font-bold text-slate-800">עסקאות פתוחות ({openDeals.length})</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm rtl text-right">
                            <thead className="border-b border-slate-200/80">
                                <tr>
                                    <th className="p-4 font-semibold text-slate-500 text-right">סימבול</th>
                                    <th className="p-4 font-semibold text-slate-500 text-right">כמות</th>
                                    <th className="p-4 font-semibold text-slate-500 text-right">כניסה</th>
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
                                        <td className="p-4"><span className="bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1 rounded-full">{d.symbol}</span></td>
                                        <td className="p-4 text-slate-600">{d.quantity}</td>
                                        <td className="p-4 text-slate-600">${d.entry_price}</td>
                                        <td className="p-4 text-slate-600">{d.stop_loss ? `$${d.stop_loss}` : '-'}</td>
                                        <td className="p-4 text-slate-600">{d.take_profit ? `$${d.take_profit}` : '-'}</td>
                                        <td className="p-4 text-slate-600 font-medium">{d.current_price ? `$${d.current_price}` : 'טוען...'}</td>
                                        <td className="p-4 font-bold">
                                            {d.unrealized_pnl !== undefined ? (
                                                <span className={d.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                    {d.unrealized_pnl >= 0 ? `+` : ''}{d.unrealized_pnl.toFixed(2)}$
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="p-4 flex items-center gap-2">
                                            <button onClick={() => closeDeal(d)} disabled={isLoading} className="text-xs bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-2.5 rounded-md shadow-sm transition-colors disabled:bg-slate-300">סגור</button>
                                            <button onClick={() => deleteDeal(d.id)} disabled={isLoading} className="text-xs bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-2.5 rounded-md shadow-sm transition-colors disabled:bg-slate-300">מחק</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-green-50/80 backdrop-blur-sm border border-green-200/60 rounded-xl shadow-lg">
                     <div className="p-6">
                        <h3 className="text-xl font-bold text-green-800">עסקאות ברווח ({closedProfitDeals.length})</h3>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm rtl text-right">
                            <thead className="border-b border-green-200/80">
                                <tr>
                                    <th className="p-4 font-semibold text-green-700 text-right">סימבול</th>
                                    <th className="p-4 font-semibold text-green-700 text-right">כניסה</th>
                                    <th className="p-4 font-semibold text-green-700 text-right">סגירה</th>
                                    <th className="p-4 font-semibold text-green-700 text-right">רווח</th>
                                    <th className="p-4 font-semibold text-green-700 text-right"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {closedProfitDeals.map((d) => (
                                    <tr key={d.id} className="border-t border-green-200/60 hover:bg-green-100/30 align-middle">
                                        <td className="p-4"><span className="bg-green-200/60 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">{d.symbol}</span></td>
                                        <td className="p-4 text-slate-600">${d.entry_price}</td>
                                        <td className="p-4 text-slate-600">${d.closed_price}</td>
                                        <td className="p-4 font-bold text-green-600">+${(((d.closed_price || 0) - d.entry_price) * d.quantity).toFixed(2)}</td>
                                        <td className="p-4"><button onClick={() => deleteDeal(d.id)} disabled={isLoading} className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-600 font-semibold py-1 px-2.5 rounded-md transition-colors disabled:bg-slate-100">מחק</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                </div>
                <div className="bg-red-50/80 backdrop-blur-sm border border-red-200/60 rounded-xl shadow-lg">
                    <div className="p-6">
                        <h3 className="text-lg font-bold text-red-800">עסקאות בהפסד ({closedLossDeals.length})</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm rtl text-right">
                            <thead className="border-b border-red-200/80">
                                <tr>
                                    <th className="p-4 font-semibold text-red-700 text-right">סימבול</th>
                                    <th className="p-4 font-semibold text-red-700 text-right">כניסה</th>
                                    <th className="p-4 font-semibold text-red-700 text-right">סגירה</th>
                                    <th className="p-4 font-semibold text-red-700 text-right">הפסד</th>
                                    <th className="p-4 font-semibold text-red-700 text-right"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {closedLossDeals.map((d) => (
                                    <tr key={d.id} className="border-t border-red-200/60 hover:bg-red-100/30 align-middle">
                                        <td className="p-4"><span className="bg-red-200/60 text-red-800 text-xs font-semibold px-3 py-1 rounded-full">{d.symbol}</span></td>
                                        <td className="p-4 text-slate-600">${d.entry_price}</td>
                                        <td className="p-4 text-slate-600">${d.closed_price}</td>
                                        <td className="p-4 font-bold text-red-600">-${((d.entry_price - (d.closed_price || 0)) * d.quantity).toFixed(2)}</td>
                                        <td className="p-4"><button onClick={() => deleteDeal(d.id)} disabled={isLoading} className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-600 font-semibold py-1 px-2.5 rounded-md transition-colors disabled:bg-slate-100">מחק</button></td>
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