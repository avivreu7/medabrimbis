'use server';

// 1. Import the new server client helper
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Zod schema for validation (no changes needed here)
const postSchema = z.object({
  title: z.string().min(1, 'כותרת היא שדה חובה'),
  content: z.string().optional(),
  embedUrl: z.string().url('יש להזין קישור תקין').optional().or(z.literal('')),
  linkText: z.string().optional(),
});

// 2. Define a specific type for the form state to replace 'any'
type FormState = {
    success?: string;
    error?: {
        _form?: string[];
        title?: string[];
        content?: string[];
        embedUrl?: string[];
        linkText?: string[];
    };
};


export async function createBoardPost(previousState: FormState, formData: FormData): Promise<FormState> {
  // 3. Use the new Supabase client
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: { _form: ['אינך מחובר'] } };
  }

  const validatedFields = postSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
    embedUrl: formData.get('embedUrl'),
    linkText: formData.get('linkText'),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }
  
  const { title, content, embedUrl, linkText } = validatedFields.data;

  const { error } = await supabase.from('community_board_posts').insert({
    user_id: user.id, // Using the correct user_id column
    title,
    content: content || null,
    embed_url: embedUrl || null,
    link_text: linkText || null,
  });

  if (error) {
    return { error: { _form: [error.message] } };
  }

  revalidatePath('/admin-users/dashboard/board');
  return { success: 'ההודעה נוספה בהצלחה' };
}

export async function deleteBoardPost(postId: number) {
  // 4. Use the new Supabase client in the delete function as well
  const supabase = createClient();
  const { error } = await supabase.from('community_board_posts').delete().eq('id', postId);

  if (error) {
    return { error: 'Failed to delete post.' };
  }
  revalidatePath('/admin-users/dashboard/board');
}