"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketHandler = void 0;
const prisma_1 = require("../lib/prisma");
// Map to store active connections: userId -> string[] (socketIds)
const userSockets = new Map();
const socketHandler = (io) => {
    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);
        // Setup user connection
        socket.on('setup', async (userId) => {
            if (!userId)
                return;
            socket.join(userId);
            console.log(`User ${userId} set up on socket ${socket.id}`);
            // Add socket ID to user mapping
            const sockets = userSockets.get(userId) || [];
            if (!sockets.includes(socket.id)) {
                sockets.push(socket.id);
                userSockets.set(userId, sockets);
            }
            // Set user online
            try {
                await prisma_1.prisma.user.update({
                    where: { id: userId },
                    data: { status: 'online' },
                });
                // Notify all clients of status change
                io.emit('user-status-change', { userId, status: 'online' });
            }
            catch (error) {
                console.error(`Error setting user ${userId} online:`, error);
            }
        });
        // Join conversation room
        socket.on('join-chat', (conversationId) => {
            socket.join(conversationId);
            console.log(`Socket ${socket.id} joined conversation: ${conversationId}`);
        });
        // Leave conversation room
        socket.on('leave-chat', (conversationId) => {
            socket.leave(conversationId);
            console.log(`Socket ${socket.id} left conversation: ${conversationId}`);
        });
        // Typing indicators
        socket.on('typing', ({ conversationId, userId, username }) => {
            socket.to(conversationId).emit('typing', { conversationId, userId, username });
        });
        socket.on('stop-typing', ({ conversationId, userId }) => {
            socket.to(conversationId).emit('stop-typing', { conversationId, userId });
        });
        // Seen indicators
        socket.on('message-seen', ({ conversationId, userId }) => {
            socket.to(conversationId).emit('messages-marked-seen', { conversationId, userId });
        });
        // Audio/Video Call placeholders
        socket.on('call-user', (data) => {
            io.to(data.userToCall).emit('incoming-call', {
                signal: data.signalData,
                from: data.from,
                name: data.name,
            });
        });
        socket.on('answer-call', (data) => {
            io.to(data.to).emit('call-accepted', data.signal);
        });
        socket.on('end-call', (data) => {
            io.to(data.to).emit('call-ended');
        });
        // Handle user disconnect
        socket.on('disconnect', async () => {
            console.log(`Socket disconnected: ${socket.id}`);
            let disconnectedUserId = null;
            // Find user matching this socket ID
            for (const [userId, sockets] of userSockets.entries()) {
                if (sockets.includes(socket.id)) {
                    const remainingSockets = sockets.filter(id => id !== socket.id);
                    if (remainingSockets.length === 0) {
                        userSockets.delete(userId);
                        disconnectedUserId = userId;
                    }
                    else {
                        userSockets.set(userId, remainingSockets);
                    }
                    break;
                }
            }
            // If user has no active socket connections, mark offline
            if (disconnectedUserId) {
                try {
                    const lastSeen = new Date();
                    await prisma_1.prisma.user.update({
                        where: { id: disconnectedUserId },
                        data: {
                            status: 'offline',
                            lastSeen,
                        },
                    });
                    // Notify all clients of status change
                    io.emit('user-status-change', {
                        userId: disconnectedUserId,
                        status: 'offline',
                        lastSeen,
                    });
                }
                catch (error) {
                    console.error(`Error setting user ${disconnectedUserId} offline on disconnect:`, error);
                }
            }
        });
    });
};
exports.socketHandler = socketHandler;
