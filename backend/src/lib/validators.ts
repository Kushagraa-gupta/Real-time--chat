import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters long').max(30),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters long').max(30).optional(),
  avatarUrl: z.string().url('Invalid avatar URL').optional(),
});

export const createConversationSchema = z.object({
  isGroup: z.boolean().default(false),
  name: z.string().max(50).optional(),
  participantIds: z.array(z.string()).min(1, 'At least one participant is required'),
});

export const createMessageSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
  content: z.string().max(2000).optional().default(''),
  fileUrl: z.string().url('Invalid file URL').optional(),
  fileType: z.enum(['image', 'document', 'audio', 'video']).optional(),
}).refine(data => data.content.trim().length > 0 || data.fileUrl, {
  message: "Message must contain either text or a file",
  path: ["content"]
});
