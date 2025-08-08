'use client';

import { useState, useEffect, useMemo } from 'react';

type TradeType = 'long' | 'short';

export default function RiskCalculatorPage() {
  // Input states
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [riskAmount, setRiskAmount] = useState('');
  const [portfolioSize, setPortfolioSize] = useState('');
  const [tradeType, setTradeType] = useState<TradeType>('long');

  // Output states
  const [sharesToBuy, setSharesToBuy] = useState<number | null>(null);
  const [positionValue, setPositionValue] = useState<number | null>(null);
  const [riskRewardRatio, setRiskRewardRatio] = useState<number | null>(null);
  const [portfolioRiskPercent, setPortfolioRiskPercent] = useState<number | null>(null);

  // Recalculate whenever an input value changes
  useEffect(() => {
    const entry = parseFloat(entryPrice);
    const stop = parseFloat(stopLoss);
    const profitTarget = parseFloat(takeProfit);
    const risk = parseFloat(riskAmount);
    const portfolio = parseFloat(portfolioSize);

    if (isNaN(entry) || isNaN(stop) || isNaN(risk) || risk <= 0) {
      resetOutputs();
      return;
    }
    
    let riskPerShare: number;
    if (tradeType === 'long') {
        riskPerShare = entry - stop;
    } else { // short
        riskPerShare = stop - entry;
    }

    if (riskPerShare <= 0) {
        resetOutputs();
        return;
    }

    // 1. Calculate Shares to Buy
    const calculatedShares = risk / riskPerShare;
    setSharesToBuy(calculatedShares);

    // 2. Calculate Total Position Value
    setPositionValue(calculatedShares * entry);

    // 3. Calculate Risk/Reward Ratio
    if (!isNaN(profitTarget) && profitTarget > 0) {
        let rewardPerShare: number;
        if (tradeType === 'long') {
            rewardPerShare = profitTarget - entry;
        } else { // short
            rewardPerShare = entry - profitTarget;
        }
        
        if (rewardPerShare > 0) {
            setRiskRewardRatio(rewardPerShare / riskPerShare);
        } else {
            setRiskRewardRatio(null);
        }
    } else {
        setRiskRewardRatio(null);
    }
    
    // 4. Calculate Portfolio Risk Percentage
    if (!isNaN(portfolio) && portfolio > 0) {
        setPortfolioRiskPercent((risk / portfolio) * 100);
    } else {
        setPortfolioRiskPercent(null);
    }

  }, [entryPrice, stopLoss, takeProfit, riskAmount, portfolioSize, tradeType]);

  const resetOutputs = () => {
    setSharesToBuy(null);
    setPositionValue(null);
    setRiskRewardRatio(null);
    setPortfolioRiskPercent(null);
  };
  
  const resetAll = () => {
    setEntryPrice('');
    setStopLoss('');
    setTakeProfit('');
    setRiskAmount('');
    setPortfolioSize('');
    setTradeType('long');
  };

  const rrColor = useMemo(() => {
    if (riskRewardRatio === null) return 'text-slate-800';
    if (riskRewardRatio >= 2) return 'text-green-600';
    if (riskRewardRatio >= 1) return 'text-yellow-600';
    return 'text-red-600';
  }, [riskRewardRatio]);

  return (
    <div
      dir="rtl"
      className="min-h-screen p-4 sm:p-6 lg:p-8 bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/images/background.jpg')" }}
    >
      <div className="max-w-md mx-auto">
        <div className="flex justify-center mb-8">
          <div className="bg-blue-600 text-white p-5 rounded-xl shadow-lg w-auto inline-block">
            <h1 className="text-3xl font-bold">מחשבון ניהול סיכונים</h1>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl shadow-lg p-6 space-y-4">
          
          {/* Inputs Section */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">סוג העסקה</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button onClick={() => setTradeType('long')} className={`py-2 rounded-md font-semibold transition-colors ${tradeType === 'long' ? 'bg-green-600 text-white shadow' : 'bg-slate-200 hover:bg-slate-300'}`}>לונג</button>
                <button onClick={() => setTradeType('short')} className={`py-2 rounded-md font-semibold transition-colors ${tradeType === 'short' ? 'bg-red-600 text-white shadow' : 'bg-slate-200 hover:bg-slate-300'}`}>שורט</button>
              </div>
            </div>

            <div>
              <label htmlFor="portfolio" className="text-sm font-medium text-slate-700">שווי התיק הכולל ($)</label>
              <input id="portfolio" type="number" className="w-full bg-white/80 border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2.5 mt-1" value={portfolioSize} onChange={(e) => setPortfolioSize(e.target.value)} />
            </div>

            <div>
              <label htmlFor="risk" className="text-sm font-medium text-slate-700">סכום סיכון רצוי ($)</label>
              <input id="risk" type="number" className="w-full bg-white/80 border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2.5 mt-1" value={riskAmount} onChange={(e) => setRiskAmount(e.target.value)} />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="entry" className="text-sm font-medium text-slate-700">מחיר כניסה</label>
                    <input id="entry" type="number" className="w-full bg-white/80 border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2.5 mt-1" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} />
                </div>
                <div>
                    <label htmlFor="profit" className="text-sm font-medium text-slate-700">מחיר יעד (לקיחת רווח)</label>
                    <input id="profit" type="number" className="w-full bg-white/80 border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2.5 mt-1" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} />
                </div>
            </div>
            <div>
              <label htmlFor="stop" className="text-sm font-medium text-slate-700">מחיר סטופ-לוס</label>
              <input id="stop" type="number" className="w-full bg-white/80 border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2.5 mt-1" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} />
            </div>
          </div>
          
          {/* Results Section */}
          {sharesToBuy !== null && (
            <div className="border-t border-slate-300/80 pt-4 mt-4 space-y-3 bg-slate-50/50 p-4 rounded-lg">
                <h3 className="text-lg font-bold text-slate-800 text-center mb-2">תוצאות החישוב</h3>
                
                <div className="flex justify-between items-center text-lg">
                    <span className="font-medium text-slate-600">כמות מניות לרכישה:</span>
                    <span className="font-bold text-blue-600">{sharesToBuy.toFixed(2)}</span>
                </div>
                
                {positionValue !== null && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">שווי כולל של הפוזיציה:</span>
                        <span className="font-semibold text-slate-800">${positionValue.toFixed(2)}</span>
                    </div>
                )}
                
                {riskRewardRatio !== null && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">יחס סיכון/סיכוי:</span>
                        <span className={`font-semibold ${rrColor}`}>1 : {riskRewardRatio.toFixed(2)}</span>
                    </div>
                )}
                
                {portfolioRiskPercent !== null && (
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">אחוז סיכון מהתיק:</span>
                        <span className="font-semibold text-slate-800">{portfolioRiskPercent.toFixed(2)}%</span>
                    </div>
                )}
            </div>
          )}

          <button onClick={resetAll} className="w-full bg-slate-500 hover:bg-slate-600 text-white py-2 px-4 rounded-md font-semibold text-sm shadow-md transition-all">
            אפס מחשבון
          </button>
        </div>
      </div>
    </div>
  );
}