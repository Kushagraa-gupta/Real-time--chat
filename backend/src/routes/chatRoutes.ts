import { Router } from 'express';
import { getConversations, createOrGetConversation } from '../controllers/chatController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticate as any, getConversations as any);
router.post('/', authenticate as any, createOrGetConversation as any);

export default router;
