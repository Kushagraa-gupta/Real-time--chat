'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useChatStore, Conversation } from '../../store/useChatStore';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { LogOut, Settings, Users, Search, MessageSquare, Plus, Menu } from 'lucide-react';
import ProfileSettingsModal from '../profile/ProfileSettingsModal';
import CreateGroupModal from './CreateGroupModal';
import { formatTime, formatDate } from '../../lib/utils';

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const {
    conversations,
    setConversations,
    activeChatId,
    setActiveChatId,
    onlineUsers,
    typingUsers,
    isSidebarOpen,
    toggleSidebar,
    addConversation,
    setUserOnlineStatus,
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  // Fetch recent conversations on load
  useEffect(() => {
    if (!user) return;
    const fetchConversations = async () => {
      try {
        const response = await api.get('/chats');
        setConversations(response.data.conversations);
        
        // Sync online statuses of participants from backend initial payload
        response.data.conversations.forEach((conv: Conversation) => {
          conv.participants.forEach((p) => {
            if (p.id !== user.id) {
              setUserOnlineStatus(p.id, p.status || 'offline');
            }
          });
        });
      } catch (error) {
        console.error(error);
        toast.error('Failed to load conversations');
      }
    };
    fetchConversations();
  }, [user, setConversations, setUserOnlineStatus]);

  // Debounced search for users to start 1-on-1 conversations
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const searchUsers = async () => {
      try {
        setIsSearching(true);
        const response = await api.get(`/users?search=${encodeURIComponent(searchQuery)}`);
        setSearchResults(response.data.users);
      } catch (error) {
        console.error(error);
      } finally {
        setIsSearching(false);
      }
    };

    const delayDebounceFn = setTimeout(searchUsers, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  if (!user) return null;

  const startPrivateChat = async (partnerId: string) => {
    try {
      const response = await api.post('/chats', {
        isGroup: false,
        participantIds: [partnerId],
      });
      
      const newChat = response.data;
      addConversation(newChat);
      setActiveChatId(newChat.id);
      setSearchQuery('');
      setSearchResults([]);
      toggleSidebar(false); // Close sidebar on mobile
    } catch (error: any) {
      toast.error('Failed to start chat');
    }
  };

  const getChatDetails = (chat: Conversation) => {
    if (chat.isGroup) {
      return {
        name: chat.name || 'Group Chat',
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(chat.name || 'G')}`,
        isOnline: false,
      };
    }

    const partner = chat.participants.find((p) => p.id !== user.id);
    const partnerStatus = partner ? (onlineUsers[partner.id] || partner.status) : 'offline';

    return {
      name: partner?.username || 'User',
      avatarUrl: partner?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(partner?.username || 'user')}`,
      isOnline: partnerStatus === 'online',
    };
  };

  return (
    <aside
      className={`${
        isSidebarOpen ? 'flex' : 'hidden'
      } md:flex flex-col w-full md:w-80 h-full border-r border-white/5 bg-chat-sidebar text-gray-200 flex-shrink-0 transition-all duration-300`}
    >
      {/* Top Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-white/5 bg-chat-header/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img
            src={user.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
            alt="My Profile"
            className="h-9 w-9 rounded-full border border-white/10 bg-gray-800"
          />
          <div className="overflow-hidden">
            <p className="text-sm font-semibold truncate text-white">{user.username}</p>
            <p className="text-[10px] text-emerald-400 font-medium">Online</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsCreateGroupOpen(true)}
            title="Create Group"
            className="rounded-lg p-1.5 hover:bg-white/5 text-gray-400 hover:text-white transition"
          >
            <Plus className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            title="Settings"
            className="rounded-lg p-1.5 hover:bg-white/5 text-gray-400 hover:text-white transition"
          >
            <Settings className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={logout}
            title="Logout"
            className="rounded-lg p-1.5 hover:bg-white/5 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* User Search Input */}
      <div className="p-3 border-b border-white/5">
        <div className="relative">
          <Search className="absolute inset-y-0 left-3 my-auto h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full rounded-lg border border-white/5 bg-white/[0.03] py-1.5 pl-9 pr-4 text-xs text-white placeholder-gray-500 outline-hidden transition focus:border-chat-accent focus:bg-white/[0.05]"
          />
        </div>
      </div>

      {/* User Search Results List */}
      {searchQuery.trim() && (
        <div className="flex-1 overflow-y-auto border-b border-white/5 bg-black/10">
          <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Search Results
          </p>
          {isSearching ? (
            <div className="flex items-center justify-center p-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-chat-accent border-t-transparent"></div>
            </div>
          ) : searchResults.length === 0 ? (
            <p className="px-4 py-3 text-xs text-gray-500">No users found</p>
          ) : (
            <div className="px-2 space-y-0.5">
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  onClick={() => startPrivateChat(item.id)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer hover:bg-white/5 transition"
                >
                  <img
                    src={item.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                    alt={item.username}
                    className="h-8 w-8 rounded-full border border-white/5 bg-gray-800"
                  />
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-white truncate">{item.username}</p>
                    <p className="text-[10px] text-gray-400 truncate">{item.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent Chats List */}
      {!searchQuery.trim() && (
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Conversations
          </p>
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <MessageSquare className="h-8 w-8 text-gray-600 mb-2" />
              <p className="text-xs text-gray-500">No chats yet. Search for users to start messaging!</p>
            </div>
          ) : (
            conversations.map((chat) => {
              const details = getChatDetails(chat);
              const isActive = activeChatId === chat.id;
              
              // Check if anyone else in this conversation is typing
              const typers = typingUsers[chat.id] || [];
              const otherTypers = typers.filter((t) => (t as any).userId !== user.id);
              const isTyping = otherTypers.length > 0;

              return (
                <div
                  key={chat.id}
                  onClick={() => {
                    setActiveChatId(chat.id);
                    toggleSidebar(false); // Close sidebar on mobile
                  }}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer relative transition ${
                    isActive ? 'bg-chat-accent/20 text-white' : 'hover:bg-white/[0.03] text-gray-300'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={details.avatarUrl}
                      alt={details.name}
                      className="h-10 w-10 rounded-full border border-white/5 bg-gray-800"
                    />
                    {details.isOnline && (
                      <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-emerald-500 border-2 border-chat-sidebar"></span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-gray-100'}`}>
                        {details.name}
                      </p>
                      {chat.lastMessage && (
                        <span className="text-[10px] text-gray-500">
                          {formatTime(chat.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-0.5">
                      {isTyping ? (
                        <p className="text-xs text-emerald-400 font-medium animate-pulse">
                          {otherTypers.map((t) => t.username).join(', ')} is typing...
                        </p>
                      ) : chat.lastMessage ? (
                        <p className="text-xs text-gray-400 truncate pr-2">
                          {chat.lastMessage.senderId === user.id ? 'You: ' : ''}
                          {chat.lastMessage.fileUrl
                            ? chat.lastMessage.fileType === 'image'
                              ? '📷 Photo'
                              : '📎 File'
                            : chat.lastMessage.content}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500 italic">No messages yet</p>
                      )}

                      {chat.unreadCount > 0 && !isActive && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modals */}
      <ProfileSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <CreateGroupModal isOpen={isCreateGroupOpen} onClose={() => setIsCreateGroupOpen(false)} />
    </aside>
  );
}
