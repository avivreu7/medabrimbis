'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const PRICE_CACHE_TABLE = 'daily_portfolio_updates';

export async function updateAllPrices() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'פעולה נכשלה: לא זוהה משתמש מחובר.' };
  }

  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return { error: 'מפתח ה-API אינו מוגדר.' };
  }

  try {
    const { data: communityDeals } = await supabase
      .from('community_deals')
      .select('symbol')
      .eq('is_closed', false);

    const { data: portfolioTrades } = await supabase
      .from('portfolio_trades')
      .select('symbol')
      .eq('is_closed', false);

    const allSymbols = [
      ...(communityDeals || []).map((d: { symbol: string }) => d.symbol),
      ...(portfolioTrades || []).map((d: { symbol: string }) => d.symbol)
    ];

    const uniqueSymbols = [...new Set(allSymbols)];

    if (uniqueSymbols.length === 0) {
      return { success: 'לא נמצאו עסקאות פתוחות לעדכון.' };
    }

    const symbolsString = uniqueSymbols.join(',');
    const apiUrl = `https://financialmodelingprep.com/api/v3/quote/${symbolsString}?apikey=${apiKey}`;
    const apiResponse = await fetch(apiUrl);
    
    if (!apiResponse.ok) throw new Error(`FMP API Error: ${apiResponse.statusText}`);

    const priceData: { symbol: string; price: number }[] = await apiResponse.json();

    if (!priceData || priceData.length === 0) return { success: 'לא התקבל מידע מה-API.' };

    const dataToUpsert = priceData.map(item => ({
      symbol: item.symbol,
      current_price: item.price,
      last_updated: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabase
      .from(PRICE_CACHE_TABLE)
      .upsert(dataToUpsert, { onConflict: 'symbol' });

    if (upsertError) throw upsertError;

    revalidatePath('/admin-users/dashboard/deals');
    revalidatePath('/dashboard/personal-portfolio');
    revalidatePath('/dashboard/community-portfolio');
    
    return { success: `עדכון הושלם בהצלחה עבור ${dataToUpsert.length} מניות.` };

  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: 'אירעה שגיאה בלתי צפויה.' };
  }
}