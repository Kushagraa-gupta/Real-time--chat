'use client';

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore, Message, Conversation } from '../store/useChatStore';

const SocketContext = createContext<Socket | null>(null);

export const useSocket = () => useContext(SocketContext);

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const socketRef = useRef<Socket | null>(null);
  const { user, isAuthenticated } = useAuthStore();
  const { 
    addMessage, 
    setUserOnlineStatus, 
    setTyping, 
    removeTyping, 
    addConversation, 
    activeChatId
  } = useChatStore();

  const activeChatIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    userIdRef.current = user?.id || null;
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Connect to server
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to socket server');
      socket.emit('setup', user.id);
    });

    socket.on('message-received', (message: Message) => {
      addMessage(message);

      // If we are currently viewing this conversation, mark it as read
      if (activeChatIdRef.current === message.conversationId) {
        socket.emit('message-seen', {
          conversationId: message.conversationId,
          userId: user.id
        });
      }
    });

    socket.on('typing', ({ conversationId, userId, username }) => {
      setTyping(conversationId, userId, username);
    });

    socket.on('stop-typing', ({ conversationId, userId }) => {
      removeTyping(conversationId, userId);
    });

    socket.on('user-status-change', ({ userId, status }) => {
      setUserOnlineStatus(userId, status);
    });

    socket.on('conversation-created', (conversation: Conversation) => {
      // Map participants status to store
      conversation.participants.forEach(p => {
        if (p.id !== userIdRef.current) {
          setUserOnlineStatus(p.id, p.status || 'offline');
        }
      });
      addConversation(conversation);
    });

    socket.on('messages-marked-seen', ({ conversationId, userId }) => {
      // If we are currently viewing this conversation, update the messages isSeen state
      if (activeChatIdRef.current === conversationId && userId !== userIdRef.current) {
        // Mark all messages sent by current user as seen
        useChatStore.setState((state) => ({
          messages: state.messages.map((m) =>
            m.senderId === userIdRef.current ? { ...m, isSeen: true } : m
          ),
        }));
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, user, addMessage, addConversation, setUserOnlineStatus, setTyping, removeTyping]);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
};
