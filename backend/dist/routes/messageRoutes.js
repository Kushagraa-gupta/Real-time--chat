"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const messageController_1 = require("../controllers/messageController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.post('/', authMiddleware_1.authenticate, messageController_1.sendMessage);
router.get('/:conversationId', authMiddleware_1.authenticate, messageController_1.getMessages);
exports.default = router;
