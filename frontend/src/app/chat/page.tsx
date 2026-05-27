'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/useAuthStore';
import { useChatStore } from '../../store/useChatStore';
import Sidebar from '../../components/chat/Sidebar';
import ChatWindow from '../../components/chat/ChatWindow';

export default function ChatPage() {
  const router = useRouter();
  const { checkAuth, isAuthenticated, isLoading } = useAuthStore();
  const { activeChatId } = useChatStore();

  useEffect(() => {
    const checkUser = async () => {
      const authorized = await checkAuth();
      if (!authorized) {
        router.push('/login');
      }
    };
    checkUser();
  }, [checkAuth, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-chat-accent border-t-transparent"></div>
          <p className="text-sm text-gray-400 font-medium">Restoring session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // router redirecting
  }

  return (
    <div className="flex h-screen w-screen bg-chat-bg overflow-hidden relative">
      {/* 
        Responsive layout pattern:
        - If activeChatId is set on mobile, hide the sidebar, and show ChatWindow.
        - If activeChatId is null, show Sidebar, and hide ChatWindow.
        - On desktop (md), both are displayed side by side.
      */}
      <div className="flex w-full h-full">
        <div className={`${activeChatId ? 'hidden md:flex' : 'flex'} w-full md:w-80 h-full`}>
          <Sidebar />
        </div>
        <div className={`${activeChatId ? 'flex' : 'hidden md:flex'} flex-1 h-full`}>
          <ChatWindow />
        </div>
      </div>
    </div>
  );
}
