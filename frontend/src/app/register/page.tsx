'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { User, Mail, Lock, MessageSquare, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuthStore();
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/chat');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) {
      return toast.error('Please fill in all fields');
    }
    if (username.length < 3) {
      return toast.error('Username must be at least 3 characters');
    }
    if (password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }

    try {
      setIsSubmitting(true);
      const response = await api.post('/auth/register', { username, email, password });
      const { token, user } = response.data;
      login(token, user);
      toast.success('Account created successfully!');
      router.push('/chat');
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Registration failed. Try a different username/email.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-chat-accent border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-radial from-gray-900 to-gray-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/5 bg-white/[0.02] p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-chat-accent text-white shadow-lg shadow-chat-accent/20">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Create an Account</h2>
          <p className="mt-2 text-sm text-gray-400">Get started with real-time conversations</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Username
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <User className="h-4.5 w-4.5" />
                </div>
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="johndoe"
                  className="block w-full rounded-lg border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-hidden transition hover:border-white/20 focus:border-chat-accent focus:bg-white/[0.05] focus:ring-1 focus:ring-chat-accent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Email Address
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <Mail className="h-4.5 w-4.5" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="block w-full rounded-lg border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-hidden transition hover:border-white/20 focus:border-chat-accent focus:bg-white/[0.05] focus:ring-1 focus:ring-chat-accent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Password
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-lg border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-hidden transition hover:border-white/20 focus:border-chat-accent focus:bg-white/[0.05] focus:ring-1 focus:ring-chat-accent"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="group flex w-full items-center justify-center gap-2 rounded-lg bg-chat-accent py-2.5 text-sm font-semibold text-white shadow-lg shadow-chat-accent/20 transition hover:bg-chat-accent-hover active:scale-98 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                Create Account
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-chat-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
