'use client';

import { Button } from '@/components/ui/button';
import { updateUserStatus, deleteUser } from '@/app/actions/userManagementActions';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: 'admin' | 'member' | null;
  status: 'pending' | 'approved' | 'suspended' | null;
  created_at: string | null;
};

export function UserActions({ user }: { user: Profile }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleApprove = () => {
    startTransition(async () => {
      await updateUserStatus(user.id, 'approved');
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (confirm(`האם אתה בטוח שברצונך למחוק את המשתמש ${user.email}?`)) {
      startTransition(async () => {
        await deleteUser(user.id);
        router.refresh();
      });
    }
  };

  const handleViewPortfolio = () => {
    // מעביר לדף התיק האישי הקיים עם פרמטר של ID המשתמש
    router.push(`/dashboard/personal-portfolio?userId=${user.id}`);
  };

  return (
    <div className="flex gap-2">
      {user.status === 'pending' && (
        <Button size="sm" onClick={handleApprove} disabled={isPending}>
          {isPending ? 'מאשר...' : 'אשר משתמש'}
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={handleViewPortfolio}>
        צפה בתיק
      </Button>
      <Button size="sm" onClick={handleDelete} disabled={isPending} variant="destructive">
        {isPending ? 'מוחק...' : 'מחק'}
      </Button>
    </div>
  );
}