'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProtectedRoute ({ children, }: { children: React.ReactNode;}) 
{
  const router = useRouter();
  useEffect(() => { const token = localStorage.getItem('accessToken');
    if (!token) 
    {
      router.replace('/login');
    }
  }, [router]);
  const token =  localStorage.getItem('accessToken');
  if (!token) 
    return null;
  return <>{children}</>;
} 