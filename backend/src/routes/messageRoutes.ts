import { Router } from 'express';
import { sendMessage, getMessages } from '../controllers/messageController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authenticate as any, sendMessage as any);
router.get('/:conversationId', authenticate as any, getMessages as any);

export default router;
