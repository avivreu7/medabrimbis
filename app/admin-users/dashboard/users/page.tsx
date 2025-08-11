// app/admin-users/dashboard/users/page.tsx
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { UserActions } from '@/app/admin-users/dashboard/users/user-actions'

type Profile = Database['public']['Tables']['profiles']['Row'] & {
  first_name?: string | null
  last_name?: string | null
  join_date?: string | null
  initial_balance?: number | null
}

async function getAllUsers(): Promise<Profile[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,status,created_at,first_name,last_name,join_date,initial_balance')
    .order('created_at', { ascending: false })

  if (error) {
    // לוג קריא – תראה את ההודעה המקורית של PostgREST
    console.error('[ Server ] Error fetching users:', { message: error.message, details: error.details, hint: error.hint, code: (error as any).code })
    return []
  }
  return data as Profile[]
}

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('he-IL') : '-'

const formatMoney = (n?: number | null) =>
  typeof n === 'number'
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
    : '-'

export default async function ManageUsersPage() {
  const users = await getAllUsers()

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
                <TableHead className="text-right text-slate-600">שם פרטי</TableHead>
                <TableHead className="text-right text-slate-600">שם משפחה</TableHead>
                <TableHead className="text-right text-slate-600">תאריך הצטרפות</TableHead>
                <TableHead className="text-right text-slate-600">גודל התיק</TableHead>
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

                  <TableCell className="text-slate-800">{user.first_name ?? '-'}</TableCell>
                  <TableCell className="text-slate-800">{user.last_name ?? '-'}</TableCell>
                  <TableCell className="text-slate-700">{formatDate(user.join_date)}</TableCell>
                  <TableCell className="text-slate-800">{formatMoney(user.initial_balance ?? undefined)}</TableCell>

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
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('he-IL') : '-'}
                  </TableCell>

                  <TableCell>
                    <UserActions user={user as any} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
