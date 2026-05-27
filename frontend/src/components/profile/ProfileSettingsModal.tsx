'use client';

import { useState, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { X, Camera, Save } from 'lucide-react';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileSettingsModal({ isOpen, onClose }: ProfileSettingsModalProps) {
  const { user, updateUser } = useAuthStore();
  const [username, setUsername] = useState(user?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !user) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return toast.error('File size must be less than 5MB');
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/users/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setAvatarUrl(response.data.fileUrl);
      toast.success('Avatar uploaded successfully!');
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      return toast.error('Username cannot be empty');
    }

    try {
      setIsSubmitting(true);
      const response = await api.put('/users/profile', {
        username,
        avatarUrl,
      });

      updateUser(response.data.user);
      toast.success('Profile updated successfully!');
      onClose();
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to update profile';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-chat-header p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <h3 className="text-lg font-semibold text-white">Profile Settings</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-white/5 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="flex flex-col items-center justify-center">
            <div className="relative group">
              <img
                src={avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=default'}
                alt="Avatar Preview"
                className="h-24 w-24 rounded-full border border-white/10 object-cover shadow-lg bg-gray-800"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition duration-200 cursor-pointer disabled:opacity-50"
              >
                {isUploading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>
            <p className="mt-2 text-xs text-gray-400">Click to change profile picture</p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="block w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-hidden transition focus:border-chat-accent focus:bg-white/[0.05]"
              placeholder="Username"
              required
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="flex items-center gap-2 rounded-lg bg-chat-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-chat-accent-hover active:scale-98 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
