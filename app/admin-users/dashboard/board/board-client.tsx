// app/admin-users/dashboard/board/board-client.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

// הגדרת הטיפוס המעודכן עם השדה החדש
export interface PostWithProfile {
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
}

export function BoardClient({ initialPosts }: { initialPosts: PostWithProfile[] }) {
  const supabase = createClient();
  const router = useRouter();

  const [posts, setPosts] = useState(initialPosts);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  // --- תוספת: State חדש לטקסט הקישור ---
  const [linkText, setLinkText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        setError('יש להתחבר כדי לפרסם פוסט.');
        setIsSubmitting(false);
        return;
    }

    const { data: newPost, error: insertError } = await supabase
      .from('community_board_posts')
      .insert({
        title,
        content,
        embed_url: embedUrl || null,
        // --- תוספת: שמירת טקסט הקישור ---
        link_text: linkText || null, 
        user_id: user.id,
      })
      .select('*, profiles(full_name)')
      .single();
    
    setIsSubmitting(false);

    if (insertError) {
      console.error("Error inserting post:", insertError);
      setError(insertError.message);
    } else if (newPost) {
      setPosts(currentPosts => [newPost as PostWithProfile, ...currentPosts]);
      setTitle('');
      setContent('');
      setEmbedUrl('');
      setLinkText(''); // איפוס השדה החדש
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!window.confirm("האם אתה בטוח שברצונך למחוק את ההודעה?")) {
        return;
    }

    const { error: deleteError } = await supabase
        .from('community_board_posts')
        .delete()
        .match({ id: postId });

    if (deleteError) {
        console.error("Error deleting post:", deleteError);
        setError(deleteError.message);
    } else {
        setPosts(currentPosts => currentPosts.filter(post => post.id !== postId));
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-1/3 w-full lg:sticky top-8 self-start">
            <div className="bg-white p-6 rounded-lg shadow-md border">
                <h2 className="text-2xl font-bold mb-4 text-slate-800">פרסם הודעה חדשה</h2>
                <form onSubmit={handlePostSubmit} className="space-y-4">
                    <input 
                        type="text" 
                        placeholder="כותרת" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="w-full p-2 border rounded"
                    />
                    <textarea 
                        ref={textareaRef}
                        placeholder="תוכן ההודעה..." 
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={3}
                        className="w-full p-2 border rounded resize-none overflow-hidden"
                    />
                    <input 
                        type="url" 
                        placeholder="הדבק קישור (אופציונלי)" 
                        value={embedUrl}
                        onChange={(e) => setEmbedUrl(e.target.value)}
                        className="w-full p-2 border rounded"
                    />
                    {/* --- תוספת: שדה חדש לטקסט הקישור (מופיע רק אם יש קישור) --- */}
                    {embedUrl && (
                        <input 
                            type="text" 
                            placeholder="טקסט לתצוגה (לדוגמה: דרייב עסקאות)" 
                            value={linkText}
                            onChange={(e) => setLinkText(e.target.value)}
                            className="w-full p-2 border rounded"
                        />
                    )}
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-400"
                    >
                        {isSubmitting ? 'מפרסם...' : 'פרסם'}
                    </button>
                    {error && <p className="text-red-500 mt-2">{error}</p>}
                </form>
            </div>
        </aside>

        <main className="lg:w-2/3 w-full">
            <div className="space-y-6">
                {posts.length === 0 && (
                    <div className="bg-white p-6 rounded-lg shadow-md border text-center">
                        <p className="text-slate-500">אין עדיין הודעות בלוח.</p>
                    </div>
                )}
                {posts.map((post) => (
                    <div key={post.id} className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-xl text-slate-900">{post.title}</h3>
                                <p className="text-sm text-slate-500 mb-2">
                                    פורסם על ידי {post.profiles?.full_name || 'מנהל'} בתאריך {new Date(post.created_at!).toLocaleDateString('he-IL')}
                                </p>
                            </div>
                            <button 
                                onClick={() => handleDeletePost(post.id)}
                                className="text-red-500 hover:text-red-700 font-semibold text-sm flex-shrink-0 ml-4"
                            >
                                מחק
                            </button>
                        </div>
                        {post.content && <p className="text-slate-600 mt-2 whitespace-pre-wrap">{post.content}</p>}
                        
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
            </div>
        </main>
    </div>
  );
}