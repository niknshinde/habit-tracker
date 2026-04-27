'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';
import LoginForm from '@/components/auth/login-form';

export default function Home() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    getSession().then((session) => {
      if (session) {
        setAuthed(true);
        router.replace('/dashboard');
      }
      setChecked(true);
    });
  }, [router]);

  if (!checked) return null;
  if (authed) return null;

  return <LoginForm onSuccess={() => router.replace('/dashboard')} />;
}
