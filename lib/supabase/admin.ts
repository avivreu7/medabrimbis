// lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';

// ⚠️ להשתמש רק בצד השרת (Server Actions / Route Handlers). לא ב-Client!
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // חייב להיות מוגדר ב-.env (Server only)

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
    global: { fetch },
  });
}
