// app/actions/referralActions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type ReferralFormData = {
  // נשלח מהקליינט אבל נתעלם לצורך אמינות
  referrer_name?: string;
  recommended_name: string;
  recommended_phone?: string;
  recommended_email: string;
  notes?: string;
};

function buildDisplayName(p: {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}) {
  const fromNames = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
  const fromEmail = p.email?.split('@')[0] || '';
  return (p.full_name?.trim() || fromNames || fromEmail).trim();
}

export async function submitReferral(formData: ReferralFormData) {
  const supabase = createClient();

  // 1) אימות
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'משתמש לא מחובר.' };
  }

  // 2) פרופיל אמיתי מה־DB (לא סומכים על מה שהקליינט שלח כשם)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, first_name, last_name, email')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('profileError:', profileError);
    return { error: 'לא ניתן לקרוא את פרופיל המשתמש.' };
  }

  const safeReferrerName = buildDisplayName(profile || { email: user.email });

  // 3) הכנסה לטבלת ההמלצות
  const { error: insertError } = await supabase
    .from('referrals')
    .insert({
      referrer_user_id: user.id,                  // שמור מזהה אמיתי
      referrer_name: safeReferrerName,            // טקסט לתצוגה מה־DB
      referrer_email: profile?.email ?? user.email ?? null,
      recommended_name: formData.recommended_name,
      recommended_phone: formData.recommended_phone || null,
      recommended_email: formData.recommended_email,
      notes: formData.notes || null,
    });

  if (insertError) {
    console.error('Error submitting referral:', {
      message: insertError.message,
      details: insertError.details,
      hint: insertError.hint,
      code: insertError.code,
    });
    return { error: 'שגיאה בשליחת הטופס.' };
  }

  revalidatePath('/admin-users/dashboard/referrals');
  return { success: true };
}

export async function deleteReferral(referralId: number) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'אין הרשאה.' };

  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profErr) {
    console.error('profiles read error:', profErr);
    return { error: 'לא ניתן לוודא הרשאות.' };
  }
  if (profile?.role !== 'admin') {
    return { error: 'אין הרשאה לבצע פעולה זו.' };
  }

  const { error } = await supabase
    .from('referrals')
    .delete()
    .eq('id', referralId);

  if (error) {
    console.error('Error deleting referral:', error);
    return { error: 'שגיאה במחיקת ההמלצה.' };
  }

  revalidatePath('/admin-users/dashboard/referrals');
  return { success: true };
}

export async function updateReferralStatus(
  referralId: number,
  newStatus: { contacted?: boolean; is_completed?: boolean }
) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'אין הרשאה.' };

  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profErr) {
    console.error('profiles read error:', profErr);
    return { error: 'לא ניתן לוודא הרשאות.' };
  }
  if (profile?.role !== 'admin') {
    return { error: 'אין הרשאה לבצע פעולה זו.' };
  }

  const { error } = await supabase
    .from('referrals')
    .update(newStatus)
    .eq('id', referralId);

  if (error) {
    console.error('Error updating referral status:', error);
    return { error: 'שגיאה בעדכון סטטוס ההמלצה.' };
  }

  revalidatePath('/admin-users/dashboard/referrals');
  return { success: true };
}
