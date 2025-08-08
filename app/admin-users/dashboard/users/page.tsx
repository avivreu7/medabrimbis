// התיקון: מייבאים את קליינט השרת
import { createClient } from '@/lib/supabase/server'; 
import type { Database } from '@/lib/database.types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UserActions } from '@/app/admin-users/dashboard/users/user-actions';

// This is a type alias for clarity
type Profile = Database['public']['Tables']['profiles']['Row'];

async function getAllUsers(): Promise<Profile[]> {
  // התיקון: יוצרים את קליינט השרת החדש
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  return data;
}

export default async function ManageUsersPage() {
  const users = await getAllUsers();

  return (
    <div
      dir="rtl"
      className="min-h-screen p-4 sm:p-6 lg:p-8 bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/images/background.jpg')" }}
    >
      <div className="max-w-screen-xl mx-auto">
        
        <div className="flex justify-center mb-8">
            <div className="bg-blue-600 text-white py-4 px-8 rounded-xl shadow-lg w-auto inline-block">
                <h1 className="text-3xl font-bold">ניהול משתמשים</h1>
            </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl shadow-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[50px] text-right text-slate-600">#</TableHead>
                <TableHead className="text-right text-slate-600">אימייל</TableHead>
                <TableHead className="text-right text-slate-600">סטטוס</TableHead>
                <TableHead className="text-right text-slate-600">תאריך הרשמה</TableHead>
                <TableHead className="text-right text-slate-600">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user, index) => (
                <TableRow key={user.id} className="border-slate-200/60 hover:bg-slate-50/20">
                  <TableCell className="font-medium text-slate-800">{index + 1}</TableCell>
                  <TableCell className="font-medium text-slate-800">{user.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.status === 'approved'
                          ? 'default'
                          : user.status === 'pending'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {user.status === 'approved' ? 'מאושר' : user.status === 'pending' ? 'ממתין לאישור' : 'חסום'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-700">
                    {new Date(user.created_at!).toLocaleDateString('he-IL')}
                  </TableCell>
                  <TableCell>
                    <UserActions user={user} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}