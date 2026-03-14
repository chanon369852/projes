import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import api from '../services/api';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    initChat();
    registerForPushNotifications();
  }, []);

  async function registerForPushNotifications() {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      const token = await Notifications.getExpoPushTokenAsync();
      console.log('Push token:', token.data);
      // Send token to server
    }
  }

  async function initChat() {
    try {
      // Create new conversation
      const response = await api.post('/chat/conversations', {
        title: 'AI Assistant',
        context_type: 'general',
      });
      setConversationId(response.data.conversation_id);
      
      // Add welcome message
      setMessages([
        {
          id: 'welcome',
          role: 'ai',
          message: 'สวัสดี! ฉันเป็น AI Assistant ที่จะช่วยคุณวางแผนการเรียนและชีวิตประจำวัน 🎓\n\nคุณสามารถถามฉันได้ เช่น:\n• ช่วยวางแผนอ่านหนังสือ Database\n• ตรวจสอบภาระงานของฉัน\n• ดูตารางเรียนวันนี้\n• สรุปการใช้จ่ายเดือนนี้',
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Init chat error:', error);
    }
  }

  async function sendMessage() {
    if (!inputText.trim() || !conversationId || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      message: inputText.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const response = await api.post(
        `/chat/conversations/${conversationId}/messages`,
        { message: userMessage.message }
      );

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        message: response.data.message,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Send local notification for important alerts
      if (response.data.action_type === 'stress_alert') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⚠️ ความเครียดสูง',
            body: 'คุณมีภาระงานมาก ควรพักผ่อน',
          },
          trigger: null,
        });
      }
    } catch (error) {
      console.error('Send message error:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        message: 'ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.aiMessage]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Ionicons name="logo-ionic" size={20} color="white" />
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
            {item.message}
          </Text>
        </View>
      </View>
    );
  };

  const quickActions = [
    { icon: 'book', text: 'วางแผนอ่านหนังสือ' },
    { icon: 'list', text: 'ตรวจสอบภาระงาน' },
    { icon: 'calendar', text: 'ดูตารางเรียน' },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.aiInfo}>
          <View style={styles.aiAvatarLarge}>
            <Ionicons name="logo-ionic" size={28} color="white" />
          </View>
          <View>
            <Text style={styles.aiName}>AI Life Planner</Text>
            <View style={styles.statusContainer}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>ออนไลน์</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {quickActions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.quickActionButton}
            onPress={() => {
              setInputText(action.text);
            }}
          >
            <Ionicons name={action.icon} size={16} color="#6366F1" />
            <Text style={styles.quickActionText}>{action.text}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="พิมพ์ข้อความถาม AI..."
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxHeight={100}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || loading}
        >
          <Ionicons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  aiInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiAvatarLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  aiName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    color: '#6B7280',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  aiMessage: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#6366F1',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: 'white',
  },
  aiText: {
    color: '#111827',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickActionText: {
    fontSize: 13,
    color: '#6366F1',
    marginLeft: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
});
