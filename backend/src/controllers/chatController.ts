import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { createConversationSchema } from '../lib/validators';

export const getConversations = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: currentUserId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                avatarUrl: true,
                status: true,
                lastSeen: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const conversationsWithUnread = await Promise.all(
      conversations.map(async (chat) => {
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: chat.id,
            senderId: { not: currentUserId },
            isSeen: false,
          },
        });

        // Structure the response to make it easy for frontend
        const lastMessage = chat.messages[0] || null;

        return {
          id: chat.id,
          isGroup: chat.isGroup,
          name: chat.name,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
          participants: chat.participants.map(p => p.user),
          lastMessage,
          unreadCount,
        };
      })
    );

    res.json({ conversations: conversationsWithUnread });
  } catch (error) {
    next(error);
  }
};

export const createOrGetConversation = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validatedData = createConversationSchema.parse(req.body);
    const { isGroup, name, participantIds } = validatedData;

    // Filter out potential duplicates and ensure current user is part of participants list
    const uniqueParticipantIds = Array.from(new Set([...participantIds, currentUserId]));

    if (isGroup) {
      if (uniqueParticipantIds.length < 2) {
        return res.status(400).json({ error: 'Group chats require at least 2 participants' });
      }

      const newConversation = await prisma.conversation.create({
        data: {
          isGroup: true,
          name: name || 'Unnamed Group',
          participants: {
            create: uniqueParticipantIds.map(userId => ({
              userId,
            })),
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  avatarUrl: true,
                  status: true,
                  lastSeen: true,
                },
              },
            },
          },
        },
      });

      const conversationResponse = {
        id: newConversation.id,
        isGroup: newConversation.isGroup,
        name: newConversation.name,
        createdAt: newConversation.createdAt,
        updatedAt: newConversation.updatedAt,
        participants: newConversation.participants.map(p => p.user),
        lastMessage: null,
        unreadCount: 0,
      };

      const io = (req as any).io;
      if (io) {
        uniqueParticipantIds.forEach((userId) => {
          io.to(userId).emit('conversation-created', conversationResponse);
        });
      }

      return res.status(201).json(conversationResponse);
    } else {
      // 1-on-1 Private Chat
      const otherUserId = participantIds[0];
      if (otherUserId === currentUserId) {
        return res.status(400).json({ error: 'Cannot create a private conversation with yourself' });
      }

      // Check if conversation already exists between these 2 users
      const existingConversations = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          AND: [
            {
              participants: {
                some: { userId: currentUserId },
              },
            },
            {
              participants: {
                some: { userId: otherUserId },
              },
            },
          ],
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  avatarUrl: true,
                  status: true,
                  lastSeen: true,
                },
              },
            },
          },
          messages: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
      });

      if (existingConversations) {
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: existingConversations.id,
            senderId: { not: currentUserId },
            isSeen: false,
          },
        });

        return res.json({
          id: existingConversations.id,
          isGroup: existingConversations.isGroup,
          name: existingConversations.name,
          createdAt: existingConversations.createdAt,
          updatedAt: existingConversations.updatedAt,
          participants: existingConversations.participants.map(p => p.user),
          lastMessage: existingConversations.messages[0] || null,
          unreadCount,
        });
      }

      // Create new private chat
      const newConversation = await prisma.conversation.create({
        data: {
          isGroup: false,
          participants: {
            create: [
              { userId: currentUserId },
              { userId: otherUserId },
            ],
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  avatarUrl: true,
                  status: true,
                  lastSeen: true,
                },
              },
            },
          },
        },
      });

      const conversationResponse = {
        id: newConversation.id,
        isGroup: newConversation.isGroup,
        name: newConversation.name,
        createdAt: newConversation.createdAt,
        updatedAt: newConversation.updatedAt,
        participants: newConversation.participants.map(p => p.user),
        lastMessage: null,
        unreadCount: 0,
      };

      const io = (req as any).io;
      if (io) {
        const participantIdsToNotify = [currentUserId, otherUserId];
        participantIdsToNotify.forEach((userId) => {
          io.to(userId).emit('conversation-created', conversationResponse);
        });
      }

      return res.status(201).json(conversationResponse);
    }
  } catch (error) {
    next(error);
  }
};
