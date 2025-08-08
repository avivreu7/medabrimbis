// app/admin-users/dashboard/board/page.tsx

// התיקון: מייבאים את קליינט השרת החדש
import { createClient } from '@/lib/supabase/server'; 
import type { Database } from '@/lib/database.types';
import { BoardClient, type PostWithProfile } from './board-client'; // שימוש ב-named import

async function getBoardPosts(): Promise<PostWithProfile[]> {
  // התיקון: יוצרים את קליינט השרת החדש
  const supabase = createClient();

  const { data, error } = await supabase
    .from('community_board_posts')
    .select(`
      *,
      profiles ( full_name )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching board posts:', error);
    return [];
  }
  // TypeScript needs assurance that the data matches the new type
  return data as PostWithProfile[];
}

export default async function BoardPage() {
  const posts = await getBoardPosts();

  return (
    <div
      dir="rtl"
      className="min-h-screen p-4 sm:p-6 lg:p-8 bg-cover bg-center bg-fixed"
      // ודא שהנתיב לתמונה נכון
      style={{ backgroundImage: "url('/images/background.jpg')" }}
    >
      <div className="max-w-screen-xl mx-auto">
        <div className="flex justify-center mb-8">
          <div className="bg-blue-600 text-white py-4 px-8 rounded-xl shadow-lg w-auto inline-block">
            <h1 className="text-3xl font-bold">לוח מודעות קהילתי</h1>
          </div>
        </div>
        
        {/* החלק האינטראקטיבי של העמוד (טופס + פוסטים) */}
        <BoardClient initialPosts={posts} />
      </div>
    </div>
  );
}