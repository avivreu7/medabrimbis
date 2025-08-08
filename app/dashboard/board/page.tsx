'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client'; 
import type { Database } from '@/lib/database.types';

// עדכון הטיפוס כדי לכלול את השדה החדש
type Post = {
  id: number;
  title: string;
  content: string | null;
  embed_url: string | null;
  link_text: string | null; // השדה החדש שהוספת
  user_id: string;
  created_at: string | null;
  profiles: {
    full_name: string | null;
  } | null;
};

export default function MemberBoardPage() {
  const supabase = createClient();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setError(null);
    const { data, error } = await supabase
      .from('community_board_posts')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching posts:", error);
      setError(error.message);
    } else {
      setPosts(data as Post[]);
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchPosts();

    const channel = supabase.channel('community_board_posts_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_board_posts' },
        (payload) => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPosts, supabase]);

  return (
    <div
      dir="rtl"
      className="min-h-screen p-4 sm:p-6 lg:p-8 bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/images/background.jpg')" }}
    >
      <div className="max-w-screen-md mx-auto">
        <div className="flex justify-center mb-8">
          <div className="bg-blue-600 text-white py-4 px-8 rounded-xl shadow-lg w-auto inline-block">
            <h1 className="text-3xl font-bold">לוח המודעות של הקהילה</h1>
          </div>
        </div>
        
        {isLoading && posts.length === 0 && (
            <div className="text-center py-12 bg-white/50 rounded-xl">
                <p className="text-slate-500">טוען הודעות...</p>
            </div>
        )}

        {error && (
            <div className="text-center py-12 bg-red-100/50 rounded-xl">
                <p className="text-red-600">שגיאה בטעינת הנתונים: {error}</p>
            </div>
        )}

        <main className="space-y-6">
          {!isLoading && posts.map(post => (
            <div key={post.id} className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-slate-900">{post.title}</h3>
              <p className="text-xs text-slate-500 mb-4">
                פורסם על ידי {post.profiles?.full_name || 'מנהל'} בתאריך {new Date(post.created_at!).toLocaleDateString('he-IL')}
              </p>
              
              {post.content && (
                <p className="text-slate-700 whitespace-pre-wrap">{post.content}</p>
              )}

              {/* --- שינוי: לוגיקת תצוגה חכמה לקישור --- */}
              {post.embed_url && (
                <div className="mt-4">
                    <a 
                        href={post.embed_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-semibold break-all"
                    >
                        {/* אם יש טקסט מותאם, הצג אותו. אחרת, הצג את הכתובת המלאה */}
                        {post.link_text || post.embed_url}
                    </a>
                </div>
              )}
            </div>
          ))}
          {!isLoading && !error && posts.length === 0 && (
            <div className="text-center py-12 bg-white/50 rounded-xl">
              <p className="text-slate-500">עדיין אין הודעות בלוח.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}