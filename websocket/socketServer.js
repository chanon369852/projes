// WebSocket Server for Real-time Chat
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const db = require('../database/connection');
const aiService = require('../services/aiService');

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // userId -> ws connection
    this.typingUsers = new Map(); // conversationId -> Set of userIds
    
    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on('connection', async (ws, req) => {
      console.log('New WebSocket connection');

      // Authenticate connection
      const token = this.extractToken(req);
      if (!token) {
        ws.close(1008, 'Authentication required');
        return;
      }

      try {
        const decoded = jwt.verify(token, config.jwtSecret);
        const user = await db.query(
          'SELECT id, full_name FROM users WHERE id = ?',
          [decoded.userId]
        );

        if (user.length === 0) {
          ws.close(1008, 'Invalid user');
          return;
        }

        // Store connection
        ws.userId = user[0].id;
        ws.userName = user[0].full_name;
        this.clients.set(user[0].id, ws);

        // Send connection success
        ws.send(JSON.stringify({
          type: 'connected',
          message: 'WebSocket connected successfully',
          userId: user[0].id,
        }));

        this.handleMessages(ws);

      } catch (error) {
        console.error('WebSocket auth error:', error);
        ws.close(1008, 'Invalid token');
      }
    });
  }

  extractToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Also check query params
    const url = new URL(req.url, 'http://localhost');
    return url.searchParams.get('token');
  }

  handleMessages(ws) {
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data);
        
        switch (message.type) {
          case 'chat_message':
            await this.handleChatMessage(ws, message);
            break;
            
          case 'typing':
            await this.handleTyping(ws, message);
            break;
            
          case 'join_conversation':
            await this.handleJoinConversation(ws, message);
            break;
            
          case 'leave_conversation':
            await this.handleLeaveConversation(ws, message);
            break;
            
          case 'read_receipt':
            await this.handleReadReceipt(ws, message);
            break;
            
          default:
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Unknown message type',
            }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
        }));
      }
    });

    ws.on('close', () => {
      this.handleDisconnect(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  async handleChatMessage(ws, message) {
    const { conversationId, content, tempId } = message;
    
    try {
      // Save user message
      await db.query(
        `INSERT INTO chat_messages (conversation_id, role, message, action_type)
         VALUES (?, 'user', ?, 'general')`,
        [conversationId, content]
      );

      // Broadcast to other participants in conversation
      this.broadcastToConversation(conversationId, {
        type: 'new_message',
        message: {
          conversationId,
          role: 'user',
          message: content,
          senderName: ws.userName,
          senderId: ws.userId,
          tempId,
          createdAt: new Date().toISOString(),
        },
      }, ws.userId);

      // Generate AI response
      const context = await aiService.getUserContext(ws.userId);
      const aiResponse = await aiService.generateResponse(content, ws.userId, context);

      // Simulate typing delay
      this.broadcastToConversation(conversationId, {
        type: 'typing',
        conversationId,
        userId: 'ai',
        isTyping: true,
      });

      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

      // Save AI message
      const result = await db.query(
        `INSERT INTO chat_messages (conversation_id, role, message, action_type, metadata)
         VALUES (?, 'ai', ?, ?, ?)`,
        [conversationId, aiResponse.message, aiResponse.actionType, JSON.stringify(aiResponse.metadata)]
      );

      // Broadcast AI response
      this.broadcastToConversation(conversationId, {
        type: 'new_message',
        message: {
          id: result.insertId,
          conversationId,
          role: 'ai',
          message: aiResponse.message,
          actionType: aiResponse.actionType,
          metadata: aiResponse.metadata,
          createdAt: new Date().toISOString(),
        },
      });

      // Stop typing indicator
      this.broadcastToConversation(conversationId, {
        type: 'typing',
        conversationId,
        userId: 'ai',
        isTyping: false,
      });

    } catch (error) {
      console.error('Chat message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to send message',
      }));
    }
  }

  async handleTyping(ws, message) {
    const { conversationId, isTyping } = message;
    
    // Update typing status
    if (!this.typingUsers.has(conversationId)) {
      this.typingUsers.set(conversationId, new Set());
    }
    
    const typingSet = this.typingUsers.get(conversationId);
    
    if (isTyping) {
      typingSet.add(ws.userId);
    } else {
      typingSet.delete(ws.userId);
    }

    // Broadcast typing status
    this.broadcastToConversation(conversationId, {
      type: 'typing',
      conversationId,
      userId: ws.userId,
      userName: ws.userName,
      isTyping,
      typingUsers: Array.from(typingSet),
    }, ws.userId);
  }

  async handleJoinConversation(ws, message) {
    const { conversationId } = message;
    ws.conversationId = conversationId;
    
    // Load conversation history
    const messages = await db.query(
      `SELECT * FROM chat_messages 
       WHERE conversation_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [conversationId]
    );

    ws.send(JSON.stringify({
      type: 'conversation_history',
      conversationId,
      messages: messages.reverse(),
    }));

    // Notify others
    this.broadcastToConversation(conversationId, {
      type: 'user_joined',
      conversationId,
      userId: ws.userId,
      userName: ws.userName,
    }, ws.userId);
  }

  async handleLeaveConversation(ws, message) {
    const { conversationId } = message;
    
    this.broadcastToConversation(conversationId, {
      type: 'user_left',
      conversationId,
      userId: ws.userId,
      userName: ws.userName,
    }, ws.userId);

    ws.conversationId = null;
  }

  async handleReadReceipt(ws, message) {
    const { conversationId, lastReadMessageId } = message;
    
    // Update read status in database
    await db.query(
      `UPDATE chat_messages 
       SET read_by = JSON_ARRAY_APPEND(COALESCE(read_by, JSON_ARRAY()), ?, ?)
       WHERE conversation_id = ? AND id <= ?`,
      [ws.userId, conversationId, lastReadMessageId]
    );

    // Broadcast read receipt
    this.broadcastToConversation(conversationId, {
      type: 'read_receipt',
      conversationId,
      userId: ws.userId,
      lastReadMessageId,
    }, ws.userId);
  }

  handleDisconnect(ws) {
    // Remove from clients
    this.clients.delete(ws.userId);
    
    // Remove from typing users
    if (ws.conversationId && this.typingUsers.has(ws.conversationId)) {
      this.typingUsers.get(ws.conversationId).delete(ws.userId);
    }

    // Notify others in conversation
    if (ws.conversationId) {
      this.broadcastToConversation(ws.conversationId, {
        type: 'user_disconnected',
        conversationId: ws.conversationId,
        userId: ws.userId,
        userName: ws.userName,
      }, ws.userId);
    }

    console.log(`User ${ws.userId} disconnected`);
  }

  broadcastToConversation(conversationId, message, excludeUserId = null) {
    this.clients.forEach((client, userId) => {
      if (userId !== excludeUserId && 
          client.readyState === WebSocket.OPEN &&
          client.conversationId === conversationId) {
        client.send(JSON.stringify(message));
      }
    });
  }

  broadcastToAll(message, excludeUserId = null) {
    this.clients.forEach((client, userId) => {
      if (userId !== excludeUserId && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  sendToUser(userId, message) {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  getOnlineUsers() {
    return Array.from(this.clients.keys());
  }

  getOnlineCount() {
    return this.clients.size;
  }
}

module.exports = WebSocketServer;
