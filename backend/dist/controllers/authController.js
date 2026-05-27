"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../lib/prisma");
const validators_1 = require("../lib/validators");
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const register = async (req, res, next) => {
    try {
        const validatedData = validators_1.registerSchema.parse(req.body);
        const emailExists = await prisma_1.prisma.user.findUnique({
            where: { email: validatedData.email },
        });
        if (emailExists) {
            return res.status(400).json({ error: 'Email already in use' });
        }
        const usernameExists = await prisma_1.prisma.user.findUnique({
            where: { username: validatedData.username },
        });
        if (usernameExists) {
            return res.status(400).json({ error: 'Username already in use' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(validatedData.password, 10);
        const user = await prisma_1.prisma.user.create({
            data: {
                username: validatedData.username,
                email: validatedData.email,
                password: hashedPassword,
                avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(validatedData.username)}`, // beautiful default avatar!
            },
        });
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                avatarUrl: user.avatarUrl,
                status: user.status,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.register = register;
const login = async (req, res, next) => {
    try {
        const validatedData = validators_1.loginSchema.parse(req.body);
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: validatedData.email },
        });
        if (!user) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }
        const isMatch = await bcryptjs_1.default.compare(validatedData.password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        // Update status to online when logging in
        const updatedUser = await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { status: 'online' },
        });
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email,
                avatarUrl: updatedUser.avatarUrl,
                status: updatedUser.status,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
const getMe = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                username: true,
                email: true,
                avatarUrl: true,
                status: true,
                lastSeen: true,
            },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    }
    catch (error) {
        next(error);
    }
};
exports.getMe = getMe;
