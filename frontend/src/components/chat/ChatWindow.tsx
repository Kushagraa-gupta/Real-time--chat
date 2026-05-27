'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useChatStore, Message, Conversation } from '../../store/useChatStore';
import { useSocket } from '../../socket/SocketProvider';
import { api } from '../../services/api';
import { formatTime, formatDate, getFileExtension, getFileSizeString } from '../../lib/utils';
import toast from 'react-hot-toast';
import { 
  Send, 
  Smile, 
  Paperclip, 
  Phone, 
  Video, 
  MoreVertical, 
  Check, 
  CheckCheck, 
  ArrowLeft, 
  Image, 
  FileText,
  Download,
  X,
  MessageSquare
} from 'lucide-react';

export default function ChatWindow() {
  const socket = useSocket();
  const { user } = useAuthStore();
  const {
    activeChatId,
    setActiveChatId,
    conversations,
    messages,
    setMessages,
    addMessage,
    prependMessages,
    messagesCursor,
    onlineUsers,
    typingUsers,
    clearUnread,
    toggleSidebar
  } = useChatStore();

  const [inputContent, setInputContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentChat = conversations.find((c) => c.id === activeChatId);

  // Fetch messages when activeChatId changes
  useEffect(() => {
    if (!activeChatId) return;

    const fetchMessages = async () => {
      try {
        setIsLoadingMessages(true);
        const response = await api.get(`/messages/${activeChatId}`);
        setMessages(response.data.messages, response.data.nextCursor);
        clearUnread(activeChatId);

        // Notify socket that we opened the chat (seen indicator)
        if (socket && user) {
          socket.emit('join-chat', activeChatId);
          socket.emit('message-seen', { conversationId: activeChatId, userId: user.id });
        }

        // Scroll to bottom
        setTimeout(scrollToBottom, 50);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load messages');
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchMessages();

    return () => {
      if (socket && activeChatId) {
        socket.emit('leave-chat', activeChatId);
      }
    };
  }, [activeChatId, setMessages, clearUnread, socket, user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to bottom on new incoming messages
  useEffect(() => {
    if (messages.length > 0) {
      // Check if scroll is near bottom, if so scroll to bottom
      scrollToBottom();
    }
  }, [messages]);

  // Load more paginated messages (infinite scroll support)
  const handleLoadMore = async () => {
    if (!messagesCursor || isLoadingMore) return;

    try {
      setIsLoadingMore(true);
      const response = await api.get(`/messages/${activeChatId}?cursor=${messagesCursor}`);
      prependMessages(response.data.messages, response.data.nextCursor);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load older messages');
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Emit typing indicators with debounced timeouts
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputContent(e.target.value);

    if (!socket || !user || !activeChatId) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', {
        conversationId: activeChatId,
        userId: user.id,
        username: user.username,
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('stop-typing', {
        conversationId: activeChatId,
        userId: user.id,
      });
    }, 2000);
  };

  // Upload attachment file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      return toast.error('Files must be smaller than 20MB');
    }

    setUploadingFile(file);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', file);

      setUploadProgress(30);
      const response = await api.post('/users/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadProgress(80);

      const fileUrl = response.data.fileUrl;
      const mimetype = response.data.mimetype;
      let fileType: 'image' | 'document' | 'audio' | 'video' = 'document';

      if (mimetype.startsWith('image/')) fileType = 'image';
      else if (mimetype.startsWith('audio/')) fileType = 'audio';
      else if (mimetype.startsWith('video/')) fileType = 'video';

      setUploadProgress(100);

      // Send the file as a message
      const msgResponse = await api.post('/messages', {
        conversationId: activeChatId,
        content: `Sent a file: ${file.name}`,
        fileUrl,
        fileType,
      });

      addMessage(msgResponse.data.message);
      toast.success('File shared successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to share file');
    } finally {
      setUploadingFile(null);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Send standard text message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputContent.trim() || !activeChatId) return;

    const content = inputContent.trim();
    setInputContent('');
    setIsEmojiOpen(false);

    // Stop typing indicators
    if (socket && user) {
      setIsTyping(false);
      socket.emit('stop-typing', {
        conversationId: activeChatId,
        userId: user.id,
      });
    }

    // Optimistic UI updates
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      conversationId: activeChatId,
      senderId: user!.id,
      content,
      createdAt: new Date().toISOString(),
      isSeen: false,
      sender: user!,
    };

    addMessage(optimisticMessage);
    setTimeout(scrollToBottom, 20);

    try {
      const response = await api.post('/messages', {
        conversationId: activeChatId,
        content,
      });

      // Replace the optimistic message with the database message
      useChatStore.setState((state) => ({
        messages: state.messages.map((m) =>
          m.id === tempId ? response.data.message : m
        ),
      }));
    } catch (error) {
      console.error(error);
      toast.error('Message failed to send');
      // Remove the optimistic message on error
      useChatStore.setState((state) => ({
        messages: state.messages.filter((m) => m.id !== tempId),
      }));
    }
  };

  const getChatDetails = () => {
    if (!currentChat || !user) return null;

    if (currentChat.isGroup) {
      const participantsCount = currentChat.participants.length;
      return {
        name: currentChat.name || 'Group Chat',
        status: `${participantsCount} participants`,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentChat.name || 'G')}`,
      };
    }

    const partner = currentChat.participants.find((p) => p.id !== user.id);
    const partnerStatus = partner ? (onlineUsers[partner.id] || partner.status) : 'offline';

    let statusText = 'Offline';
    if (partnerStatus === 'online') {
      statusText = 'Online';
    } else if (partner?.lastSeen) {
      statusText = `Last seen ${formatDate(partner.lastSeen)} at ${formatTime(partner.lastSeen)}`;
    }

    return {
      name: partner?.username || 'User',
      status: statusText,
      avatarUrl: partner?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(partner?.username || 'user')}`,
    };
  };

  const triggerCallPlaceholder = (type: 'voice' | 'video') => {
    toast(`📞 Initializing ${type} call integration...`, {
      icon: '🚀',
    });
  };

  const chatDetails = getChatDetails();

  const handleEmojiClick = (emoji: string) => {
    setInputContent((prev) => prev + emoji);
  };

  // Custom inline emojis
  const emojis = ['😀', '😂', '🔥', '👍', '🙏', '❤️', '🎉', '💡', '🌟', '🚀', '💯', '👏', '👀', '✨', '😍', '🤔'];

  if (!activeChatId) {
    return (
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-chat-window text-center p-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-chat-accent/10 text-chat-accent shadow-inner mb-6">
          <MessageSquare className="h-10 w-10 animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-wide">Welcome to Chatify</h2>
        <p className="mt-2 text-sm text-gray-400 max-w-sm">
          Select an active conversation from the sidebar or search for users to begin real-time messaging.
        </p>
      </div>
    );
  }

  // Filter out current user typing state
  const currentChatTypers = typingUsers[activeChatId] || [];
  const otherTypers = currentChatTypers.filter((t) => (t as any).userId !== user?.id);

  return (
    <div className="flex flex-1 flex-col h-full bg-chat-window relative overflow-hidden">
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-white/5 bg-chat-header/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveChatId(null)}
            className="md:hidden rounded-lg p-1 text-gray-400 hover:bg-white/5 hover:text-white transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <img
            src={chatDetails?.avatarUrl}
            alt={chatDetails?.name}
            className="h-10 w-10 rounded-full border border-white/5 bg-gray-800"
          />
          <div className="overflow-hidden">
            <h3 className="text-sm font-semibold text-white truncate">{chatDetails?.name}</h3>
            {otherTypers.length > 0 ? (
              <p className="text-[11px] text-emerald-400 font-medium animate-pulse">
                {otherTypers.map((t) => t.username).join(', ')} is typing...
              </p>
            ) : (
              <p className="text-[11px] text-gray-400 truncate">{chatDetails?.status}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => triggerCallPlaceholder('voice')}
            className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white transition"
          >
            <Phone className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={() => triggerCallPlaceholder('video')}
            className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white transition"
          >
            <Video className="h-4.5 w-4.5" />
          </button>
          <button className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white transition">
            <MoreVertical className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
        {/* Load more button */}
        {messagesCursor && (
          <div className="flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="rounded-full bg-white/5 px-4 py-1.5 text-xs text-gray-300 transition hover:bg-white/10 active:scale-98 disabled:opacity-50"
            >
              {isLoadingMore ? 'Loading older messages...' : 'Load older messages'}
            </button>
          </div>
        )}

        {isLoadingMessages ? (
          <div className="space-y-4">
            {/* Skeletons */}
            {[1, 2, 3].map((n) => (
              <div key={n} className={`flex items-start gap-3 ${n % 2 === 0 ? 'flex-row-reverse' : ''}`}>
                <div className="h-8 w-8 rounded-full bg-white/5 animate-pulse" />
                <div className="space-y-1 max-w-[70%]">
                  <div className="h-4 w-24 bg-white/5 animate-pulse rounded-md" />
                  <div className="h-10 w-48 bg-white/5 animate-pulse rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <MessageSquare className="h-10 w-10 text-gray-600 mb-2" />
            <p className="text-sm text-gray-500">No messages here yet. Say hello!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg, index) => {
              const isMe = msg.senderId === user?.id;
              
              // Grouping by Date separator
              const showDateSeparator =
                index === 0 ||
                formatDate(messages[index - 1].createdAt) !== formatDate(msg.createdAt);

              // Check if consecutive messages are from the same sender to group them visually (like Discord)
              const showSenderHeader =
                index === 0 ||
                messages[index - 1].senderId !== msg.senderId ||
                showDateSeparator;

              return (
                <div key={msg.id} className="w-full">
                  {showDateSeparator && (
                    <div className="flex items-center justify-center my-6">
                      <span className="rounded-full border border-white/5 bg-gray-900/60 px-3 py-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider shadow-sm">
                        {formatDate(msg.createdAt)}
                      </span>
                    </div>
                  )}

                  <div
                    className={`flex items-start gap-3 px-2 py-1 transition hover:bg-white/[0.01] rounded-lg ${
                      showSenderHeader ? 'mt-2.5' : 'mt-0.5'
                    }`}
                  >
                    {showSenderHeader ? (
                      <img
                        src={msg.sender.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                        alt={msg.sender.username}
                        className="h-9 w-9 rounded-full border border-white/5 bg-gray-800 flex-shrink-0"
                      />
                    ) : (
                      // Display timestamp on hover for grouped messages (like Discord)
                      <div className="w-9 text-right text-[9px] text-gray-500 select-none group opacity-0 hover:opacity-100 pr-2 pt-0.5">
                        {formatTime(msg.createdAt).split(' ')[0]}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {showSenderHeader && (
                        <div className="flex items-baseline gap-2">
                          <span className={`text-xs font-bold ${isMe ? 'text-chat-accent' : 'text-gray-100'}`}>
                            {msg.sender.username}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                      )}

                      <div className="text-sm text-gray-200 mt-0.5 break-words">
                        {/* If file message */}
                        {msg.fileUrl && (
                          <div className="mt-1 mb-2 rounded-lg border border-white/5 bg-white/[0.02] p-2 max-w-sm">
                            {msg.fileType === 'image' ? (
                              <div className="relative group overflow-hidden rounded-md border border-white/10 bg-black/25">
                                <img
                                  src={msg.fileUrl}
                                  alt="Attachment"
                                  className="max-h-60 w-full object-contain transition duration-300 group-hover:scale-101"
                                />
                                <a
                                  href={msg.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 group-hover:opacity-100 transition"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-8 w-8 text-chat-accent" />
                                  <div className="overflow-hidden">
                                    <p className="text-xs font-semibold text-white truncate max-w-[200px]">
                                      {msg.content.replace('Sent a file: ', '')}
                                    </p>
                                    <p className="text-[10px] text-gray-400">
                                      {getFileExtension(msg.content)} Document
                                    </p>
                                  </div>
                                </div>
                                <a
                                  href={msg.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-lg bg-white/5 p-2 text-gray-400 hover:bg-white/10 hover:text-white transition"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                        {!msg.fileUrl && <p>{msg.content}</p>}
                      </div>
                    </div>

                    {/* Message delivery receipts (only show for my messages) */}
                    {isMe && (
                      <div className="text-gray-500 self-end pl-1 flex-shrink-0">
                        {msg.isSeen ? (
                          <CheckCheck className="h-4.5 w-4.5 text-emerald-400" />
                        ) : (
                          <Check className="h-4.5 w-4.5" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating progress indicator */}
      {uploadingFile && (
        <div className="absolute bottom-20 left-4 right-4 z-20 rounded-lg border border-white/10 bg-chat-header p-3 shadow-lg flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse flex items-center justify-center rounded bg-chat-accent/15 text-chat-accent">
            <Paperclip className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
              <p className="text-xs font-medium text-white truncate">Sharing: {uploadingFile.name}</p>
              <span className="text-[10px] text-gray-400 font-bold">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-chat-accent h-1.5 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-chat-header/80 backdrop-blur-md flex items-center gap-2 relative">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Share File"
          className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white transition flex-shrink-0"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Emoji Selector Panel */}
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsEmojiOpen(!isEmojiOpen)}
            className={`rounded-lg p-2 transition ${
              isEmojiOpen ? 'text-chat-accent bg-chat-accent/10' : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Smile className="h-5 w-5" />
          </button>
          
          {isEmojiOpen && (
            <div className="absolute bottom-12 left-0 z-30 rounded-xl border border-white/10 bg-chat-header p-3 shadow-xl w-60">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Emojis</p>
              <div className="grid grid-cols-6 gap-2">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleEmojiClick(emoji)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-white/5 transition active:scale-90"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <input
          type="text"
          value={inputContent}
          onChange={handleInputChange}
          placeholder="Type a message..."
          className="flex-1 rounded-lg border border-white/5 bg-white/[0.03] py-2 px-4 text-sm text-white placeholder-gray-500 outline-hidden transition focus:border-chat-accent focus:bg-white/[0.05]"
        />

        <button
          type="submit"
          disabled={!inputContent.trim()}
          className="rounded-lg bg-chat-accent p-2 text-white shadow-lg shadow-chat-accent/15 transition hover:bg-chat-accent-hover active:scale-95 disabled:opacity-50 flex-shrink-0"
        >
          <Send className="h-4.5 w-4.5" />
        </button>
      </form>
    </div>
  );
}
