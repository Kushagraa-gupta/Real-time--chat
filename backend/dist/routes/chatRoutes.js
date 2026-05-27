"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatController_1 = require("../controllers/chatController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.get('/', authMiddleware_1.authenticate, chatController_1.getConversations);
router.post('/', authMiddleware_1.authenticate, chatController_1.createOrGetConversation);
exports.default = router;
