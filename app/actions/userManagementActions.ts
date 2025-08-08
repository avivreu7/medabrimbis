'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

type UserStatus = 'pending' | 'approved' | 'suspended';

// Initialize the Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Updates a user's status in the profiles table.
 * @param userId The ID of the user to update.
 * @param status The new status to set.
 */
export async function updateUserStatus(userId: string, status: UserStatus) {
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ status })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user status:', error);
    throw new Error('Failed to update user status.');
  }

  revalidatePath('/admin-users/dashboard/users');
}

/**
 * Deletes a user from the auth system and their profile.
 * @param userId The ID of the user to delete.
 */
export async function deleteUser(userId: string) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    console.error('Error deleting user:', error);
    throw new Error('Failed to delete user.');
  }

  revalidatePath('/admin-users/dashboard/users');
}