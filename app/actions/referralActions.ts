// app/actions/referralActions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type ReferralFormData = {
    referrer_name: string;
    recommended_name: string;
    recommended_phone: string;
    recommended_email: string;
    notes: string;
}

export async function submitReferral(formData: ReferralFormData) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
        return { error: 'משתמש לא מחובר.' };
    }
    const { error } = await supabase.from('referrals').insert({
        referrer_user_id: user.id,
        referrer_name: formData.referrer_name,
        referrer_email: user.email,
        recommended_name: formData.recommended_name,
        recommended_phone: formData.recommended_phone,
        recommended_email: formData.recommended_email,
        notes: formData.notes,
    });
    if (error) {
        console.error('Error submitting referral:', error);
        return { error: 'שגיאה בשליחת הטופס.' };
    }
    revalidatePath('/admin-users/dashboard/referrals');
    return { success: true };
}

export async function deleteReferral(referralId: number) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'אין הרשאה.' };
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
        return { error: 'אין הרשאה לבצע פעולה זו.' };
    }
    const { error } = await supabase.from('referrals').delete().match({ id: referralId });
    if (error) {
        console.error('Error deleting referral:', error);
        return { error: 'שגיאה במחיקת ההמלצה.' };
    }
    revalidatePath('/admin-users/dashboard/referrals');
    return { success: true };
}

// --- פונקציה חדשה: עדכון סטטוס המלצה ---
export async function updateReferralStatus(
    referralId: number, 
    newStatus: { contacted?: boolean; is_completed?: boolean }
) {
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'אין הרשאה.' };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
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