'use client';

import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useChatStore } from '../../store/useChatStore';
import toast from 'react-hot-toast';
import { X, Search, Check, Users } from 'lucide-react';
import { User } from '../../store/useAuthStore';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
  const { setActiveChatId, addConversation } = useChatStore();
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    
    // Fetch users for selection list
    const fetchUsers = async () => {
      try {
        setIsLoadingUsers(true);
        const response = await api.get(`/users?search=${encodeURIComponent(searchQuery)}`);
        setUsers(response.data.users);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load users');
      } finally {
        setIsLoadingUsers(false);
      }
    };

    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [isOpen, searchQuery]);

  if (!isOpen) return null;

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      return toast.error('Please enter a group name');
    }
    if (selectedUserIds.length < 1) {
      return toast.error('Please select at least one participant');
    }

    try {
      setIsSubmitting(true);
      const response = await api.post('/chats', {
        isGroup: true,
        name: groupName,
        participantIds: selectedUserIds,
      });

      addConversation(response.data);
      setActiveChatId(response.data.id);
      toast.success('Group created successfully!');
      onClose();
      // Reset state
      setGroupName('');
      setSelectedUserIds([]);
      setSearchQuery('');
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to create group';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-chat-header p-6 shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-chat-accent" />
            <h3 className="text-lg font-semibold text-white">Create Group Chat</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-white/5 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex-1 flex flex-col overflow-hidden">
          <div className="space-y-4 flex-shrink-0">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Group Name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Project Team"
                className="mt-1 block w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-hidden transition focus:border-chat-accent focus:bg-white/[0.05]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Add Participants
              </label>
              <div className="relative mt-1">
                <Search className="absolute inset-y-0 left-3 my-auto h-4.5 w-4.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users by name..."
                  className="block w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-10 pr-4 text-sm text-white outline-hidden transition focus:border-chat-accent focus:bg-white/[0.05]"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex-1 overflow-y-auto border border-white/5 bg-white/[0.01] rounded-lg p-2 min-h-[150px]">
            {isLoadingUsers ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-chat-accent border-t-transparent"></div>
              </div>
            ) : users.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center p-4">
                <p className="text-xs text-gray-500">No users found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {users.map((item) => {
                  const isSelected = selectedUserIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleUserSelection(item.id)}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition ${
                        isSelected ? 'bg-chat-accent/10 hover:bg-chat-accent/15' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={item.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                          alt={item.username}
                          className="h-8 w-8 rounded-full border border-white/5 bg-gray-800"
                        />
                        <div>
                          <p className="text-sm font-medium text-white">{item.username}</p>
                          <p className="text-xs text-gray-400">{item.email}</p>
                        </div>
                      </div>
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-md border transition ${
                          isSelected
                            ? 'border-chat-accent bg-chat-accent text-white'
                            : 'border-white/20 text-transparent'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-white/5 pt-4 mt-4 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedUserIds.length === 0}
              className="flex items-center gap-2 rounded-lg bg-chat-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-chat-accent-hover active:scale-98 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                'Create Group'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
