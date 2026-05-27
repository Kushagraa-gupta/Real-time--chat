"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMessageSchema = exports.createConversationSchema = exports.updateProfileSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    username: zod_1.z.string().min(3, 'Username must be at least 3 characters long').max(30),
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters long'),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.updateProfileSchema = zod_1.z.object({
    username: zod_1.z.string().min(3, 'Username must be at least 3 characters long').max(30).optional(),
    avatarUrl: zod_1.z.string().url('Invalid avatar URL').optional(),
});
exports.createConversationSchema = zod_1.z.object({
    isGroup: zod_1.z.boolean().default(false),
    name: zod_1.z.string().max(50).optional(),
    participantIds: zod_1.z.array(zod_1.z.string()).min(1, 'At least one participant is required'),
});
exports.createMessageSchema = zod_1.z.object({
    conversationId: zod_1.z.string().uuid('Invalid conversation ID'),
    content: zod_1.z.string().max(2000).optional().default(''),
    fileUrl: zod_1.z.string().url('Invalid file URL').optional(),
    fileType: zod_1.z.enum(['image', 'document', 'audio', 'video']).optional(),
}).refine(data => data.content.trim().length > 0 || data.fileUrl, {
    message: "Message must contain either text or a file",
    path: ["content"]
});
