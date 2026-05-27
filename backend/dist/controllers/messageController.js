"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessages = exports.sendMessage = void 0;
const prisma_1 = require("../lib/prisma");
const validators_1 = require("../lib/validators");
const sendMessage = async (req, res, next) => {
    try {
        const currentUserId = req.user?.id;
        if (!currentUserId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const validatedData = validators_1.createMessageSchema.parse(req.body);
        const { conversationId, content, fileUrl, fileType } = validatedData;
        // Verify user is participant in conversation
        const isParticipant = await prisma_1.prisma.participant.findFirst({
            where: {
                conversationId,
                userId: currentUserId,
            },
        });
        if (!isParticipant) {
            return res.status(403).json({ error: 'Forbidden: You are not a participant in this conversation' });
        }
        // Create the message and update conversation timestamp
        const [message] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.message.create({
                data: {
                    conversationId,
                    senderId: currentUserId,
                    content,
                    fileUrl,
                    fileType,
                    isSeen: false,
                },
                include: {
                    sender: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            avatarUrl: true,
                            status: true,
                        },
                    },
                },
            }),
            prisma_1.prisma.conversation.update({
                where: { id: conversationId },
                data: { updatedAt: new Date() },
            }),
        ]);
        // Broadcast message via socket.io
        const io = req.io;
        if (io) {
            // Get all participants in the conversation
            const participants = await prisma_1.prisma.participant.findMany({
                where: { conversationId },
                select: { userId: true },
            });
            // Emit to each participant's room
            participants.forEach((participant) => {
                io.to(participant.userId).emit('message-received', message);
            });
        }
        res.status(201).json({ message });
    }
    catch (error) {
        next(error);
    }
};
exports.sendMessage = sendMessage;
const getMessages = async (req, res, next) => {
    try {
        const currentUserId = req.user?.id;
        if (!currentUserId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { conversationId } = req.params;
        const limit = parseInt(req.query.limit) || 30;
        const cursor = req.query.cursor;
        // Verify user is participant
        const isParticipant = await prisma_1.prisma.participant.findFirst({
            where: {
                conversationId,
                userId: currentUserId,
            },
        });
        if (!isParticipant) {
            return res.status(403).json({ error: 'Forbidden: You are not a participant in this conversation' });
        }
        // Update unseen messages to seen in this conversation (excluding current user's messages)
        await prisma_1.prisma.message.updateMany({
            where: {
                conversationId,
                senderId: { not: currentUserId },
                isSeen: false,
            },
            data: {
                isSeen: true,
            },
        });
        // Query messages
        const messages = await prisma_1.prisma.message.findMany({
            where: {
                conversationId,
            },
            take: limit + 1, // Get one extra to determine if there's a next page
            cursor: cursor ? { id: cursor } : undefined,
            skip: cursor ? 1 : 0, // Skip the cursor message itself
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        avatarUrl: true,
                        status: true,
                    },
                },
            },
        });
        let nextCursor = undefined;
        if (messages.length > limit) {
            const nextItem = messages.pop(); // Remove the extra item
            nextCursor = nextItem?.id;
        }
        // Return messages in chronological order for the client (since we fetched them in desc order)
        res.json({
            messages: messages.reverse(),
            nextCursor,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMessages = getMessages;
