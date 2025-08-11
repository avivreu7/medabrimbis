'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

const PRICE_CACHE_TABLE = 'daily_portfolio_updates';

// לא מפיל את הפעולה אם רענון נכשל בסביבת dev
async function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch (e) {
    console.error('revalidatePath failed for:', path, e);
  }
}

export async function updateAllPrices() {
  // אין שימוש ב-cookies() כלל
  const supabase = createAdminClient();

  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return { error: 'מפתח ה-API אינו מוגדר.' };

  try {
    // מושכים סימבולים פתוחים משתי הטבלאות
    const { data: communityDeals, error: dealsErr } = await supabase
      .from('community_deals')
      .select('symbol')
      .eq('is_closed', false);
    if (dealsErr) throw dealsErr;

    const { data: portfolioTrades, error: tradesErr } = await supabase
      .from('portfolio_trades')
      .select('symbol')
      .eq('is_closed', false);
    if (tradesErr) throw tradesErr;

    const allSymbols = [
      ...(communityDeals ?? []).map(d => d.symbol),
      ...(portfolioTrades ?? []).map(d => d.symbol),
    ];
    const uniqueSymbols = [...new Set(allSymbols)];

    if (uniqueSymbols.length === 0) {
      await Promise.allSettled([
        safeRevalidate('/admin-users/dashboard/deals'),
        safeRevalidate('/dashboard/personal-portfolio'),
        safeRevalidate('/dashboard/community-portfolio'),
      ]);
      return { success: 'לא נמצאו עסקאות פתוחות לעדכון.' };
    }

    // קריאה ל-FMP ללא קאש
    const symbolsString = uniqueSymbols.join(',');
    const apiUrl = `https://financialmodelingprep.com/api/v3/quote/${symbolsString}?apikey=${apiKey}`;
    const apiResponse = await fetch(apiUrl, { cache: 'no-store' });
    if (!apiResponse.ok) throw new Error(`FMP API Error: ${apiResponse.statusText}`);

    const priceData: { symbol: string; price: number }[] = await apiResponse.json();
    if (!priceData?.length) {
      return { success: 'לא התקבל מידע מה-API.' };
    }

    // upsert לטבלת הקאש
    const rows = priceData.map(item => ({
      symbol: item.symbol,
      current_price: item.price,
      last_updated: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabase
      .from(PRICE_CACHE_TABLE)
      .upsert(rows, { onConflict: 'symbol' });
    if (upsertError) throw upsertError;

    await Promise.allSettled([
      safeRevalidate('/admin-users/dashboard/deals'),
      safeRevalidate('/dashboard/personal-portfolio'),
      safeRevalidate('/dashboard/community-portfolio'),
    ]);

    return { success: `עדכון הושלם בהצלחה עבור ${rows.length} מניות.` };
  } catch (err) {
    if (err instanceof Error) return { error: err.message };
    return { error: 'אירעה שגיאה בלתי צפויה.' };
  }
}
