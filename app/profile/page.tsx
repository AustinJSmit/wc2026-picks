export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import ProfileForm from './profile-form';

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Your profile</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Update your info — demographic data helps us analyze predictions across the group.
        </p>
      </div>
      <ProfileForm user={user} />
    </div>
  );
}
