'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/useAuthStore';

export default function RootPage() {
  const router = useRouter();
  const { checkAuth, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    const verifyUserSession = async () => {
      const authorized = await checkAuth();
      if (authorized) {
        router.push('/chat');
      } else {
        router.push('/login');
      }
    };
    verifyUserSession();
  }, [checkAuth, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-gray-950">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-chat-accent border-t-transparent"></div>
        <p className="text-sm text-gray-400 animate-pulse font-medium">Checking session...</p>
      </div>
    </div>
  );
}
